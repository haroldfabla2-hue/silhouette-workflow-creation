import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Workflow } from './workflow.entity';

@Entity('collaboration_sessions')
export class CollaborationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow)
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  socketId: string;

  @Column('jsonb', { nullable: true })
  presenceData: any; // Posición del cursor, selección actual, etc.

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('timestamp with time zone')
  lastActivityAt: Date;

  @Column('timestamp with time zone', { nullable: true })
  disconnectedAt: Date;

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;

  @UpdateDateColumn('timestamp with time zone')
  updatedAt: Date;
}