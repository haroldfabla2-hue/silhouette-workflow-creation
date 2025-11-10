import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SilhouetteTeam } from './silhouette-team.entity';
import { User } from './user.entity';

@Entity('team_assignments')
export class TeamAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @ManyToOne(() => SilhouetteTeam, (team) => team.assignments)
  @JoinColumn({ name: 'teamId' })
  team: SilhouetteTeam;

  @Column('jsonb')
  request: {
    name: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    requirements: string[];
    estimatedDuration: number;
    skills: string[];
    budget?: number;
    deadline?: Date;
    attachments?: any[];
    assignedBy: string;
    assignedAt: Date;
    status: string;
  };

  @Column({
    type: 'enum',
    enum: ['pending', 'assigned', 'in_progress', 'review', 'completed', 'cancelled', 'failed'],
    default: 'pending',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  priority: string;

  @Column('simple-array')
  skills: string[]; // Habilidades requeridas

  @Column('timestamp with time zone', { nullable: true })
  estimatedCompletion: Date;

  @Column('timestamp with time zone', { nullable: true })
  startedAt: Date;

  @Column('timestamp with time zone', { nullable: true })
  completedAt: Date;

  @Column('jsonb', { nullable: true })
  output: any; // Resultado de la tarea

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('jsonb', { nullable: true })
  metadata: any; // Metadatos adicionales

  @Column('jsonb', { nullable: true })
  milestones: any[]; // Hitos del proyecto

  @Column('jsonb', { nullable: true })
  feedback: any; // Feedback y calificaciones

  @Column('integer', { default: 0 })
  retryCount: number; // Número de reintentos

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;

  @UpdateDateColumn('timestamp with time zone')
  updatedAt: Date;
}