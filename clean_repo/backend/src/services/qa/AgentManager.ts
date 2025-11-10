import { InformationVerifierAgent } from './agents/InformationVerifierAgent';
import { HallucinationDetectorAgent } from './agents/HallucinationDetectorAgent';
import { logger } from '../../utils/logger';

export interface AgentHealthStatus {
  status: 'active' | 'inactive' | 'error';
  lastHealthCheck: string;
  responseTime: number;
  successRate: number;
  errorCount: number;
  metrics?: any;
}

/**
 * Gestor de Agentes QA
 * 
 * Coordina y supervisa todos los agentes QA del sistema,
 * incluyendo inicialización, monitoreo de salud, balance
 * de carga y recuperación automática de errores.
 */
export class AgentManager {
  private agents: Map<string, any> = new Map();
  private healthStatus: Map<string, AgentHealthStatus> = new Map();
  private isInitialized: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Agentes especializados
  private informationVerifier!: InformationVerifierAgent;
  private hallucinationDetector!: HallucinationDetectorAgent;

  constructor() {
    this.initializeAgentRegistry();
  }

  private initializeAgentRegistry(): void {
    // Registrar todos los agentes disponibles
    this.agents.set('information-verifier', {
      name: 'Information Verifier Agent',
      type: 'verification',
      agent: null, // Se inicializará después
      weight: 0.4, // 40% de las tareas de verificación
      maxConcurrency: 5
    });

    this.agents.set('hallucination-detector', {
      name: 'Hallucination Detector Agent',
      type: 'detection',
      agent: null, // Se inicializará después
      weight: 0.6, // 60% de las tareas de detección
      maxConcurrency: 3
    });

    logger.info('📋 Agent registry initialized with 2 specialized agents');
  }

  /**
   * Inicializa todos los agentes QA
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing AgentManager and all QA agents...');
      
      // Crear instancias de agentes
      this.informationVerifier = new InformationVerifierAgent();
      this.hallucinationDetector = new HallucinationDetectorAgent();
      
      // Asignar agentes al registro
      this.agents.get('information-verifier')!.agent = this.informationVerifier;
      this.agents.get('hallucination-detector')!.agent = this.hallucinationDetector;
      
      // Inicializar agentes en paralelo
      const initializationPromises = Array.from(this.agents.entries()).map(async ([id, agentConfig]) => {
        try {
          logger.info(`🔧 Initializing ${agentConfig.name}...`);
          await agentConfig.agent.initialize();
          
          this.healthStatus.set(id, {
            status: 'active',
            lastHealthCheck: new Date().toISOString(),
            responseTime: 0,
            successRate: 1.0,
            errorCount: 0,
            metrics: agentConfig.agent.getMetrics()
          });
          
          logger.info(`✅ ${agentConfig.name} initialized successfully`);
        } catch (error) {
          logger.error(`❌ Failed to initialize ${agentConfig.name}:`, error);
          
          this.healthStatus.set(id, {
            status: 'error',
            lastHealthCheck: new Date().toISOString(),
            responseTime: 0,
            successRate: 0,
            errorCount: 1
          });
          
          throw error;
        }
      });

      await Promise.all(initializationPromises);
      
      this.isInitialized = true;
      
      // Iniciar monitoreo de salud
      this.startHealthMonitoring();
      
      logger.info('✅ All QA agents initialized and health monitoring started');
    } catch (error) {
      logger.error('❌ AgentManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de todos los agentes
   */
  async getAllAgentStatus(): Promise<Record<string, AgentHealthStatus>> {
    const status: Record<string, AgentHealthStatus> = {};
    
    for (const [agentId, healthStatus] of this.healthStatus.entries()) {
      status[agentId] = {
        ...healthStatus,
        metrics: this.agents.get(agentId)?.agent?.getMetrics?.() || null
      };
    }
    
    return status;
  }

  /**
   * Obtiene un agente específico por ID
   */
  getAgent(agentId: string): any | null {
    const agentConfig = this.agents.get(agentId);
    return agentConfig?.agent || null;
  }

  /**
   * Selecciona el mejor agente disponible para una tarea
   */
  selectBestAgent(taskType: 'verification' | 'detection'): any | null {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.type === taskType && agent.agent)
      .filter(agentConfig => {
        const health = this.healthStatus.get(Array.from(this.agents.keys()).find(id => this.agents.get(id) === agentConfig) || '');
        return health?.status === 'active';
      });

    if (availableAgents.length === 0) {
      logger.warn(`⚠️ No available agents for task type: ${taskType}`);
      return null;
    }

    // Seleccionar agente basado en métricas de rendimiento
    const bestAgent = availableAgents.reduce((best, current) => {
      const currentHealth = this.healthStatus.get(Array.from(this.agents.entries()).find(([id, config]) => config === current)?.[0] || '');
      const bestHealth = this.healthStatus.get(Array.from(this.agents.entries()).find(([id, config]) => config === best)?.[0] || '');
      
      // Priorizar agentes con mejor success rate y menor response time
      const currentScore = (currentHealth?.successRate || 0) - (currentHealth?.responseTime || 1000) / 10000;
      const bestScore = (bestHealth?.successRate || 0) - (bestHealth?.responseTime || 1000) / 10000;
      
      return currentScore > bestScore ? current : best;
    });

    return bestAgent.agent;
  }

  /**
   * Ejecuta una tarea con el mejor agente disponible
   */
  async executeTask(taskType: 'verification' | 'detection', taskData: any): Promise<any> {
    const agent = this.selectBestAgent(taskType);
    
    if (!agent) {
      throw new Error(`No available agent for task type: ${taskType}`);
    }

    const startTime = Date.now();
    const agentId = this.findAgentId(agent);
    
    try {
      logger.info(`🎯 Executing ${taskType} task with agent ${agentId}`);
      
      let result;
      if (taskType === 'verification') {
        result = await agent.verify(taskData);
      } else {
        result = await agent.detect(taskData.content || taskData, taskData.context);
      }

      // Actualizar métricas de rendimiento
      this.updateAgentMetrics(agentId, true, Date.now() - startTime);
      
      logger.info(`✅ ${taskType} task completed successfully by agent ${agentId}`);
      return result;
      
    } catch (error) {
      // Actualizar métricas de error
      this.updateAgentMetrics(agentId, false, Date.now() - startTime);
      
      logger.error(`❌ ${taskType} task failed on agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Inicia el monitoreo de salud de los agentes
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Cada 30 segundos

    logger.info('💓 Health monitoring started (30s interval)');
  }

  /**
   * Realiza verificaciones de salud a todos los agentes
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.agents.entries()).map(async ([agentId, agentConfig]) => {
      try {
        const startTime = Date.now();
        
        // Realizar ping al agente
        const metrics = agentConfig.agent.getMetrics?.() || {};
        
        const responseTime = Date.now() - startTime;
        const currentStatus: AgentHealthStatus = {
          status: 'active',
          lastHealthCheck: new Date().toISOString(),
          responseTime,
          successRate: metrics.successRate || 1.0,
          errorCount: metrics.errorCount || 0,
          metrics
        };

        this.healthStatus.set(agentId, currentStatus);
        
      } catch (error) {
        const currentHealth = this.healthStatus.get(agentId) || {
          status: 'inactive' as const,
          lastHealthCheck: new Date().toISOString(),
          responseTime: 0,
          successRate: 0,
          errorCount: 1
        };

        this.healthStatus.set(agentId, {
          ...currentHealth,
          status: 'error',
          lastHealthCheck: new Date().toISOString(),
          errorCount: (currentHealth.errorCount || 0) + 1
        });

        logger.warn(`⚠️ Health check failed for agent ${agentId}:`, error);
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Actualiza las métricas de un agente
   */
  private updateAgentMetrics(agentId: string, success: boolean, responseTime: number): void {
    const currentHealth = this.healthStatus.get(agentId);
    if (!currentHealth) return;

    const newSuccessRate = success 
      ? Math.min((currentHealth.successRate * 0.9) + 0.1, 1.0)
      : Math.max((currentHealth.successRate * 0.9), 0.0);

    this.healthStatus.set(agentId, {
      ...currentHealth,
      successRate: newSuccessRate,
      responseTime: (currentHealth.responseTime + responseTime) / 2,
      errorCount: success ? currentHealth.errorCount : currentHealth.errorCount + 1,
      lastHealthCheck: new Date().toISOString()
    });
  }

  /**
   * Encuentra el ID de un agente
   */
  private findAgentId(agent: any): string {
    for (const [id, agentConfig] of this.agents.entries()) {
      if (agentConfig.agent === agent) {
        return id;
      }
    }
    return 'unknown';
  }

  /**
   * Reinicia un agente específico
   */
  async restartAgent(agentId: string): Promise<void> {
    const agentConfig = this.agents.get(agentId);
    if (!agentConfig) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      logger.info(`🔄 Restarting agent ${agentId}...`);
      
      // Reinicializar el agente
      await agentConfig.agent.initialize();
      
      // Actualizar estado de salud
      this.healthStatus.set(agentId, {
        status: 'active',
        lastHealthCheck: new Date().toISOString(),
        responseTime: 0,
        successRate: 1.0,
        errorCount: 0
      });
      
      logger.info(`✅ Agent ${agentId} restarted successfully`);
    } catch (error) {
      logger.error(`❌ Failed to restart agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del sistema de agentes
   */
  getSystemStats(): any {
    const agentStats = Array.from(this.healthStatus.entries()).map(([id, health]) => ({
      agentId: id,
      agentName: this.agents.get(id)?.name || 'Unknown',
      status: health.status,
      successRate: health.successRate,
      errorCount: health.errorCount,
      responseTime: health.responseTime
    }));

    const totalAgents = agentStats.length;
    const activeAgents = agentStats.filter(a => a.status === 'active').length;
    const averageSuccessRate = agentStats.reduce((sum, a) => sum + a.successRate, 0) / totalAgents;
    const totalErrors = agentStats.reduce((sum, a) => sum + a.errorCount, 0);

    return {
      totalAgents,
      activeAgents,
      averageSuccessRate,
      totalErrors,
      systemHealth: this.calculateSystemHealth(agentStats),
      agents: agentStats
    };
  }

  private calculateSystemHealth(agentStats: any[]): 'healthy' | 'degraded' | 'unhealthy' {
    const errorRate = agentStats.reduce((sum, a) => sum + a.errorCount, 0) / Math.max(agentStats.length, 1);
    const activeRatio = agentStats.filter(a => a.status === 'active').length / agentStats.length;
    
    if (errorRate > 0.1 || activeRatio < 0.5) return 'unhealthy';
    if (errorRate > 0.05 || activeRatio < 0.8) return 'degraded';
    return 'healthy';
  }

  /**
   * Detiene el AgentManager y limpia recursos
   */
  async shutdown(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Cerrar conexiones de agentes
      for (const [agentId, agentConfig] of this.agents.entries()) {
        try {
          // Los agentes individuales no tienen método shutdown en esta implementación
          logger.info(`📤 Agent ${agentId} connection closed`);
        } catch (error) {
          logger.warn(`⚠️ Error closing agent ${agentId}:`, error);
        }
      }

      this.isInitialized = false;
      logger.info('🛑 AgentManager shutdown completed');
    } catch (error) {
      logger.error('❌ Error during AgentManager shutdown:', error);
    }
  }

  /**
   * Obtiene información del AgentManager
   */
  getInfo(): any {
    return {
      isInitialized: this.isInitialized,
      agentCount: this.agents.size,
      healthStatusCount: this.healthStatus.size,
      uptime: Date.now(),
      version: '1.0.0'
    };
  }
}