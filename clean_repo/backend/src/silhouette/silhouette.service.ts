import { DataSource } from 'typeorm';
import { SilhouetteTeam } from '../types/silhouette-team.entity';
import { TeamAssignment } from '../types/team-assignment.entity';
import { AuthUser } from '../auth/auth.service';
import { Workflow } from '../types/workflow.entity';
import { WorkflowExecution } from '../types/workflow-execution.entity';

export interface TeamRequest {
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
}

export interface TeamAssignmentRequest {
  teamId: string;
  request: TeamRequest;
  autoAssign?: boolean;
  specificSkills?: string[];
  minTeamSize?: number;
  maxTeamSize?: number;
}

export interface TeamMetrics {
  teamId: string;
  teamName: string;
  performance: {
    tasksCompleted: number;
    successRate: number;
    averageCompletionTime: number;
    qualityScore: number;
  };
  utilization: {
    currentLoad: number;
    maxCapacity: number;
    availability: number;
  };
  sla: {
    responseTime: number;
    resolutionTime: number;
    uptime: number;
  };
  cost: {
    hourlyRate: number;
    totalRevenue: number;
    costPerTask: number;
  };
}

export interface SilhouetteIntegration {
  frameworkVersion: string;
  totalTeams: number;
  activeTeams: number;
  totalTasks: number;
  completedTasks: number;
  averageResponseTime: number;
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

export class SilhouetteService {
  private readonly dataSource: DataSource;
  private readonly frameworkApiUrl: string;
  private readonly apiKey: string;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.frameworkApiUrl = process.env.SILHOUETTE_FRAMEWORK_URL || 'http://localhost:4001';
    this.apiKey = process.env.SILHOUETTE_API_KEY || 'default-key';
  }

  /**
   * Obtiene todos los equipos disponibles del framework Silhouette
   */
  async getAvailableTeams(
    user: AuthUser,
    filters?: {
      category?: string;
      skills?: string[];
      availability?: 'available' | 'busy' | 'offline';
      rating?: number;
    },
  ): Promise<SilhouetteTeam[]> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('teams:read')) {
        throw new Error('Sin permisos para ver equipos');
      }

      const queryBuilder = this.dataSource.getRepository(SilhouetteTeam)
        .createQueryBuilder('team')
        .leftJoinAndSelect('team.assignments', 'assignments')
        .where('team.orgId = :orgId', { orgId: user.orgId });

      // Aplicar filtros
      if (filters?.category) {
        queryBuilder.andWhere('team.category = :category', { category: filters.category });
      }

      if (filters?.availability) {
        queryBuilder.andWhere('team.status = :status', { status: filters.availability });
      }

      if (filters?.rating) {
        queryBuilder.andWhere('team.rating >= :rating', { rating: filters.rating });
      }

      const teams = await queryBuilder.getMany();

      // Filtrar por habilidades si se especifica
      let filteredTeams = teams;
      if (filters?.skills && filters.skills.length > 0) {
        filteredTeams = teams.filter(team => 
          filters.skills!.some(skill => 
            team.skills.some(teamSkill => 
              teamSkill.toLowerCase().includes(skill.toLowerCase())
            )
          )
        );
      }

      return filteredTeams;

    } catch (error) {
      throw new Error(`Error al obtener equipos: ${error.message}`);
    }
  }

  /**
   * Asigna una tarea a un equipo específico
   */
  async assignTaskToTeam(
    user: AuthUser,
    teamId: string,
    request: TeamRequest,
  ): Promise<TeamAssignment> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('teams:write')) {
        throw new Error('Sin permisos para asignar tareas');
      }

      // Obtener equipo
      const team = await this.dataSource.getRepository(SilhouetteTeam).findOne({
        where: { id: teamId, orgId: user.orgId },
      });

      if (!team) {
        throw new Error('Equipo no encontrado');
      }

      if (team.status === 'offline') {
        throw new Error('El equipo no está disponible');
      }

      // Crear asignación
      const assignment = this.dataSource.getRepository(TeamAssignment).create({
        teamId,
        request: {
          ...request,
          assignedBy: user.id,
          assignedAt: new Date(),
          status: 'pending',
        },
        status: 'pending',
        estimatedCompletion: new Date(Date.now() + request.estimatedDuration),
        priority: request.priority,
        skills: request.skills,
        metadata: {
          autoAssigned: false,
          frameworkVersion: '1.0.0',
        },
      });

      const savedAssignment = await this.dataSource.getRepository(TeamAssignment).save(assignment);

      // Actualizar carga del equipo
      team.currentLoad = (team.currentLoad || 0) + 1;
      team.lastAssignmentAt = new Date();
      await this.dataSource.getRepository(SilhouetteTeam).save(team);

      // Notificar al framework Silhouette
      await this.notifyFrameworkTeam(teamId, request, 'assigned');

      return savedAssignment;

    } catch (error) {
      throw new Error(`Error al asignar tarea: ${error.message}`);
    }
  }

  /**
   * Asignación automática inteligente
   */
  async autoAssignTask(
    user: AuthUser,
    request: TeamRequest,
    preferences?: {
      categories?: string[];
      minRating?: number;
      maxLoad?: number;
      preferredTeams?: string[];
    },
  ): Promise<{
    assignment: TeamAssignment;
    team: SilhouetteTeam;
    confidence: number;
    alternatives: Array<{ team: SilhouetteTeam; score: number }>;
  }> {
    try {
      // Obtener equipos disponibles
      const availableTeams = await this.getAvailableTeams(user, {
        availability: 'available',
        rating: preferences?.minRating,
        skills: request.skills,
      });

      if (availableTeams.length === 0) {
        throw new Error('No hay equipos disponibles para esta tarea');
      }

      // Puntuación de equipos
      const scoredTeams = availableTeams.map(team => ({
        team,
        score: this.calculateTeamScore(team, request, preferences),
      }));

      // Ordenar por puntuación
      scoredTeams.sort((a, b) => b.score - a.score);

      const bestTeam = scoredTeams[0].team;
      const confidence = Math.min(scoredTeams[0].score / 100, 0.95);

      // Asignar al mejor equipo
      const assignment = await this.assignTaskToTeam(user, bestTeam.id, request);

      // Actualizar con información de asignación automática
      assignment.metadata.autoAssigned = true;
      assignment.metadata.confidence = confidence;
      await this.dataSource.getRepository(TeamAssignment).save(assignment);

      return {
        assignment,
        team: bestTeam,
        confidence,
        alternatives: scoredTeams.slice(1, 4).map(item => ({
          team: item.team,
          score: item.score,
        })),
      };

    } catch (error) {
      throw new Error(`Error en asignación automática: ${error.message}`);
    }
  }

  /**
   * Obtiene el estado de una asignación
   */
  async getAssignmentStatus(assignmentId: string): Promise<{
    assignment: TeamAssignment;
    team: SilhouetteTeam;
    progress: number;
    milestones: any[];
    logs: any[];
  }> {
    try {
      const assignment = await this.dataSource.getRepository(TeamAssignment).findOne({
        where: { id: assignmentId },
        relations: ['team', 'team.assignments'],
      });

      if (!assignment) {
        throw new Error('Asignación no encontrada');
      }

      // Calcular progreso
      const progress = this.calculateAssignmentProgress(assignment);

      // Obtener hitos (en un caso real, vendría del framework)
      const milestones = [
        { id: 1, name: 'Inicio', status: 'completed', timestamp: assignment.createdAt },
        { id: 2, name: 'Análisis', status: assignment.status === 'in_progress' ? 'completed' : 'pending', timestamp: new Date() },
        { id: 3, name: 'Desarrollo', status: assignment.status === 'in_progress' ? 'in_progress' : 'pending', timestamp: null },
        { id: 4, name: 'Entrega', status: 'pending', timestamp: null },
      ];

      return {
        assignment,
        team: assignment.team,
        progress,
        milestones,
        logs: [], // Logs de progreso
      };

    } catch (error) {
      throw new Error(`Error al obtener estado: ${error.message}`);
    }
  }

  /**
   * Obtiene métricas de un equipo
   */
  async getTeamMetrics(teamId: string): Promise<TeamMetrics> {
    try {
      const team = await this.dataSource.getRepository(SilhouetteTeam).findOne({
        where: { id: teamId },
        relations: ['assignments'],
      });

      if (!team) {
        throw new Error('Equipo no encontrado');
      }

      const assignments = team.assignments || [];
      const completedAssignments = assignments.filter(a => a.status === 'completed');
      const totalAssignments = assignments.length;

      // Calcular métricas
      const performance = {
        tasksCompleted: completedAssignments.length,
        successRate: totalAssignments > 0 ? (completedAssignments.length / totalAssignments) * 100 : 0,
        averageCompletionTime: this.calculateAverageCompletionTime(completedAssignments),
        qualityScore: team.rating || 0,
      };

      const utilization = {
        currentLoad: team.currentLoad || 0,
        maxCapacity: team.maxCapacity || 10,
        availability: team.status === 'available' ? 100 : 0,
      };

      const sla = {
        responseTime: team.avgResponseTime || 0,
        resolutionTime: team.avgResolutionTime || 0,
        uptime: team.uptime || 99.5,
      };

      const cost = {
        hourlyRate: team.hourlyRate || 0,
        totalRevenue: this.calculateTotalRevenue(completedAssignments),
        costPerTask: this.calculateCostPerTask(completedAssignments),
      };

      return {
        teamId: team.id,
        teamName: team.name,
        performance,
        utilization,
        sla,
        cost,
      };

    } catch (error) {
      throw new Error(`Error al obtener métricas: ${error.message}`);
    }
  }

  /**
   * Sincroniza equipos con el framework Silhouette
   */
  async syncWithFramework(): Promise<{
    synced: number;
    updated: number;
    newTeams: number;
    errors: string[];
  }> {
    try {
      // En un caso real, esto haría una llamada API al framework
      // Por ahora, simularemos la sincronización

      const frameworkTeams = await this.fetchFrameworkTeams();
      let synced = 0;
      let updated = 0;
      let newTeams = 0;
      const errors: string[] = [];

      for (const frameworkTeam of frameworkTeams) {
        try {
          // Buscar equipo existente
          const existingTeam = await this.dataSource.getRepository(SilhouetteTeam).findOne({
            where: { frameworkId: frameworkTeam.id },
          });

          if (existingTeam) {
            // Actualizar equipo existente
            Object.assign(existingTeam, {
              name: frameworkTeam.name,
              description: frameworkTeam.description,
              status: frameworkTeam.status,
              currentLoad: frameworkTeam.currentLoad,
              lastSyncAt: new Date(),
            });
            
            await this.dataSource.getRepository(SilhouetteTeam).save(existingTeam);
            updated++;
          } else {
            // Crear nuevo equipo
            const newTeam = this.dataSource.getRepository(SilhouetteTeam).create({
              frameworkId: frameworkTeam.id,
              name: frameworkTeam.name,
              description: frameworkTeam.description,
              category: frameworkTeam.category,
              skills: frameworkTeam.skills,
              status: frameworkTeam.status,
              currentLoad: frameworkTeam.currentLoad,
              maxCapacity: frameworkTeam.maxCapacity,
              rating: frameworkTeam.rating,
              lastSyncAt: new Date(),
            });

            await this.dataSource.getRepository(SilhouetteTeam).save(newTeam);
            newTeams++;
          }

          synced++;
        } catch (error) {
          errors.push(`Error sincronizando equipo ${frameworkTeam.id}: ${error.message}`);
        }
      }

      return {
        synced,
        updated,
        newTeams,
        errors,
      };

    } catch (error) {
      throw new Error(`Error en sincronización: ${error.message}`);
    }
  }

  /**
   * Obtiene estado general de la integración
   */
  async getIntegrationStatus(): Promise<SilhouetteIntegration> {
    try {
      const totalTeams = await this.dataSource.getRepository(SilhouetteTeam).count();
      const activeTeams = await this.dataSource.getRepository(SilhouetteTeam).count({
        where: { status: 'available' },
      });

      const totalAssignments = await this.dataSource.getRepository(TeamAssignment).count();
      const completedAssignments = await this.dataSource.getRepository(TeamAssignment).count({
        where: { status: 'completed' },
      });

      // Calcular tiempo promedio de respuesta
      const teams = await this.dataSource.getRepository(SilhouetteTeam).find();
      const avgResponseTime = teams.length > 0 
        ? teams.reduce((sum, team) => sum + (team.avgResponseTime || 0), 0) / teams.length
        : 0;

      // Determinar salud del sistema
      const healthScore = (completedAssignments / totalAssignments) * 100;
      let systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
      if (healthScore >= 90) systemHealth = 'excellent';
      else if (healthScore >= 75) systemHealth = 'good';
      else if (healthScore >= 50) systemHealth = 'fair';
      else systemHealth = 'poor';

      return {
        frameworkVersion: '1.0.0',
        totalTeams,
        activeTeams,
        totalTasks: totalAssignments,
        completedTasks: completedAssignments,
        averageResponseTime: avgResponseTime,
        systemHealth,
      };

    } catch (error) {
      throw new Error(`Error al obtener estado de integración: ${error.message}`);
    }
  }

  // Métodos auxiliares privados

  private calculateTeamScore(
    team: SilhouetteTeam,
    request: TeamRequest,
    preferences?: any,
  ): number {
    let score = 0;

    // Disponibilidad (30%)
    if (team.status === 'available') score += 30;
    else if (team.status === 'busy') score += 10;

    // Capacidad disponible (25%)
    const availableCapacity = (team.maxCapacity || 10) - (team.currentLoad || 0);
    if (availableCapacity > 0) {
      score += Math.min((availableCapacity / (team.maxCapacity || 10)) * 25, 25);
    }

    // Habilidades coincidentes (20%)
    const skillMatch = request.skills.filter(skill =>
      team.skills.some(teamSkill => 
        teamSkill.toLowerCase().includes(skill.toLowerCase())
      )
    ).length;
    score += (skillMatch / request.skills.length) * 20;

    // Rating/calidad (15%)
    score += (team.rating || 0) * 0.15;

    // Historial de cumplimiento (10%)
    if (team.successRate) {
      score += (team.successRate / 100) * 10;
    }

    return score;
  }

  private calculateAssignmentProgress(assignment: TeamAssignment): number {
    if (assignment.status === 'pending') return 0;
    if (assignment.status === 'completed') return 100;
    if (assignment.status === 'in_progress') {
      const now = new Date();
      const created = new Date(assignment.createdAt);
      const estimated = new Date(assignment.estimatedCompletion);
      const totalDuration = estimated.getTime() - created.getTime();
      const elapsed = now.getTime() - created.getTime();
      return Math.min((elapsed / totalDuration) * 100, 95);
    }
    return 0;
  }

  private calculateAverageCompletionTime(assignments: TeamAssignment[]): number {
    const completed = assignments.filter(a => a.completedAt);
    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((sum, assignment) => {
      const start = new Date(assignment.createdAt).getTime();
      const end = new Date(assignment.completedAt!).getTime();
      return sum + (end - start);
    }, 0);

    return totalTime / completed.length;
  }

  private calculateTotalRevenue(assignments: TeamAssignment[]): number {
    return assignments.reduce((sum, assignment) => {
      const rate = assignment.team?.hourlyRate || 0;
      const hours = assignment.estimatedCompletion 
        ? (new Date(assignment.estimatedCompletion).getTime() - new Date(assignment.createdAt).getTime()) / (1000 * 60 * 60)
        : 0;
      return sum + (rate * hours);
    }, 0);
  }

  private calculateCostPerTask(assignments: TeamAssignment[]): number {
    if (assignments.length === 0) return 0;
    return this.calculateTotalRevenue(assignments) / assignments.length;
  }

  private async notifyFrameworkTeam(teamId: string, request: TeamRequest, action: string): Promise<void> {
    try {
      // En un caso real, harías una llamada HTTP al framework
      console.log(`Notificando al framework: ${action} team ${teamId}`, request);
    } catch (error) {
      console.error('Error notificando al framework:', error);
    }
  }

  private async fetchFrameworkTeams(): Promise<any[]> {
    // Simular obtención de equipos del framework
    return [
      {
        id: 'team-1',
        name: 'Data Analysis Team',
        description: 'Especialistas en análisis de datos y ML',
        category: 'analytics',
        skills: ['python', 'tensorflow', 'pandas', 'sql'],
        status: 'available',
        currentLoad: 2,
        maxCapacity: 5,
        rating: 4.8,
      },
      {
        id: 'team-2',
        name: 'Web Development Team',
        description: 'Desarrollo web full-stack',
        category: 'development',
        skills: ['react', 'nodejs', 'typescript', 'docker'],
        status: 'available',
        currentLoad: 1,
        maxCapacity: 4,
        rating: 4.6,
      },
    ];
  }

  /**
   * Obtiene sugerencias de equipos para una tarea
   */
  async suggestTeams(
    user: AuthUser,
    requirements: {
      skills: string[];
      category?: string;
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      budget?: number;
    },
  ): Promise<Array<{
    team: SilhouetteTeam;
    match: number;
    reasoning: string;
    estimatedCost: number;
    availability: string;
  }>> {
    try {
      const teams = await this.getAvailableTeams(user, {
        skills: requirements.skills,
        category: requirements.category,
      });

      const suggestions = teams.map(team => {
        const skillMatch = requirements.skills.filter(skill =>
          team.skills.some(teamSkill => 
            teamSkill.toLowerCase().includes(skill.toLowerCase())
          )
        ).length;

        const match = (skillMatch / requirements.skills.length) * 100;
        const estimatedCost = (team.hourlyRate || 0) * 8; // 8 horas estimadas

        let reasoning = `Coincidencia de habilidades: ${skillMatch}/${requirements.skills.length}`;
        if (team.rating) reasoning += `, Rating: ${team.rating}/5`;
        if (team.currentLoad !== undefined) reasoning += `, Carga actual: ${team.currentLoad}/${team.maxCapacity}`;

        return {
          team,
          match,
          reasoning,
          estimatedCost,
          availability: team.status,
        };
      });

      return suggestions.sort((a, b) => b.match - a.match);

    } catch (error) {
      throw new Error(`Error al generar sugerencias: ${error.message}`);
    }
  }
}