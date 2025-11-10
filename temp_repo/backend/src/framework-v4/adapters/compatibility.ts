/**
 * Framework Silhouette Enterprise V4.0 - Adaptadores de Compatibilidad
 * 
 * Estos adaptadores permiten que el framework V4.0 funcione con las APIs existentes
 * sin romper la funcionalidad actual. Gradualmente se puede migrar a las nuevas APIs.
 * 
 * Autor: Silhouette Anonimo
 * Versión: 4.0.0
 * Fecha: 2025-11-09
 */

import { LegacyAPIAdapterV4, WorkflowV4, TaskV4, TeamV4, WorkflowLegacyAdapter, QASystemLegacyAdapter, CollaborationLegacyAdapter } from '../types';

/**
 * Adaptador para workflows existentes
 * Convierte el formato actual de workflows al formato V4.0
 */
export class WorkflowAdapter implements WorkflowLegacyAdapter {
  
  /**
   * Convierte un request legacy a formato V4.0
   */
  adaptRequest(legacyRequest: any): WorkflowV4 {
    // Si ya es un workflow V4.0, no lo modificamos
    if (legacyRequest.version === '4.0.0') {
      return legacyRequest;
    }
    
    // Adaptar workflow legacy a V4.0
    return {
      id: legacyRequest.id || this.generateId(),
      name: legacyRequest.name || legacyRequest.title || 'Untitled Workflow',
      type: this.detectWorkflowType(legacyRequest),
      steps: this.adaptSteps(legacyRequest.steps || []),
      status: legacyRequest.status || 'draft',
      createdAt: new Date(legacyRequest.createdAt || Date.now()),
      startedAt: legacyRequest.startedAt ? new Date(legacyRequest.startedAt) : undefined,
      completedAt: legacyRequest.completedAt ? new Date(legacyRequest.completedAt) : undefined,
      configuration: {
        autoOptimization: legacyRequest.autoOptimization || true,
        parallelExecution: legacyRequest.parallelExecution || false,
        maxRetries: legacyRequest.maxRetries || 3,
        timeout: legacyRequest.timeout || 300000, // 5 minutos
      },
      metadata: {
        totalSteps: legacyRequest.steps?.length || 0,
        completedSteps: 0,
        failedSteps: 0,
        averageStepTime: 0,
      },
    };
  }
  
  /**
   * Convierte un workflow V4.0 al formato legacy
   */
  adaptResponse(v4Workflow: WorkflowV4): any {
    return {
      id: v4Workflow.id,
      name: v4Workflow.name,
      status: v4Workflow.status,
      steps: v4Workflow.steps.map(step => ({
        id: step.id,
        name: step.name,
        type: step.type,
        status: step.status,
        result: step.result,
        error: step.error,
      })),
      createdAt: v4Workflow.createdAt,
      startedAt: v4Workflow.startedAt,
      completedAt: v4Workflow.completedAt,
      // Mantener campos legacy para compatibilidad
      version: v4Workflow.version || '4.0.0',
      autoOptimization: v4Workflow.configuration.autoOptimization,
      parallelExecution: v4Workflow.configuration.parallelExecution,
    };
  }
  
  /**
   * Valida si el request es compatible
   */
  validateCompatibility(request: any): boolean {
    return !!(
      request &&
      typeof request === 'object' &&
      (request.steps || request.version === '4.0.0')
    );
  }
  
  /**
   * Detecta el tipo de workflow basado en su estructura
   */
  private detectWorkflowType(legacyRequest: any): 'sequential' | 'parallel' | 'dag' | 'conditional' {
    if (legacyRequest.parallelSteps || legacyRequest.parallel) {
      return 'parallel';
    }
    if (legacyRequest.conditional || legacyRequest.if) {
      return 'conditional';
    }
    if (legacyRequest.dependencies || legacyRequest.dag) {
      return 'dag';
    }
    return 'sequential';
  }
  
  /**
   * Adapta pasos de workflow legacy a V4.0
   */
  private adaptSteps(legacySteps: any[]): any[] {
    return legacySteps.map((step, index) => ({
      id: step.id || this.generateId(),
      name: step.name || step.title || `Step ${index + 1}`,
      type: this.detectStepType(step),
      taskType: step.taskType || step.type || 'generic',
      configuration: step.configuration || step.config || {},
      dependencies: step.dependencies || [],
      timeout: step.timeout || 300000,
      retryPolicy: {
        maxRetries: step.maxRetries || 3,
        backoffMultiplier: step.backoffMultiplier || 2,
        initialDelay: step.initialDelay || 1000,
      },
      status: 'pending',
    }));
  }
  
  /**
   * Detecta el tipo de paso
   */
  private detectStepType(step: any): 'task' | 'condition' | 'parallel' | 'delay' | 'notification' {
    if (step.conditional || step.if) return 'condition';
    if (step.parallel) return 'parallel';
    if (step.delay || step.wait) return 'delay';
    if (step.notification || step.notify) return 'notification';
    return 'task';
  }
  
  /**
   * Genera un ID único
   */
  private generateId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Adaptador para el sistema de QA existente
 */
export class QAAdapter implements QASystemLegacyAdapter {
  
  /**
   * Adapta requests de QA al formato V4.0
   */
  adaptRequest(legacyRequest: any): any {
    // Mantener compatibilidad con el sistema de QA actual
    return {
      ...legacyRequest,
      version: '4.0.0',
      enhanced: true,
      validationLevels: legacyRequest.validationLevels || ['technical', 'content', 'performance'],
      autoOptimize: legacyRequest.autoOptimize || true,
    };
  }
  
  /**
   * Adapta responses de QA al formato legacy
   */
  adaptResponse(v4Response: any): any {
    return {
      ...v4Response,
      // Mantener estructura legacy para compatibilidad
      success: v4Response.success !== false,
      score: v4Response.score || v4Response.qualityScore,
      grade: v4Response.grade || this.scoreToGrade(v4Response.qualityScore || v4Response.score),
      validationDetails: v4Response.validationDetails || v4Response.details,
      recommendations: v4Response.recommendations || [],
    };
  }
  
  /**
   * Valida compatibilidad
   */
  validateCompatibility(request: any): boolean {
    return !!(
      request &&
      typeof request === 'object' &&
      (request.type || request.validationType)
    );
  }
  
  /**
   * Convierte score numérico a grade
   */
  private scoreToGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    return 'D';
  }
}

/**
 * Adaptador para el sistema de colaboración
 */
export class CollaborationAdapter implements CollaborationLegacyAdapter {
  
  /**
   * Adapta requests de colaboración
   */
  adaptRequest(legacyRequest: any): any {
    return {
      ...legacyRequest,
      version: '4.0.0',
      enhanced: true,
      realTime: true,
      multiUser: true,
      autoSave: true,
    };
  }
  
  /**
   * Adapta responses de colaboración
   */
  adaptResponse(v4Response: any): any {
    return {
      ...v4Response,
      // Mantener compatibilidad con WebSockets existentes
      socketEvent: v4Response.eventType,
      room: v4Response.roomId,
      userId: v4Response.userId,
      timestamp: v4Response.timestamp,
    };
  }
  
  /**
   * Valida compatibilidad
   */
  validateCompatibility(request: any): boolean {
    return !!(
      request &&
      typeof request === 'object' &&
      (request.workflowId || request.roomId)
    );
  }
}

/**
 * Adaptador para autenticación
 */
export class AuthAdapter {
  
  /**
   * Verifica token legacy y retorna información V4.0
   */
  static async verifyLegacyToken(token: string): Promise<any> {
    try {
      // Aquí se implementaría la lógica de verificación de JWT existente
      // Por ahora, retornamos un objeto de ejemplo
      
      return {
        valid: true,
        user: {
          id: 'user_123',
          email: 'user@example.com',
          role: 'user',
          permissions: ['read', 'write', 'execute'],
        },
        metadata: {
          issued: new Date(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          version: '4.0.0',
        },
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  /**
   * Genera un nuevo token V4.0
   */
  static generateV4Token(user: any): string {
    // En una implementación real, aquí se generaría un JWT con claims V4.0
    return `v4.${btoa(JSON.stringify({
      user: user.id,
      role: user.role,
      permissions: user.permissions,
      version: '4.0.0',
      issued: new Date().toISOString(),
    }))}`;
  }
}

/**
 * Adaptador para métricas
 */
export class MetricsAdapter {
  
  /**
   * Convierte métricas legacy a formato V4.0
   */
  static adaptLegacyMetrics(legacyMetrics: any): any {
    return {
      timestamp: new Date(),
      performance: {
        responseTime: legacyMetrics.responseTime || 200,
        throughput: legacyMetrics.throughput || 500,
        cpuUsage: legacyMetrics.cpuUsage || 45,
        memoryUsage: legacyMetrics.memoryUsage || 60,
        diskUsage: legacyMetrics.diskUsage || 30,
      },
      quality: {
        overall: legacyMetrics.overallScore || 95,
        byType: legacyMetrics.byType || {},
        trends: legacyMetrics.trends || {},
      },
      teams: {
        utilization: legacyMetrics.teamUtilization || 0.73,
        efficiency: legacyMetrics.teamEfficiency || 0.85,
        bottlenecks: legacyMetrics.bottlenecks || [],
        suggestions: legacyMetrics.suggestions || [],
      },
      workflows: {
        successRate: legacyMetrics.successRate || 0.98,
        averageDuration: legacyMetrics.avgDuration || 120000,
        errorRate: legacyMetrics.errorRate || 0.02,
      },
      // Mantener métricas legacy para compatibilidad
      legacy: legacyMetrics,
    };
  }
  
  /**
   * Combina métricas legacy y V4.0
   */
  static combineMetrics(legacyMetrics: any, v4Metrics: any): any {
    return {
      ...v4Metrics,
      enhanced: true,
      legacyCompatibility: true,
      combinedAt: new Date(),
    };
  }
}

/**
 * Registro global de adaptadores
 */
export class AdapterRegistry {
  private static adapters = {
    workflow: new WorkflowAdapter(),
    qa: new QAAdapter(),
    collaboration: new CollaborationAdapter(),
    auth: AuthAdapter,
    metrics: MetricsAdapter,
  };
  
  /**
   * Obtiene un adaptador por nombre
   */
  static getAdapter(name: string): any {
    return this.adapters[name as keyof typeof this.adapters];
  }
  
  /**
   * Registra un nuevo adaptador
   */
  static registerAdapter(name: string, adapter: any): void {
    this.adapters[name as keyof typeof this.adapters] = adapter;
  }
  
  /**
   * Lista todos los adaptadores disponibles
   */
  static listAdapters(): string[] {
    return Object.keys(this.adapters);
  }
}

/**
 * Utilidades de compatibilidad
 */
export class CompatibilityUtils {
  
  /**
   * Verifica si un request es V4.0 o legacy
   */
  static isV4Request(request: any): boolean {
    return request?.version === '4.0.0' || request?.v4 === true;
  }
  
  /**
   * Determina qué adaptador usar
   */
  static selectAdapter(request: any, type: string): any {
    if (this.isV4Request(request)) {
      // Si es V4.0, usar directamente
      return null;
    }
    // Usar adaptador legacy
    return AdapterRegistry.getAdapter(type);
  }
  
  /**
   * Adapta un request basado en su tipo
   */
  static adaptRequest(request: any, type: string): any {
    const adapter = this.selectAdapter(request, type);
    if (adapter && typeof adapter.adaptRequest === 'function') {
      return adapter.adaptRequest(request);
    }
    return request;
  }
  
  /**
   * Adapta un response basado en su tipo
   */
  static adaptResponse(response: any, type: string): any {
    const adapter = this.selectAdapter(response, type);
    if (adapter && typeof adapter.adaptResponse === 'function') {
      return adapter.adaptResponse(response);
    }
    return response;
  }
  
  /**
   * Log de compatibilidad
   */
  static logCompatibility(request: any, adapter: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Framework V4.0] Using ${adapter ? 'legacy adapter' : 'native V4.0'} for request:`, {
        hasVersion: !!request?.version,
        adapterName: adapter?.constructor?.name || 'none',
        isV4: this.isV4Request(request),
      });
    }
  }
}

// Exportar adaptadores principales
export {
  WorkflowAdapter as Workflow,
  QAAdapter as QA,
  CollaborationAdapter as Collaboration,
  AuthAdapter,
  MetricsAdapter,
  AdapterRegistry,
  CompatibilityUtils,
};
