import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Workflow } from './workflow.entity';

@Entity('workflow_nodes')
export class WorkflowNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.nodes)
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column()
  type: string;

  @Column('jsonb')
  position: any;

  @Column('jsonb')
  data: any;

  @Column('jsonb', { nullable: true })
  config: any;

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;

  @UpdateDateColumn('timestamp with time zone')
  updatedAt: Date;
}