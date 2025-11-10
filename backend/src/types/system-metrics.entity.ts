import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('system_metrics')
export class SystemMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // 'performance', 'error', 'usage', 'custom'

  @Column('jsonb')
  data: any; // Métricas en formato JSON

  @Column('timestamp with time zone')
  timestamp: Date;

  @Column('text', { nullable: true })
  source: string; // Fuente de las métricas (server, database, etc.)

  @Column('jsonb', { nullable: true })
  tags: any; // Tags para categorizar métricas

  @CreateDateColumn('timestamp with time zone')
  createdAt: Date;
}