import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User } from '../types/user.entity';
import { Organization } from '../types/organization.entity';
import { AuditLog } from '../types/audit-log.entity';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  orgId: string;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  orgName: string;
}

export interface TokenPayload {
  userId: string;
  orgId: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpiresIn = '24h';
  private readonly jwtRefreshExpiresIn = '7d';
  private readonly saltRounds = 12;

  constructor(private readonly dataSource: DataSource) {
    this.jwtSecret = process.env.JWT_SECRET_KEY || 'haas-super-secret-key-2025';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'haas-refresh-secret-key-2025';
  }

  /**
   * Registra un nuevo usuario y organización
   */
  async register(registerData: RegisterData, ipAddress: string): Promise<{
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { email, password, name, orgName } = registerData;

      // Verificar si el usuario ya existe
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email },
      });

      if (existingUser) {
        throw new Error('El usuario ya existe con este email');
      }

      // Crear nueva organización
      const organization = queryRunner.manager.create(Organization, {
        name: orgName,
        slug: this.generateSlug(orgName),
        settings: {
          plan: 'free',
          maxWorkflows: 10,
          maxUsers: 5,
          features: {
            collaboration: true,
            advancedNodes: false,
            premiumSupport: false,
          },
        },
      });

      const savedOrg = await queryRunner.manager.save(organization);

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Crear nuevo usuario
      const user = queryRunner.manager.create(User, {
        email,
        name,
        passwordHash: hashedPassword,
        orgId: savedOrg.id,
        role: 'admin',
        status: 'active',
        settings: {
          theme: 'light',
          language: 'es',
          notifications: {
            email: true,
            browser: true,
            workflow: true,
          },
        },
        lastLoginAt: null,
        lastActivityAt: new Date(),
      });

      const savedUser = await queryRunner.manager.save(user);

      // Registrar en audit log
      const auditLog = queryRunner.manager.create(AuditLog, {
        orgId: savedOrg.id,
        userId: savedUser.id,
        action: 'user_registered',
        resource: 'auth',
        resourceId: null,
        details: JSON.stringify({
          email: savedUser.email,
          role: savedUser.role,
        }),
        ipAddress,
        userAgent: 'system',
      });

      await queryRunner.manager.save(auditLog);

      await queryRunner.commitTransaction();

      // Generar tokens
      const tokens = this.generateTokens(savedUser, savedOrg.id);

      return {
        user: this.mapUserToAuthUser(savedUser, savedOrg.id),
        ...tokens,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Autentica un usuario existente
   */
  async login(credentials: LoginCredentials, ipAddress: string): Promise<{
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const { email, password } = credentials;

      // Buscar usuario
      const user = await this.dataSource.getRepository(User).findOne({
        where: { email },
        relations: ['organization'],
      });

      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar estado del usuario
      if (user.status !== 'active') {
        throw new Error('Usuario no activo');
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Credenciales inválidas');
      }

      // Actualizar último login
      user.lastLoginAt = new Date();
      user.lastActivityAt = new Date();
      await this.dataSource.getRepository(User).save(user);

      // Generar tokens
      const tokens = this.generateTokens(user, user.orgId);

      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId: user.orgId,
        userId: user.id,
        action: 'user_login',
        resource: 'auth',
        resourceId: null,
        details: JSON.stringify({
          email: user.email,
          role: user.role,
        }),
        ipAddress,
        userAgent: 'system',
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);

      return {
        user: this.mapUserToAuthUser(user, user.orgId),
        ...tokens,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresca un token de acceso
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // Verificar y decodificar refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      // Buscar usuario
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: decoded.userId },
      });

      if (!user || user.status !== 'active') {
        throw new Error('Token inválido');
      }

      // Generar nuevos tokens
      const tokens = this.generateTokens(user, user.orgId);

      return tokens;
    } catch (error) {
      throw new Error('Refresh token inválido');
    }
  }

  /**
   * Valida un token de acceso
   */
  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: decoded.userId },
      });

      if (!user || user.status !== 'active') {
        return null;
      }

      return this.mapUserToAuthUser(user, decoded.orgId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout de usuario
   */
  async logout(userId: string, orgId: string, ipAddress: string): Promise<void> {
    try {
      // Actualizar última actividad
      await this.dataSource.getRepository(User).update(userId, {
        lastActivityAt: new Date(),
      });

      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId,
        userId,
        action: 'user_logout',
        resource: 'auth',
        resourceId: null,
        details: JSON.stringify({}),
        ipAddress,
        userAgent: 'system',
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);
    } catch (error) {
      throw new Error(`Error en el logout: ${error.message}`);
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Hashear nueva contraseña
      const hashedNewPassword = await bcrypt.hash(newPassword, this.saltRounds);

      // Actualizar contraseña
      await this.dataSource.getRepository(User).update(userId, {
        passwordHash: hashedNewPassword,
        lastActivityAt: new Date(),
      });

      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId: user.orgId,
        userId,
        action: 'password_changed',
        resource: 'auth',
        resourceId: null,
        details: JSON.stringify({}),
        ipAddress,
        userAgent: 'system',
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);
    } catch (error) {
      throw new Error(`Error al cambiar contraseña: ${error.message}`);
    }
  }

  /**
   * Obtiene información del usuario actual
   */
  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    try {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: userId },
      });

      if (!user) {
        return null;
      }

      return this.mapUserToAuthUser(user, user.orgId);
    } catch (error) {
      throw new Error(`Error al obtener usuario: ${error.message}`);
    }
  }

  /**
   * Actualiza perfil de usuario
   */
  async updateProfile(
    userId: string,
    updates: { name?: string; settings?: any },
    ipAddress: string,
  ): Promise<AuthUser> {
    try {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Actualizar campos
      const updateData: any = {
        lastActivityAt: new Date(),
      };

      if (updates.name) {
        updateData.name = updates.name;
      }

      if (updates.settings) {
        updateData.settings = { ...user.settings, ...updates.settings };
      }

      await this.dataSource.getRepository(User).update(userId, updateData);

      // Obtener usuario actualizado
      const updatedUser = await this.dataSource.getRepository(User).findOne({
        where: { id: userId },
      });

      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId: user.orgId,
        userId,
        action: 'profile_updated',
        resource: 'auth',
        resourceId: null,
        details: JSON.stringify({
          updatedFields: Object.keys(updates),
        }),
        ipAddress,
        userAgent: 'system',
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);

      return this.mapUserToAuthUser(updatedUser!, user.orgId);
    } catch (error) {
      throw new Error(`Error al actualizar perfil: ${error.message}`);
    }
  }

  /**
   * Genera tokens JWT
   */
  private generateTokens(user: User, orgId: string): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      orgId,
      role: user.role,
      permissions: this.getUserPermissions(user.role),
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });

    const refreshToken = jwt.sign(
      { userId: user.id, orgId },
      this.jwtRefreshSecret,
      { expiresIn: this.jwtRefreshExpiresIn },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Mapea entidad User a AuthUser
   */
  private mapUserToAuthUser(user: User, orgId: string): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'user' | 'viewer',
      orgId,
      permissions: this.getUserPermissions(user.role),
    };
  }

  /**
   * Obtiene permisos basados en el rol
   */
  private getUserPermissions(role: string): string[] {
    const permissions = {
      admin: [
        'workflows:read',
        'workflows:write',
        'workflows:execute',
        'workflows:delete',
        'users:read',
        'users:write',
        'users:delete',
        'settings:read',
        'settings:write',
        'teams:read',
        'teams:write',
        'credentials:read',
        'credentials:write',
        'credentials:delete',
        'analytics:read',
        'billing:read',
      ],
      user: [
        'workflows:read',
        'workflows:write',
        'workflows:execute',
        'teams:read',
        'credentials:read',
        'credentials:write',
      ],
      viewer: [
        'workflows:read',
        'teams:read',
        'analytics:read',
      ],
    };

    return permissions[role] || permissions.viewer;
  }

  /**
   * Genera slug para organización
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}