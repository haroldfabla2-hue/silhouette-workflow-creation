import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../database/models/User';
import { InstanceSettings, SetupStatus } from '../database/models/InstanceSettings';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppDataSource } from '../database/data-source';

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  invitedToken?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface InviteUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export class AuthService {
  private userRepository: Repository<User>;
  private settingsRepository: Repository<InstanceSettings>;
  private jwtSecret: string;
  private inviteTokenExpiry: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.settingsRepository = AppDataSource.getRepository(InstanceSettings);
    this.jwtSecret = process.env.JWT_SECRET_KEY || 'silhouette-default-secret';
  }

  async getInstanceSettings(): Promise<InstanceSettings> {
    let settings = await this.settingsRepository.findOne({ where: {} });
    
    if (!settings) {
      settings = this.settingsRepository.create({
        setupStatus: SetupStatus.NOT_STARTED,
        userManagementEnabled: true,
        allowEmailInvites: true,
        allowSelfRegistration: true
      });
      settings = await this.settingsRepository.save(settings);
    }
    
    return settings;
  }

  async createFirstUser(userData: CreateUserDto): Promise<{ user: User; token: string; isFirstSetup: boolean }> {
    const settings = await this.getInstanceSettings();
    
    // Only allow first user creation if setup is not completed
    if (settings.setupStatus === SetupStatus.COMPLETED) {
      throw new Error('Instance is already set up. New users can only be invited by an existing owner.');
    }

    // Check if any users exist
    const existingUsers = await this.userRepository.count();
    if (existingUsers > 0) {
      throw new Error('First user already exists. Use normal registration or invitation process.');
    }

    // Validate password
    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user with owner role and first user flag
    const user = this.userRepository.create({
      email: userData.email.toLowerCase(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      isFirstUser: true,
      emailVerified: true // First user is auto-verified
    });

    const savedUser = await this.userRepository.save(user);

    // Update instance settings to mark setup as completed
    settings.setupStatus = SetupStatus.COMPLETED;
    settings.firstUserId = savedUser.id;
    await this.settingsRepository.save(settings);

    // Generate JWT token
    const token = this.generateToken(savedUser);

    return {
      user: savedUser,
      token,
      isFirstSetup: true
    };
  }

  async registerUser(userData: CreateUserDto): Promise<{ user: User; token: string; isFirstSetup: boolean }> {
    const settings = await this.getInstanceSettings();
    
    // If this is the very first user, create as owner
    if (settings.setupStatus === SetupStatus.NOT_STARTED) {
      return this.createFirstUser(userData);
    }

    // Check if user is registering with an invitation token
    if (userData.invitedToken) {
      return this.acceptInvitation(userData.invitedToken, userData.password);
    }

    // If self-registration is allowed, create as member
    if (!settings.allowSelfRegistration) {
      throw new Error('Self-registration is disabled. Please use an invitation link or contact the instance owner.');
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({ 
      where: { email: userData.email.toLowerCase() } 
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password
    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user as member
    const user = this.userRepository.create({
      email: userData.email.toLowerCase(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: hashedPassword,
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      isFirstUser: false,
      emailVerified: true // Auto-verify for self-registration
    });

    const savedUser = await this.userRepository.save(user);
    const token = this.generateToken(savedUser);

    return {
      user: savedUser,
      token,
      isFirstSetup: false
    };
  }

  async login(loginData: LoginDto): Promise<{ user: User; token: string }> {
    // Find user with password
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: loginData.email.toLowerCase() })
      .getOne();

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const token = this.generateToken(user);

    return { user, token };
  }

  async inviteUser(inviterId: string, inviteData: InviteUserDto): Promise<{ inviteToken: string; inviteUrl: string }> {
    const inviter = await this.userRepository.findOne({ where: { id: inviterId } });
    
    if (!inviter) {
      throw new Error('Inviter not found');
    }

    if (!inviter.canInviteUsers) {
      throw new Error('You do not have permission to invite users');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ 
      where: { email: inviteData.email.toLowerCase() } 
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + this.inviteTokenExpiry);

    // Create temporary user record
    const tempUser = this.userRepository.create({
      email: inviteData.email.toLowerCase(),
      firstName: inviteData.firstName,
      lastName: inviteData.lastName,
      role: inviteData.role,
      status: UserStatus.INVITED,
      invitedBy: inviterId,
      inviteToken,
      inviteExpires,
      isFirstUser: false
    });

    await this.userRepository.save(tempUser);

    // Generate invite URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${inviteToken}`;

    return {
      inviteToken,
      inviteUrl
    };
  }

  async acceptInvitation(inviteToken: string, password: string): Promise<{ user: User; token: string; isFirstSetup: boolean }> {
    const user = await this.userRepository.findOne({ 
      where: { inviteToken } 
    });

    if (!user) {
      throw new Error('Invalid invitation token');
    }

    if (user.status !== UserStatus.INVITED) {
      throw new Error('This invitation is no longer valid');
    }

    if (!user.inviteExpires || user.inviteExpires < new Date()) {
      throw new Error('This invitation has expired');
    }

    // Validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user with password and activate
    user.password = hashedPassword;
    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    user.inviteToken = null;
    user.inviteExpires = null;

    const savedUser = await this.userRepository.save(user);
    const token = this.generateToken(savedUser);

    return {
      user: savedUser,
      token,
      isFirstSetup: false
    };
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
      
      if (user && user.isActive) {
        return user;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async getUsersByInviter(inviterId: string): Promise<User[]> {
    const inviter = await this.userRepository.findOne({ where: { id: inviterId } });
    
    if (!inviter || !inviter.canInviteUsers) {
      throw new Error('You do not have permission to view invited users');
    }

    return this.userRepository.find({
      where: { invitedBy: inviterId },
      order: { createdAt: 'DESC' }
    });
  }

  async getAllUsers(currentUserId: string): Promise<User[]> {
    const currentUser = await this.userRepository.findOne({ where: { id: currentUserId } });
    
    if (!currentUser || !currentUser.isOwner) {
      throw new Error('Only owners can view all users');
    }

    return this.userRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        isFirstUser: user.isFirstUser
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }
}