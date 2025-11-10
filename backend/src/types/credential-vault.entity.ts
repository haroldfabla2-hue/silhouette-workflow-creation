import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

export enum CredentialType {
  API_KEY = 'api_key',
  USERNAME_PASSWORD = 'username_password',
  OAUTH2 = 'oauth2',
  JWT_TOKEN = 'jwt_token',
  WEBHOOK_URL = 'webhook_url',
  DATABASE_CONNECTION = 'database_connection',
  FILE_CREDENTIALS = 'file_credentials',
  CUSTOM = 'custom',
}

export enum CredentialStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DISABLED = 'disabled',
  ERROR = 'error',
}

@Entity('credential_vaults')
export class CredentialVault {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CredentialType,
  })
  type: CredentialType;

  @Column({
    type: 'enum',
    enum: CredentialStatus,
    default: CredentialStatus.ACTIVE,
  })
  status: CredentialStatus;

  @Column()
  serviceName: string; // GitHub, Slack, OpenAI, etc.

  @Column('jsonb')
  encryptedData: any; // Datos cifrados (API keys, passwords, etc.)

  @Column('jsonb', { nullable: true })
  metadata: any; // Configuración adicional, scopes, etc.

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column('uuid', { nullable: true })
  updatedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  lastUpdater: User;

  @Column('timestamp with time zone', { nullable: true })
  lastUsedAt: Date;

  @Column('timestamp with time zone', { nullable: true })
  expiresAt: Date;

  @Column('jsonb', { nullable: true })
  permissions: any; // Quién puede usar esta credencial

  @Column('jsonb', { nullable: true })
  usageStats: any; // Estadísticas de uso

  @Column('boolean', { default: false })
  isSystemCredential: boolean; // Credenciales del sistema vs usuario

  @Column('boolean', { default: true })
  allowDecryption: boolean; // Si se puede desencriptar en runtime

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;

  @UpdateDateColumn('timestamp with time zone')
  updatedAt: Date;
}