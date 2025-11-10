import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Organization } from './organization.entity';
import { TeamAssignment } from './team-assignment.entity';

@Entity('silhouette_teams')
export class SilhouetteTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @Column({ unique: true })
  frameworkId: string; // ID del equipo en el framework Silhouette

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  category: string; // development, analytics, security, etc.

  @Column('simple-array')
  skills: string[]; // Array de habilidades como strings

  @Column({
    type: 'enum',
    enum: ['available', 'busy', 'offline', 'maintenance'],
    default: 'available',
  })
  status: string;

  @Column('integer', { default: 0 })
  currentLoad: number; // Número de tareas activas

  @Column('integer', { default: 5 })
  maxCapacity: number; // Capacidad máxima

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number; // Rating del 0 al 5

  @Column('integer', { nullable: true })
  avgResponseTime: number; // Tiempo promedio de respuesta en minutos

  @Column('integer', { nullable: true })
  avgResolutionTime: number; // Tiempo promedio de resolución en horas

  @Column('decimal', { precision: 5, scale: 2, default: 100 })
  uptime: number; // Porcentaje de tiempo disponible

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  hourlyRate: number; // Tarifa por hora

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  successRate: number; // Porcentaje de tareas completadas exitosamente

  @Column('jsonb', { nullable: true })
  metadata: any; // Metadatos adicionales del equipo

  @Column('timestamp with time zone', { nullable: true })
  lastSyncAt: Date; // Última sincronización con el framework

  @Column('timestamp with time zone', { nullable: true })
  lastAssignmentAt: Date; // Última asignación de tarea

  @OneToMany(() => TeamAssignment, (assignment) => assignment.team)
  assignments: TeamAssignment[];

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;

  @UpdateDateColumn('timestamp with time zone')
  updatedAt: Date;
}