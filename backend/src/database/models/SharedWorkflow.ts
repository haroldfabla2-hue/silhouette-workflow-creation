import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './User';

export enum WorkflowAccessLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin'
}

@Entity('shared_workflows')
export class SharedWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workflowId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: WorkflowAccessLevel,
    default: WorkflowAccessLevel.READ
  })
  accessLevel: WorkflowAccessLevel;

  @ManyToOne(() => User, user => user.sharedWorkflows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}