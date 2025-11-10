import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Workflow } from './workflow.entity';
import { User } from './user.entity';

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.executions)
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column('uuid', { nullable: true })
  triggeredBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'triggeredBy' })
  triggerer: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Column('jsonb', { nullable: true })
  inputData: any;

  @Column('jsonb', { nullable: true })
  outputData: any;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @Column('timestamp with time zone', { nullable: true })
  startedAt: Date;

  @Column('timestamp with time zone', { nullable: true })
  completedAt: Date;

  @Column('integer', { nullable: true })
  durationMs: number;

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;

  @UpdateDateColumn('timestamp with time zone')
  updatedAt: Date;
}