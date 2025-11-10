import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Workflow } from './workflow.entity';
import { AuditLog } from './audit-log.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column('jsonb', { nullable: true })
  settings: any;

  @Column('jsonb', { nullable: true })
  features: any;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Workflow, (workflow) => workflow.organization)
  workflows: Workflow[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.organization)
  auditLogs: AuditLog[];

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;

  @UpdateDateColumn('timestamp with time zone')
  updatedAt: Date;
}