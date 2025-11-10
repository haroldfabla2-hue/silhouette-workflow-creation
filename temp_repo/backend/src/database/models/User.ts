import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ProjectRelation } from './ProjectRelation';
import { SharedCredential } from './SharedCredential';
import { SharedWorkflow } from './SharedWorkflow';

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin', 
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  status: UserStatus;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ select: false, nullable: true })
  twoFactorSecret: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  invitedBy: string; // User ID of who invited this user

  @Column({ nullable: true })
  inviteToken: string; // Token for email invitations

  @Column({ nullable: true })
  inviteExpires: Date;

  @Column({ default: false })
  isFirstUser: boolean; // Special flag for the very first user (permanent owner)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => ProjectRelation, projectRelation => projectRelation.user)
  projectRelations: ProjectRelation[];

  @OneToMany(() => SharedCredential, sharedCredential => sharedCredential.user)
  sharedCredentials: SharedCredential[];

  @OneToMany(() => SharedWorkflow, sharedWorkflow => sharedWorkflow.user)
  sharedWorkflows: SharedWorkflow[];

  // Virtual fields
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get isOwner(): boolean {
    return this.role === UserRole.OWNER && this.isFirstUser;
  }

  get canInviteUsers(): boolean {
    return this.role === UserRole.OWNER || this.role === UserRole.ADMIN;
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}