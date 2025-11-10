import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SetupStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export enum AuthProvider {
  LOCAL = 'local',
  SAML = 'saml',
  LDAP = 'ldap',
  OIDC = 'oidc'
}

@Entity('instance_settings')
export class InstanceSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SetupStatus,
    default: SetupStatus.NOT_STARTED
  })
  setupStatus: SetupStatus;

  @Column({ nullable: true })
  firstUserId: string; // UUID of the first user (permanent owner)

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL
  })
  authProvider: AuthProvider;

  @Column({ default: false })
  userManagementEnabled: boolean;

  @Column({ nullable: true })
  smtpHost: string;

  @Column({ nullable: true })
  smtpPort: number;

  @Column({ nullable: true })
  smtpUser: string;

  @Column({ select: false, nullable: true })
  smtpPassword: string;

  @Column({ nullable: true })
  smtpSender: string;

  @Column({ default: true })
  smtpSsl: boolean;

  @Column({ nullable: true })
  smtpOauthServiceClient: string;

  @Column({ select: false, nullable: true })
  smtpOauthPrivateKey: string;

  @Column({ default: true })
  allowEmailInvites: boolean;

  @Column({ default: true })
  allowSelfRegistration: boolean;

  @Column({ nullable: true })
  licenseKey: string;

  @Column({ nullable: true })
  instanceUrl: string;

  @Column({ nullable: true })
  instanceName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}