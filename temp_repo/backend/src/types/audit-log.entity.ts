import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @Column('uuid', { nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  action: string;

  @Column()
  resource: string;

  @Column('uuid', { nullable: true })
  resourceId: string;

  @Column('jsonb', { nullable: true })
  details: any;

  @Column('inet', { nullable: true })
  ipAddress: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;
}