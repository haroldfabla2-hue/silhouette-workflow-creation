import { DataSource } from 'typeorm';
import { AuthUser } from '../auth/auth.service';
import { Organization } from '../types/organization.entity';
import { User } from '../types/user.entity';
import { Workflow } from '../types/workflow.entity';
import { CredentialVault } from '../types/credential-vault.entity';

export interface TenantRequest {
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise' | 'custom';
  adminUser: {
    email: string;
    name: string;
    password: string;
  };
  settings: {
    maxWorkflows: number;
    maxUsers: number;
    maxExecutions: number;
    storageLimit: number; // GB
    features: {
      aiGeneration: boolean;
      advancedCollaboration: boolean;
      customIntegrations: boolean;
      prioritySupport: boolean;
      compliance: boolean;
      analytics: boolean;
    };
  };
  billing: {
    currency: string;
    billingCycle: 'monthly' | 'yearly';
    paymentMethod?: string;
  };
  customDomain?: string;
  branding?: {
    logo?: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
}

export interface TenantQuota {
  workflows: { used: number; limit: number };
  users: { used: number; limit: number };
  executions: { used: number; limit: number };
  storage: { used: number; limit: number };
  apiCalls: { used: number; limit: number };
  collaboration: {
    concurrentUsers: { used: number; limit: number };
    realTimeSessions: { used: number; limit: number };
  };
}

export interface TenantAnalytics {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    workflows: { created: number; active: number; failed: number };
    users: { active: number; new: number };
    executions: { total: number; successful: number; averageDuration: number };
    storage: { total: number; averageFileSize: number };
    api: { requests: number; errors: number; averageResponseTime: number };
  };
  performance: {
    systemLoad: number;
    databasePerformance: number;
    cacheHitRate: number;
  };
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    sessionDuration: number;
    features: {
      aiGeneration: number;
      collaboration: number;
      customNodes: number;
    };
  };
  billing: {
    plan: string;
    usageCost: number;
    overageCost: number;
    estimatedNextBill: number;
  };
}

export class MultiTenantService {
  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Crea un nuevo tenant (organización)
   */
  async createTenant(
    creator: AuthUser,
    request: TenantRequest,
  ): Promise<{
    organization: Organization;
    adminUser: User;
    setupComplete: boolean;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar permisos
      if (creator.role !== 'admin') {
        throw new Error('Solo administradores pueden crear tenants');
      }

      // Verificar que el slug no existe
      const existingOrg = await queryRunner.manager.findOne(Organization, {
        where: { slug: request.slug },
      });

      if (existingOrg) {
        throw new Error('El slug ya está en uso');
      }

      // Crear organización
      const organization = queryRunner.manager.create(Organization, {
        name: request.name,
        slug: request.slug,
        plan: request.plan,
        settings: {
          ...request.settings,
          customDomain: request.customDomain,
          branding: request.branding,
          billing: request.billing,
          createdBy: creator.id,
          trialEndsAt: this.getTrialEndDate(request.plan),
        },
        features: this.getFeaturesByPlan(request.plan),
      });

      const savedOrg = await queryRunner.manager.save(organization);

      // Crear usuario administrador
      const adminUser = queryRunner.manager.create(User, {
        email: request.adminUser.email,
        name: request.adminUser.name,
        passwordHash: await this.hashPassword(request.adminUser.password),
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
        lastActivityAt: new Date(),
      });

      const savedAdminUser = await queryRunner.manager.save(adminUser);

      // Configurar recursos iniciales
      await this.setupInitialResources(queryRunner, savedOrg.id);

      await queryRunner.commitTransaction();

      return {
        organization: savedOrg,
        adminUser: savedAdminUser,
        setupComplete: true,
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Error al crear tenant: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene información de un tenant
   */
  async getTenant(
    user: AuthUser,
    tenantId?: string,
  ): Promise<{
    organization: Organization;
    quota: TenantQuota;
    billing: any;
    features: any;
  }> {
    try {
      const orgId = tenantId || user.orgId;

      // Verificar acceso
      if (user.orgId !== orgId && user.role !== 'admin') {
        throw new Error('Sin permisos para acceder a este tenant');
      }

      const organization = await this.dataSource.getRepository(Organization).findOne({
        where: { id: orgId },
      });

      if (!organization) {
        throw new Error('Organización no encontrada');
      }

      // Obtener cuotas actuales
      const quota = await this.getTenantQuota(orgId);
      
      // Obtener información de facturación
      const billing = await this.getTenantBilling(orgId);

      return {
        organization,
        quota,
        billing,
        features: organization.features || {},
      };

    } catch (error) {
      throw new Error(`Error al obtener tenant: ${error.message}`);
    }
  }

  /**
   * Actualiza la configuración de un tenant
   */
  async updateTenant(
    user: AuthUser,
    updates: {
      name?: string;
      settings?: any;
      features?: any;
      customDomain?: string;
      branding?: any;
    },
  ): Promise<Organization> {
    try {
      // Verificar permisos
      if (user.role !== 'admin') {
        throw new Error('Solo administradores pueden actualizar tenants');
      }

      const organization = await this.dataSource.getRepository(Organization).findOne({
        where: { id: user.orgId },
      });

      if (!organization) {
        throw new Error('Organización no encontrada');
      }

      // Actualizar campos
      const updateFields: any = {
        updatedAt: new Date(),
      };

      if (updates.name) updateFields.name = updates.name;
      if (updates.customDomain) {
        updateFields.settings = {
          ...organization.settings,
          customDomain: updates.customDomain,
        };
      }
      if (updates.branding) {
        updateFields.settings = {
          ...organization.settings,
          branding: updates.branding,
        };
      }
      if (updates.settings) {
        updateFields.settings = {
          ...organization.settings,
          ...updates.settings,
        };
      }
      if (updates.features) {
        updateFields.features = {
          ...organization.features,
          ...updates.features,
        };
      }

      await this.dataSource.getRepository(Organization).update(user.orgId, updateFields);

      return await this.dataSource.getRepository(Organization).findOne({
        where: { id: user.orgId },
      });

    } catch (error) {
      throw new Error(`Error al actualizar tenant: ${error.message}`);
    }
  }

  /**
   * Suspende un tenant
   */
  async suspendTenant(
    admin: AuthUser,
    tenantId: string,
    reason: string,
  ): Promise<void> {
    try {
      // Solo super admin puede suspender tenants
      if (admin.role !== 'admin' || !admin.permissions.includes('billing:write')) {
        throw new Error('Sin permisos para suspender tenants');
      }

      const organization = await this.dataSource.getRepository(Organization).findOne({
        where: { id: tenantId },
      });

      if (!organization) {
        throw new Error('Organización no encontrada');
      }

      // Marcar como suspendida
      await this.dataSource.getRepository(Organization).update(tenantId, {
        status: 'suspended',
        suspendedAt: new Date(),
        suspensionReason: reason,
        suspendedBy: admin.id,
      });

      // Suspender usuarios
      await this.dataSource.getRepository(User).update(
        { orgId: tenantId },
        { status: 'suspended' },
      );

    } catch (error) {
      throw new Error(`Error al suspender tenant: ${error.message}`);
    }
  }

  /**
   * Reactiva un tenant
   */
  async reactivateTenant(
    admin: AuthUser,
    tenantId: string,
  ): Promise<void> {
    try {
      if (admin.role !== 'admin' || !admin.permissions.includes('billing:write')) {
        throw new Error('Sin permisos para reactivar tenants');
      }

      const organization = await this.dataSource.getRepository(Organization).findOne({
        where: { id: tenantId },
      });

      if (!organization) {
        throw new Error('Organización no encontrada');
      }

      // Reactivar
      await this.dataSource.getRepository(Organization).update(tenantId, {
        status: 'active',
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
        reactivatedAt: new Date(),
        reactivatedBy: admin.id,
      });

      // Reactivar usuarios
      await this.dataSource.getRepository(User).update(
        { orgId: tenantId, status: 'suspended' },
        { status: 'active' },
      );

    } catch (error) {
      throw new Error(`Error al reactivar tenant: ${error.message}`);
    }
  }

  /**
   * Obtiene todas las organizaciones (para super admin)
   */
  async getAllTenants(
    admin: AuthUser,
    filters?: {
      status?: string;
      plan?: string;
      search?: string;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    tenants: Organization[];
    total: number;
    stats: {
      total: number;
      active: number;
      suspended: number;
      trial: number;
    };
  }> {
    try {
      if (admin.role !== 'admin') {
        throw new Error('Solo administradores pueden ver todos los tenants');
      }

      const queryBuilder = this.dataSource.getRepository(Organization)
        .createQueryBuilder('org')
        .leftJoinAndSelect('org.users', 'users');

      // Aplicar filtros
      if (filters?.status) {
        queryBuilder.andWhere('org.status = :status', { status: filters.status });
      }

      if (filters?.plan) {
        queryBuilder.andWhere('org.plan = :plan', { plan: filters.plan });
      }

      if (filters?.search) {
        queryBuilder.andWhere(
          '(org.name ILIKE :search OR org.slug ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      // Paginación
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      queryBuilder.orderBy('org.createdAt', 'DESC');

      const [tenants, total] = await queryBuilder.getManyAndCount();

      // Calcular estadísticas
      const [totalOrgs, activeOrgs, suspendedOrgs] = await Promise.all([
        this.dataSource.getRepository(Organization).count(),
        this.dataSource.getRepository(Organization).count({ where: { status: 'active' } }),
        this.dataSource.getRepository(Organization).count({ where: { status: 'suspended' } }),
      ]);

      return {
        tenants,
        total,
        stats: {
          total: totalOrgs,
          active: activeOrgs,
          suspended: suspendedOrgs,
          trial: totalOrgs - activeOrgs - suspendedOrgs,
        },
      };

    } catch (error) {
      throw new Error(`Error al obtener tenants: ${error.message}`);
    }
  }

  /**
   * Obtiene análisis de un tenant
   */
  async getTenantAnalytics(
    user: AuthUser,
    tenantId?: string,
    period: '7d' | '30d' | '90d' = '30d',
  ): Promise<TenantAnalytics> {
    try {
      const orgId = tenantId || user.orgId;

      // Verificar acceso
      if (user.orgId !== orgId && user.role !== 'admin') {
        throw new Error('Sin permisos para ver análisis');
      }

      const startDate = this.getStartDate(period);
      const endDate = new Date();

      // Recopilar métricas
      const [workflows, users, executions, storage] = await Promise.all([
        this.getWorkflowMetrics(orgId, startDate, endDate),
        this.getUserMetrics(orgId, startDate, endDate),
        this.getExecutionMetrics(orgId, startDate, endDate),
        this.getStorageMetrics(orgId, startDate, endDate),
      ]);

      return {
        tenantId: orgId,
        period: { start: startDate, end: endDate },
        usage: {
          workflows,
          users,
          executions,
          storage,
          api: await this.getAPIMetrics(orgId, startDate, endDate),
        },
        performance: await this.getPerformanceMetrics(orgId, startDate, endDate),
        engagement: await this.getEngagementMetrics(orgId, startDate, endDate),
        billing: await this.getBillingMetrics(orgId),
      };

    } catch (error) {
      throw new Error(`Error al obtener análisis: ${error.message}`);
    }
  }

  /**
   * Verifica cuotas del tenant
   */
  async checkTenantQuotas(orgId: string): Promise<{
    withinLimits: boolean;
    violations: Array<{
      resource: string;
      current: number;
      limit: number;
      percentage: number;
    }>;
    warnings: Array<{
      resource: string;
      current: number;
      limit: number;
      percentage: number;
    }>;
  }> {
    try {
      const quota = await this.getTenantQuota(orgId);
      const violations: any[] = [];
      const warnings: any[] = [];

      // Verificar cada recurso
      const resources = [
        { name: 'workflows', data: quota.workflows },
        { name: 'users', data: quota.users },
        { name: 'executions', data: quota.executions },
        { name: 'storage', data: quota.storage },
      ];

      resources.forEach(resource => {
        const percentage = (resource.data.used / resource.data.limit) * 100;

        if (percentage >= 100) {
          violations.push({
            resource: resource.name,
            current: resource.data.used,
            limit: resource.data.limit,
            percentage,
          });
        } else if (percentage >= 80) {
          warnings.push({
            resource: resource.name,
            current: resource.data.used,
            limit: resource.data.limit,
            percentage,
          });
        }
      });

      return {
        withinLimits: violations.length === 0,
        violations,
        warnings,
      };

    } catch (error) {
      throw new Error(`Error al verificar cuotas: ${error.message}`);
    }
  }

  // Métodos auxiliares privados

  private async setupInitialResources(queryRunner: any, orgId: string): Promise<void> {
    // Crear recursos iniciales para el tenant
    // Workflows de ejemplo, configuraciones, etc.
  }

  private getTrialEndDate(plan: string): Date {
    const days = plan === 'enterprise' ? 30 : 14;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private getFeaturesByPlan(plan: string): any {
    const features = {
      starter: {
        aiGeneration: true,
        advancedCollaboration: false,
        customIntegrations: false,
        prioritySupport: false,
        compliance: false,
        analytics: false,
      },
      professional: {
        aiGeneration: true,
        advancedCollaboration: true,
        customIntegrations: true,
        prioritySupport: false,
        compliance: false,
        analytics: true,
      },
      enterprise: {
        aiGeneration: true,
        advancedCollaboration: true,
        customIntegrations: true,
        prioritySupport: true,
        compliance: true,
        analytics: true,
      },
      custom: {
        aiGeneration: true,
        advancedCollaboration: true,
        customIntegrations: true,
        prioritySupport: true,
        compliance: true,
        analytics: true,
      },
    };

    return features[plan] || features.starter;
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  private async getTenantQuota(orgId: string): Promise<TenantQuota> {
    const [workflows, users, executions, storage] = await Promise.all([
      this.dataSource.getRepository(Workflow).count({ where: { orgId } }),
      this.dataSource.getRepository(User).count({ where: { orgId, status: 'active' } }),
      // executions count
      0,
      // storage usage
      0,
    ]);

    const organization = await this.dataSource.getRepository(Organization).findOne({
      where: { id: orgId },
    });

    const maxWorkflows = organization?.settings?.maxWorkflows || 10;
    const maxUsers = organization?.settings?.maxUsers || 5;
    const maxExecutions = organization?.settings?.maxExecutions || 1000;
    const storageLimit = organization?.settings?.storageLimit || 10; // GB

    return {
      workflows: { used: workflows, limit: maxWorkflows },
      users: { used: users, limit: maxUsers },
      executions: { used: executions, limit: maxExecutions },
      storage: { used: storage, limit: storageLimit },
      apiCalls: { used: 0, limit: 10000 },
      collaboration: {
        concurrentUsers: { used: 1, limit: Math.max(1, maxUsers / 2) },
        realTimeSessions: { used: 0, limit: 10 },
      },
    };
  }

  private async getTenantBilling(orgId: string): Promise<any> {
    const organization = await this.dataSource.getRepository(Organization).findOne({
      where: { id: orgId },
    });

    return {
      plan: organization?.plan || 'starter',
      billing: organization?.settings?.billing || {},
      trialEndsAt: organization?.settings?.trialEndsAt,
    };
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private async getWorkflowMetrics(orgId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      created: 0,
      active: 0,
      failed: 0,
    };
  }

  private async getUserMetrics(orgId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      active: 0,
      new: 0,
    };
  }

  private async getExecutionMetrics(orgId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      total: 0,
      successful: 0,
      averageDuration: 0,
    };
  }

  private async getStorageMetrics(orgId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      total: 0,
      averageFileSize: 0,
    };
  }

  private async getAPIMetrics(orgId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      requests: 0,
      errors: 0,
      averageResponseTime: 0,
    };
  }

  private async getPerformanceMetrics(orgId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      systemLoad: 0,
      databasePerformance: 0,
      cacheHitRate: 0,
    };
  }

  private async getEngagementMetrics(orgId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      sessionDuration: 0,
      features: {
        aiGeneration: 0,
        collaboration: 0,
        customNodes: 0,
      },
    };
  }

  private async getBillingMetrics(orgId: string): Promise<any> {
    return {
      plan: 'starter',
      usageCost: 0,
      overageCost: 0,
      estimatedNextBill: 0,
    };
  }
}