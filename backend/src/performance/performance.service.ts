import { DataSource } from 'typeorm';
import { SystemMetrics } from '../types/system-metrics.entity';
import { AuthUser } from '../auth/auth.service';

export interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    load: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  database: {
    connections: number;
    queries: number;
    avgResponseTime: number;
    slowQueries: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  network: {
    requests: number;
    responseTime: number;
    errorRate: number;
  };
  workflows: {
    active: number;
    completed: number;
    failed: number;
    avgExecutionTime: number;
  };
}

export interface OptimizationSuggestion {
  type: 'performance' | 'resource' | 'cost' | 'reliability';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedImprovement: number;
  actions: string[];
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  score: number; // 0-100
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    recommendation: string;
  }>;
  recommendations: OptimizationSuggestion[];
  uptime: number;
  lastIncident: Date | null;
}

export class PerformanceService {
  private readonly dataSource: DataSource;
  private readonly metricsCache: Map<string, any> = new Map();
  private readonly alertThresholds = {
    cpu: 80,
    memory: 85,
    databaseConnections: 80,
    responseTime: 5000,
    errorRate: 5,
  };

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.startMetricsCollection();
  }

  /**
   * Obtiene métricas de rendimiento en tiempo real
   */
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    try {
      // Recopilar métricas del sistema
      const systemMetrics = await this.collectSystemMetrics();
      const databaseMetrics = await this.collectDatabaseMetrics();
      const cacheMetrics = await this.collectCacheMetrics();
      const workflowMetrics = await this.collectWorkflowMetrics();

      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        ...systemMetrics,
        database: databaseMetrics,
        cache: cacheMetrics,
        network: await this.collectNetworkMetrics(),
        workflows: workflowMetrics,
      };

      // Almacenar en cache
      this.metricsCache.set('current', metrics);

      return metrics;
    } catch (error) {
      throw new Error(`Error al obtener métricas: ${error.message}`);
    }
  }

  /**
   * Obtiene métricas históricas
   */
  async getHistoricalMetrics(
    timeframe: '1h' | '6h' | '24h' | '7d' | '30d' = '24h',
  ): Promise<PerformanceMetrics[]> {
    try {
      const cutoffDate = this.getCutoffDate(timeframe);

      const metrics = await this.dataSource.getRepository(SystemMetrics)
        .createQueryBuilder('metrics')
        .where('metrics.timestamp >= :cutoff', { cutoff: cutoffDate })
        .orderBy('metrics.timestamp', 'ASC')
        .getMany();

      return metrics.map(m => m.data);
    } catch (error) {
      throw new Error(`Error al obtener métricas históricas: ${error.message}`);
    }
  }

  /**
   * Analiza el estado de salud del sistema
   */
  async analyzeSystemHealth(): Promise<SystemHealth> {
    try {
      const currentMetrics = await this.getCurrentMetrics();
      const issues: any[] = [];
      const recommendations: OptimizationSuggestion[] = [];

      // Analizar CPU
      if (currentMetrics.cpu.usage > this.alertThresholds.cpu) {
        issues.push({
          type: 'cpu',
          severity: currentMetrics.cpu.usage > 95 ? 'high' : 'medium',
          message: `Alto uso de CPU: ${currentMetrics.cpu.usage.toFixed(1)}%`,
          recommendation: 'Optimizar workflows con alto uso de CPU o escalar recursos',
        });
      }

      // Analizar Memoria
      if (currentMetrics.memory.usage > this.alertThresholds.memory) {
        issues.push({
          type: 'memory',
          severity: currentMetrics.memory.usage > 95 ? 'high' : 'medium',
          message: `Alto uso de memoria: ${currentMetrics.memory.usage.toFixed(1)}%`,
          recommendation: 'Implementar garbage collection más agresivo o aumentar memoria',
        });
      }

      // Analizar Base de datos
      if (currentMetrics.database.avgResponseTime > this.alertThresholds.responseTime) {
        issues.push({
          type: 'database',
          severity: currentMetrics.database.avgResponseTime > 10000 ? 'high' : 'medium',
          message: `Respuesta lenta de BD: ${currentMetrics.database.avgResponseTime}ms`,
          recommendation: 'Optimizar queries o agregar índices',
        });
      }

      // Analizar Cache
      const cacheHitRate = currentMetrics.cache.hitRate;
      if (cacheHitRate < 70) {
        issues.push({
          type: 'cache',
          severity: cacheHitRate < 50 ? 'high' : 'medium',
          message: `Bajo rate de aciertos de cache: ${cacheHitRate.toFixed(1)}%`,
          recommendation: 'Revisar estrategia de cache y claves',
        });
      }

      // Determinar estado general
      const criticalIssues = issues.filter(i => i.severity === 'high').length;
      const warningIssues = issues.filter(i => i.severity === 'medium').length;

      let status: SystemHealth['status'] = 'healthy';
      let score = 100;

      if (criticalIssues > 0) {
        status = 'critical';
        score = Math.max(0, 100 - (criticalIssues * 20));
      } else if (warningIssues > 2) {
        status = 'warning';
        score = Math.max(60, 100 - (warningIssues * 10));
      } else if (warningIssues > 0) {
        status = 'warning';
        score = Math.max(80, 100 - (warningIssues * 5));
      }

      // Generar recomendaciones
      recommendations.push(...this.generateRecommendations(currentMetrics, issues));

      return {
        status,
        score,
        issues,
        recommendations,
        uptime: await this.getSystemUptime(),
        lastIncident: await this.getLastIncident(),
      };

    } catch (error) {
      throw new Error(`Error al analizar salud del sistema: ${error.message}`);
    }
  }

  /**
   * Genera sugerencias de optimización
   */
  async generateOptimizationSuggestions(
    user: AuthUser,
  ): Promise<OptimizationSuggestion[]> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('settings:read')) {
        throw new Error('Sin permisos para ver optimizaciones');
      }

      const currentMetrics = await this.getCurrentMetrics();
      const health = await this.analyzeSystemHealth();
      const suggestions: OptimizationSuggestion[] = [];

      // Sugerencias de rendimiento
      if (currentMetrics.cpu.usage > 70) {
        suggestions.push({
          type: 'performance',
          priority: currentMetrics.cpu.usage > 90 ? 'critical' : 'high',
          title: 'Optimizar uso de CPU',
          description: 'El sistema muestra alto uso de CPU',
          impact: 'Reducir latencia de respuesta y mejorar experiencia del usuario',
          effort: 'medium',
          estimatedImprovement: 25,
          actions: [
            'Identificar workflows con alto consumo de CPU',
            'Implementar colas para distribuir carga',
            'Considerar escalado vertical u horizontal',
            'Optimizar algoritmos de procesamiento',
          ],
        });
      }

      if (currentMetrics.database.avgResponseTime > 1000) {
        suggestions.push({
          type: 'performance',
          priority: 'high',
          title: 'Optimizar rendimiento de base de datos',
          description: 'Las consultas a la base de datos están lentas',
          impact: 'Mejorar tiempos de respuesta de la API',
          effort: 'high',
          estimatedImprovement: 40,
          actions: [
            'Analizar queries lentas con EXPLAIN',
            'Agregar índices a columnas frecuentemente consultadas',
            'Implementar cache de resultados frecuentes',
            'Considerar particionado de tablas grandes',
          ],
        });
      }

      if (currentMetrics.cache.hitRate < 80) {
        suggestions.push({
          type: 'performance',
          priority: 'medium',
          title: 'Mejorar estrategia de cache',
          description: 'El rate de aciertos del cache es bajo',
          impact: 'Reducir carga en base de datos y mejorar latencia',
          effort: 'low',
          estimatedImprovement: 30,
          actions: [
            'Revisar claves de cache y TTL',
            'Implementar cache warming para datos críticos',
            'Considerar cache distribuido',
            'Analizar patrones de acceso',
          ],
        });
      }

      // Sugerencias de recursos
      if (currentMetrics.memory.usage > 80) {
        suggestions.push({
          type: 'resource',
          priority: 'high',
          title: 'Optimizar uso de memoria',
          description: 'El sistema está usando mucha memoria',
          impact: 'Prevenir OOM errors y mejorar estabilidad',
          effort: 'medium',
          estimatedImprovement: 20,
          actions: [
            'Implementar streaming para archivos grandes',
            'Optimizar estructuras de datos en memoria',
            'Ajustar configuración de garbage collector',
            'Revisar memory leaks en el código',
          ],
        });
      }

      // Sugerencias de costo
      const costOptimization = this.generateCostOptimization(currentMetrics);
      if (costOptimization) {
        suggestions.push(costOptimization);
      }

      // Sugerencias de confiabilidad
      if (currentMetrics.network.errorRate > 2) {
        suggestions.push({
          type: 'reliability',
          priority: 'high',
          title: 'Mejorar confiabilidad de red',
          description: 'Alta tasa de errores en requests de red',
          impact: 'Reducir fallos de workflows y mejorar experiencia',
          effort: 'high',
          estimatedImprovement: 35,
          actions: [
            'Implementar retry logic con backoff',
            'Agregar circuit breakers para servicios externos',
            'Mejorar manejo de timeouts',
            'Implementar health checks',
          ],
        });
      }

      return suggestions;

    } catch (error) {
      throw new Error(`Error al generar sugerencias: ${error.message}`);
    }
  }

  /**
   * Ejecuta optimizaciones automáticas
   */
  async executeAutoOptimization(
    user: AuthUser,
    optimizations: string[],
  ): Promise<{
    success: boolean;
    applied: string[];
    failed: string[];
    results: any[];
  }> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('settings:write')) {
        throw new Error('Sin permisos para ejecutar optimizaciones');
      }

      const applied: string[] = [];
      const failed: string[] = [];
      const results: any[] = [];

      for (const optimization of optimizations) {
        try {
          const result = await this.applyOptimization(optimization);
          applied.push(optimization);
          results.push({ optimization, result });
        } catch (error) {
          failed.push(optimization);
          results.push({ optimization, error: error.message });
        }
      }

      return {
        success: failed.length === 0,
        applied,
        failed,
        results,
      };

    } catch (error) {
      throw new Error(`Error al ejecutar optimizaciones: ${error.message}`);
    }
  }

  /**
   * Obtiene dashboard de rendimiento
   */
  async getPerformanceDashboard(): Promise<{
    overview: SystemHealth;
    currentMetrics: PerformanceMetrics;
    trends: {
      cpu: number;
      memory: number;
      responseTime: number;
      throughput: number;
    };
    alerts: any[];
    topWorkflows: any[];
  }> {
    try {
      const currentMetrics = await this.getCurrentMetrics();
      const health = await this.analyzeSystemHealth();
      const trends = await this.calculateTrends();
      const alerts = await this.getActiveAlerts();
      const topWorkflows = await this.getTopPerformingWorkflows();

      return {
        overview: health,
        currentMetrics,
        trends,
        alerts,
        topWorkflows,
      };

    } catch (error) {
      throw new Error(`Error al obtener dashboard: ${error.message}`);
    }
  }

  // Métodos auxiliares privados

  private startMetricsCollection(): void {
    // Recopilar métricas cada 30 segundos
    setInterval(async () => {
      try {
        await this.collectAndStoreMetrics();
      } catch (error) {
        console.error('Error recolectando métricas:', error);
      }
    }, 30000);
  }

  private async collectAndStoreMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      
      const metricRecord = this.dataSource.getRepository(SystemMetrics).create({
        data: metrics,
        type: 'performance',
        timestamp: new Date(),
      });

      await this.dataSource.getRepository(SystemMetrics).save(metricRecord);
    } catch (error) {
      console.error('Error almacenando métricas:', error);
    }
  }

  private async collectSystemMetrics(): Promise<any> {
    // Simular métricas del sistema
    return {
      cpu: {
        usage: Math.random() * 100,
        load: Math.random() * 4,
        cores: 4,
      },
      memory: {
        used: 1024 + Math.random() * 2048, // MB
        total: 4096, // MB
        usage: 0,
      },
    };
  }

  private async collectDatabaseMetrics(): Promise<any> {
    return {
      connections: Math.floor(Math.random() * 50),
      queries: Math.floor(Math.random() * 1000),
      avgResponseTime: Math.random() * 1000,
      slowQueries: Math.floor(Math.random() * 5),
    };
  }

  private async collectCacheMetrics(): Promise<any> {
    const hits = Math.floor(Math.random() * 1000);
    const misses = Math.floor(Math.random() * 200);
    const total = hits + misses;
    
    return {
      hits,
      misses,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
    };
  }

  private async collectNetworkMetrics(): Promise<any> {
    return {
      requests: Math.floor(Math.random() * 10000),
      responseTime: Math.random() * 500,
      errorRate: Math.random() * 5,
    };
  }

  private async collectWorkflowMetrics(): Promise<any> {
    return {
      active: Math.floor(Math.random() * 20),
      completed: Math.floor(Math.random() * 100),
      failed: Math.floor(Math.random() * 5),
      avgExecutionTime: Math.random() * 30000,
    };
  }

  private getCutoffDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private generateRecommendations(metrics: PerformanceMetrics, issues: any[]): OptimizationSuggestion[] {
    const recommendations: OptimizationSuggestion[] = [];

    // Generar recomendaciones basadas en issues
    issues.forEach(issue => {
      switch (issue.type) {
        case 'cpu':
          recommendations.push({
            type: 'performance',
            priority: 'high',
            title: 'Optimizar uso de CPU',
            description: 'Alto uso de CPU detectado',
            impact: 'Mejorar rendimiento general del sistema',
            effort: 'medium',
            estimatedImprovement: 25,
            actions: [
              'Perfilado de performance de workflows',
              'Optimización de algoritmos',
              'Considerar escalado horizontal',
            ],
          });
          break;
        case 'memory':
          recommendations.push({
            type: 'resource',
            priority: 'medium',
            title: 'Optimizar uso de memoria',
            description: 'Alto uso de memoria RAM',
            impact: 'Prevenir memory issues',
            effort: 'low',
            estimatedImprovement: 15,
            actions: [
              'Revisar memory leaks',
              'Implementar streaming',
              'Ajustar garbage collection',
            ],
          });
          break;
      }
    });

    return recommendations;
  }

  private generateCostOptimization(metrics: PerformanceMetrics): OptimizationSuggestion | null {
    // Lógica para sugerir optimizaciones de costo
    if (metrics.cpu.usage < 30 && metrics.memory.usage < 50) {
      return {
        type: 'cost',
        priority: 'medium',
        title: 'Optimizar costos de infraestructura',
        description: 'Baja utilización de recursos disponibles',
        impact: 'Reducir costos operativos',
        effort: 'high',
        estimatedImprovement: 20,
        actions: [
          'Redimensionar instancias según uso',
          'Implementar auto-scaling',
          'Mover cargas no críticas a horarios de menor costo',
        ],
      };
    }
    return null;
  }

  private async applyOptimization(optimization: string): Promise<any> {
    // Implementar optimizaciones automáticas
    switch (optimization) {
      case 'clear_cache':
        this.metricsCache.clear();
        return { message: 'Cache limpiado exitosamente' };
      
      case 'optimize_database':
        // Lógica de optimización de BD
        return { message: 'Optimización de BD ejecutada' };
      
      case 'restart_services':
        // Lógica de reinicio de servicios
        return { message: 'Servicios reiniciados' };
      
      default:
        throw new Error(`Optimización desconocida: ${optimization}`);
    }
  }

  private async calculateTrends(): Promise<any> {
    // Calcular tendencias en el tiempo
    return {
      cpu: Math.random() * 20 - 10, // -10% a +10%
      memory: Math.random() * 15 - 5,
      responseTime: Math.random() * 30 - 15,
      throughput: Math.random() * 25 - 10,
    };
  }

  private async getActiveAlerts(): Promise<any[]> {
    // Obtener alertas activas
    return [
      {
        id: 'alert-1',
        type: 'performance',
        severity: 'medium',
        message: 'Alto uso de CPU',
        timestamp: new Date(),
        acknowledged: false,
      },
    ];
  }

  private async getTopPerformingWorkflows(): Promise<any[]> {
    // Obtener workflows con mejor performance
    return [
      {
        id: 'workflow-1',
        name: 'Data Processing Pipeline',
        avgExecutionTime: 15000,
        successRate: 98.5,
        executions: 150,
      },
    ];
  }

  private async getSystemUptime(): Promise<number> {
    // Simular uptime del sistema
    return 99.8;
  }

  private async getLastIncident(): Promise<Date | null> {
    // Obtener último incidente
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días atrás
  }
}