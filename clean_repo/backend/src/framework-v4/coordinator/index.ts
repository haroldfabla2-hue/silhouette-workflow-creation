/**
 * Framework Silhouette Enterprise V4.0 - Coordinator Engine
 * 
 * Motor central de coordinación que gestiona tareas, equipos, y optimización
 * inteligente manteniendo compatibilidad con el sistema actual.
 * 
 * Autor: Silhouette Anonimo
 * Versión: 4.0.0
 * Fecha: 2025-11-09
 */

import { TaskV4, TeamV4, EventTypeV4, FrameworkEventV4 } from '../types';
import { getFrameworkConfig, specializedTeamsConfig, legacyServiceConfig } from '../config';
import { CompatibilityUtils } from '../adapters/compatibility';

interface CoordinatorMetrics {
  activeTasks: number;
  queueLength: number;
  teamsUtilization: number;
  averageResponseTime: number;
  throughput: number;
  successRate: number;
}

export class CoordinatorEngineV4 {
  private config = getFrameworkConfig();
  private tasks: Map<string, TaskV4> = new Map();
  private teams: Map<string, TeamV4> = new Map();
  private eventQueue: FrameworkEventV4[] = [];
  private metrics: CoordinatorMetrics = {
    activeTasks: 0,
    queueLength: 0,
    teamsUtilization: 0,
    averageResponseTime: 0,
    throughput: 0,
    successRate: 0,
  };
  private healthCheckInterval?: NodeJS.Timeout;
  private optimizationInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeTeams();
    this.startHealthChecks();
    this.startOptimization();
  }

  /**
   * Inicializa los equipos especializados
   */
  private async initializeTeams(): Promise<void> {
    console.log('🤖 Initializing specialized teams for V4.0...');

    // Inicializar equipos core
    for (const teamConfig of [...specializedTeamsConfig.core, ...specializedTeamsConfig.support, ...specializedTeamsConfig.specialized]) {
      const team: TeamV4 = {
        id: teamConfig.id,
        name: teamConfig.name,
        type: teamConfig.type as any,
        capabilities: teamConfig.capabilities,
        status: 'healthy',
        currentLoad: 0,
        maxCapacity: teamConfig.maxCapacity,
        metrics: {
          tasksCompleted: 0,
          averageResponseTime: 0,
          successRate: 0,
          utilization: 0,
        },
        lastHealthCheck: new Date(),
      };

      this.teams.set(team.id, team);
      console.log(`✅ Initialized team: ${team.name} (${team.capabilities.length} capabilities)`);
    }

    console.log(`🎯 Total teams initialized: ${this.teams.size}`);
  }

  /**
   * Crea y coordina una nueva tarea
   */
  async createTask(taskData: any): Promise<TaskV4> {
    try {
      // Adaptar task legacy a V4.0 si es necesario
      const legacyTask = CompatibilityUtils.adaptRequest(taskData, 'task');
      
      const task: TaskV4 = {
        id: this.generateTaskId(),
        type: legacyTask.type || 'generic',
        priority: legacyTask.priority || 5,
        data: legacyTask,
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          source: 'coordinator',
          correlationId: legacyTask.correlationId,
          retryCount: 0,
        },
      };

      this.tasks.set(task.id, task);
      this.metrics.queueLength++;

      // Intentar asignar inmediatamente si hay equipos disponibles
      await this.assignTask(task.id);

      console.log(`📋 Task created: ${task.id} (${task.type}, priority: ${task.priority})`);
      return task;
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      throw new Error(`Task creation failed: ${error.message}`);
    }
  }

  /**
   * Asigna tareas a equipos de forma inteligente
   */
  private async assignTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    try {
      // Encontrar el mejor equipo para esta tarea
      const bestTeam = this.findBestTeam(task);
      
      if (!bestTeam) {
        console.log(`⏳ No suitable team found for task ${taskId}, queuing...`);
        return false;
      }

      // Asignar la tarea al equipo
      task.assignedTeam = bestTeam.id;
      task.status = 'in-progress';
      task.startedAt = new Date();
      this.metrics.activeTasks++;
      this.metrics.queueLength--;
      this.teams.get(bestTeam.id)!.currentLoad++;

      // Ejecutar la tarea
      await this.executeTask(task);

      return true;
    } catch (error) {
      console.error(`❌ Failed to assign task ${taskId}:`, error);
      task.status = 'failed';
      return false;
    }
  }

  /**
   * Encuentra el mejor equipo para una tarea específica
   */
  private findBestTeam(task: TaskV4): TeamV4 | null {
    let bestTeam: TeamV4 | null = null;
    let bestScore = 0;

    for (const team of this.teams.values()) {
      // Verificar si el equipo está disponible
      if (team.status !== 'healthy' || team.currentLoad >= team.maxCapacity) {
        continue;
      }

      // Calcular score de compatibilidad
      const score = this.calculateTeamScore(team, task);
      
      if (score > bestScore) {
        bestScore = score;
        bestTeam = team;
      }
    }

    return bestTeam;
  }

  /**
   * Calcula el score de compatibilidad entre equipo y tarea
   */
  private calculateTeamScore(team: TeamV4, task: TaskV4): number {
    let score = 0;

    // Capability matching (40% del score)
    const matchingCapabilities = team.capabilities.filter(cap => 
      task.data.requiredCapabilities?.includes(cap) || 
      task.type.toLowerCase().includes(cap.toLowerCase())
    );
    score += (matchingCapabilities.length / team.capabilities.length) * 40;

    // Current load (30% del score)
    const loadRatio = 1 - (team.currentLoad / team.maxCapacity);
    score += loadRatio * 30;

    // Performance history (20% del score)
    score += team.metrics.successRate * 20;

    // Priority bonus (10% del score)
    const priorityBonus = Math.min(task.priority / 10, 1) * 10;
    score += priorityBonus;

    return score;
  }

  /**
   * Ejecuta una tarea asignada
   */
  private async executeTask(task: TaskV4): Promise<void> {
    const team = this.teams.get(task.assignedTeam!);
    if (!team) {
      throw new Error(`Team ${task.assignedTeam} not found for task ${task.id}`);
    }

    console.log(`🚀 Executing task ${task.id} on team ${team.name}`);

    try {
      const startTime = Date.now();
      
      // Simular ejecución de tarea (en implementación real, esto sería un servicio)
      await this.simulateTaskExecution(task);
      
      const executionTime = Date.now() - startTime;
      
      // Marcar como completada
      task.status = 'completed';
      task.completedAt = new Date();
      task.actualDuration = executionTime;
      
      // Actualizar métricas del equipo
      team.metrics.tasksCompleted++;
      team.metrics.averageResponseTime = (team.metrics.averageResponseTime + executionTime) / 2;
      team.metrics.successRate = (team.metrics.successRate * 0.9) + 0.1; // Moving average
      team.currentLoad--;
      
      this.metrics.activeTasks--;
      this.metrics.throughput++;
      this.metrics.successRate = (this.metrics.successRate * 0.95) + 0.05;
      
      // Emular evento de finalización
      this.emitEvent('TASK_COMPLETED', {
        taskId: task.id,
        teamId: team.id,
        executionTime,
        success: true,
      });

      console.log(`✅ Task ${task.id} completed in ${executionTime}ms`);
    } catch (error) {
      // Marcar como fallida
      task.status = 'failed';
      task.completedAt = new Date();
      task.metadata.retryCount++;
      
      const team = this.teams.get(task.assignedTeam!);
      if (team) {
        team.currentLoad--;
        team.metrics.successRate *= 0.9; // Penalizar fallas
      }
      
      this.metrics.activeTasks--;
      
      this.emitEvent('TASK_FAILED', {
        taskId: task.id,
        teamId: team?.id,
        error: error.message,
      });

      console.error(`❌ Task ${task.id} failed:`, error.message);
      
      // Reintentar si es necesario
      if (task.metadata.retryCount < 3) {
        task.status = 'pending';
        task.startedAt = undefined;
        this.metrics.queueLength++;
        setTimeout(() => this.assignTask(task.id), 1000 * task.metadata.retryCount);
      }
    }
  }

  /**
   * Simula la ejecución de una tarea (placeholder para implementación real)
   */
  private async simulateTaskExecution(task: TaskV4): Promise<void> {
    // Simular tiempo de ejecución basado en tipo de tarea
    const executionTime = this.getEstimatedExecutionTime(task);
    await new Promise(resolve => setTimeout(resolve, Math.min(executionTime, 5000))); // Max 5s para demo
  }

  /**
   * Obtiene el tiempo estimado de ejecución para una tarea
   */
  private getEstimatedExecutionTime(task: TaskV4): number {
    const baseTimes: { [key: string]: number } = {
      'video_production': 30000,
      'qa_verification': 5000,
      'data_analysis': 15000,
      'content_writing': 8000,
      'design_work': 12000,
      'generic': 5000,
    };

    return baseTimes[task.type] || baseTimes['generic'];
  }

  /**
   * Ejecuta verificación de salud de equipos
   */
  private async performHealthCheck(): Promise<void> {
    console.log('🔍 Performing team health check...');

    for (const [teamId, team] of this.teams.entries()) {
      try {
        // Simular verificación de salud
        const isHealthy = await this.checkTeamHealth(team);
        
        const previousStatus = team.status;
        team.status = isHealthy ? 'healthy' : 'critical';
        team.lastHealthCheck = new Date();

        if (previousStatus !== team.status) {
          this.emitEvent('TEAM_STATUS_CHANGED', {
            teamId,
            previousStatus,
            newStatus: team.status,
          });
        }

      } catch (error) {
        console.error(`❌ Health check failed for team ${teamId}:`, error);
        this.teams.get(teamId)!.status = 'critical';
      }
    }
  }

  /**
   * Verifica la salud de un equipo (placeholder)
   */
  private async checkTeamHealth(team: TeamV4): Promise<boolean> {
    // Simular verificación de salud
    // En implementación real, esto verificaría conexiones, estado, etc.
    return team.metrics.successRate > 0.5; // Team is healthy if success rate > 50%
  }

  /**
   * Aplica optimización automática
   */
  private async applyOptimization(): Promise<void> {
    if (!this.config.optimization.enabled) return;

    console.log('⚡ Applying automatic optimization...');

    // Optimizar balanceo de carga
    this.optimizeLoadBalancing();
    
    // Optimizar asignaciones
    this.optimizeTaskAssignments();
    
    // Ajustar capacidades
    this.adjustTeamCapacities();

    this.emitEvent('OPTIMIZATION_APPLIED', {
      timestamp: new Date(),
      optimizations: ['load_balancing', 'task_assignment', 'capacity_adjustment'],
    });
  }

  /**
   * Optimiza el balanceo de carga entre equipos
   */
  private optimizeLoadBalancing(): void {
    const totalLoad = Array.from(this.teams.values()).reduce((sum, team) => sum + team.currentLoad, 0);
    const averageLoad = totalLoad / this.teams.size;

    for (const team of this.teams.values()) {
      if (Math.abs(team.currentLoad - averageLoad) > 2) {
        // Reasignar tareas si es necesario
        console.log(`⚖️ Optimizing load for team ${team.name}: current=${team.currentLoad}, target=${Math.round(averageLoad)}`);
      }
    }
  }

  /**
   * Optimiza las asignaciones de tareas
   */
  private optimizeTaskAssignments(): void {
    // Buscar tareas pendientes que puedan ser reasignadas a equipos más eficientes
    for (const task of this.tasks.values()) {
      if (task.status === 'pending' && task.assignedTeam) {
        const currentTeam = this.teams.get(task.assignedTeam);
        if (currentTeam && currentTeam.metrics.successRate < 0.7) {
          // Intentar reasignar a un equipo más eficiente
          const betterTeam = this.findBetterTeam(task, currentTeam);
          if (betterTeam) {
            console.log(`🔄 Reassigning task ${task.id} from ${currentTeam.name} to ${betterTeam.name}`);
            currentTeam.currentLoad--;
            task.assignedTeam = betterTeam.id;
            betterTeam.currentLoad++;
          }
        }
      }
    }
  }

  /**
   * Encuentra un equipo mejor para una tarea
   */
  private findBetterTeam(task: TaskV4, excludeTeam: TeamV4): TeamV4 | null {
    let bestTeam: TeamV4 | null = null;
    let bestScore = 0;

    for (const team of this.teams.values()) {
      if (team.id === excludeTeam.id || team.status !== 'healthy' || team.currentLoad >= team.maxCapacity) {
        continue;
      }

      const score = this.calculateTeamScore(team, task);
      if (score > bestScore) {
        bestScore = score;
        bestTeam = team;
      }
    }

    return bestTeam;
  }

  /**
   * Ajusta las capacidades de equipos
   */
  private adjustTeamCapacities(): void {
    for (const team of this.teams.values()) {
      const utilization = team.currentLoad / team.maxCapacity;
      
      if (utilization > 0.9) {
        // Equipo sobrecargado, aumentar capacidad temporal
        console.log(`📈 Increasing capacity for team ${team.name} due to high utilization`);
        team.maxCapacity = Math.min(team.maxCapacity + 1, team.maxCapacity + 3);
      } else if (utilization < 0.3) {
        // Equipo subutilizado, reducir capacidad
        console.log(`📉 Decreasing capacity for team ${team.name} due to low utilization`);
        team.maxCapacity = Math.max(team.maxCapacity - 1, 1);
      }
    }
  }

  /**
   * Emite un evento del framework
   */
  private emitEvent(type: EventTypeV4, data: any): void {
    const event: FrameworkEventV4 = {
      id: this.generateEventId(),
      type,
      source: 'coordinator',
      data,
      timestamp: new Date(),
      correlationId: data.correlationId,
    };

    this.eventQueue.push(event);
  }

  /**
   * Inicia las verificaciones de salud automáticas
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Cada 30 segundos
  }

  /**
   * Inicia la optimización automática
   */
  private startOptimization(): void {
    this.optimizationInterval = setInterval(async () => {
      await this.applyOptimization();
    }, 60000); // Cada minuto
  }

  /**
   * Obtiene métricas del coordinador
   */
  getMetrics(): CoordinatorMetrics {
    const totalCapacity = Array.from(this.teams.values()).reduce((sum, team) => sum + team.maxCapacity, 0);
    const totalCurrentLoad = Array.from(this.teams.values()).reduce((sum, team) => sum + team.currentLoad, 0);
    
    this.metrics.teamsUtilization = totalCapacity > 0 ? totalCurrentLoad / totalCapacity : 0;
    
    return { ...this.metrics };
  }

  /**
   * Obtiene estado de equipos
   */
  getTeamsStatus(): TeamV4[] {
    return Array.from(this.teams.values());
  }

  /**
   * Obtiene estado de tareas
   */
  getTasksStatus(): TaskV4[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Limpia recursos
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
    
    this.tasks.clear();
    this.teams.clear();
    this.eventQueue = [];
  }

  /**
   * Genera ID único para tareas
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera ID único para eventos
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export del Coordinator Engine V4.0
export { CoordinatorEngineV4 };

// Singleton global para uso en toda la aplicación
let globalCoordinator: CoordinatorEngineV4 | null = null;

export function getCoordinator(): CoordinatorEngineV4 {
  if (!globalCoordinator) {
    globalCoordinator = new CoordinatorEngineV4();
  }
  return globalCoordinator;
}
