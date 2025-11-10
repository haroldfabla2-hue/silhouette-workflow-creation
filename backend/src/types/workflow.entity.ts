import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { WorkflowExecution } from './workflow-execution.entity';
import { WorkflowNode } from './workflow-node.entity';

@Entity('workflows')
export class Workflow {
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

  @Column('jsonb')
  canvasData: any;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft',
  })
  status: string;

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

  @OneToMany(() => WorkflowExecution, (execution) => execution.workflow)
  executions: WorkflowExecution[];

  @OneToMany(() => WorkflowNode, (node) => node.workflow)
  nodes: WorkflowNode[];

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;

  @UpdateDateColumn('timestamp with time zone')
  updatedAt: Date;
}