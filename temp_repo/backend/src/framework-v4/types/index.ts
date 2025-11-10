/**
 * Framework Silhouette Enterprise V4.0 - Tipos TypeScript
 * 
 * Esta implementación integra el framework V4.0 con las APIs existentes
 * manteniendo compatibilidad completa con el sistema actual.
 * 
 * Autor: Silhouette Anonimo
 * Versión: 4.0.0
 * Fecha: 2025-11-09
 */

// ================================
// TIPOS BASE DEL FRAMEWORK V4.0
// ================================

export interface FrameworkConfigV4 {
  version: '4.0.0';
  environment: 'development' | 'production' | 'staging';
  coordinator: {
    enabled: boolean;
    maxConcurrentTasks: number;
    intelligentAssignment: boolean;
    loadBalancing: boolean;
    autoRecovery: boolean;
  };
  workflow: {
    enabled: boolean;
    dynamicOptimization: boolean;
    autoScaling: boolean;
    dagSupport: boolean;
  };
  audiovisual: {
    enabled: boolean;
    providers: {
      runway: boolean;
      pika: boolean;
      luma: boolean;
    };
    quality: {
      minScore: number;
      verificationLevels: string[];
    };
  };
  optimization: {
    enabled: boolean;
    mlBased: boolean;
    autoScaling: boolean;
    performanceThreshold: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alerts: boolean;
  };
}

export interface TeamV4 {
  id: string;
  name: string;
  type: TeamTypeV4;
  capabilities: string[];
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  currentLoad: number;
  maxCapacity: number;
  metrics: {
    tasksCompleted: number;
    averageResponseTime: number;
    successRate: number;
    utilization: number;
  };
  lastHealthCheck: Date;
}

export type TeamTypeV4 = 
  | 'AudioVisual'
  | 'Business Development'
  | 'Marketing & Sales'
  | 'Research & Analytics'
  | 'Design & Creative'
  | 'AudioVisual Production'
  | 'Quality Assurance'
  | 'Legal & Compliance'
  | 'Finance & Operations'
  | 'IT Infrastructure'
  | 'Data Science'
  | 'Cloud & DevOps'
  | 'Product Management'
  | 'Security & Risk'
  | 'Human Resources'
  | 'Operations'
  | 'Compliance'
  | 'Risk Management'
  | 'Customer Support'
  | 'Training & Development';

export interface TaskV4 {
  id: string;
  type: string;
  priority: number;
  data: any;
  assignedTeam?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'retrying';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  metadata: {
    source: string;
    correlationId?: string;
    retryCount: number;
    qualityScore?: number;
  };
}

export interface WorkflowV4 {
  id: string;
  name: string;
  type: 'sequential' | 'parallel' | 'dag' | 'conditional';
  steps: WorkflowStepV4[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  configuration: {
    autoOptimization: boolean;
    parallelExecution: boolean;
    maxRetries: number;
    timeout: number;
  };
  metrics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    averageStepTime: number;
  };
}

export interface WorkflowStepV4 {
  id: string;
  name: string;
  type: 'task' | 'condition' | 'parallel' | 'delay' | 'notification';
  taskType: string;
  configuration: any;
  dependencies: string[];
  timeout?: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: any;
}

// ================================
// SISTEMA AUDIOVISUAL V4.0
// ================================

export interface AudioVisualProjectV4 {
  id: string;
  titulo: string;
  plataforma: 'Instagram Reels' | 'TikTok' | 'YouTube Shorts' | 'Facebook' | 'LinkedIn';
  duracion: number;
  audiencia: string;
  objetivo: 'engagement' | 'awareness' | 'conversion' | 'education';
  status: 'research' | 'planning' | 'scripting' | 'production' | 'qa' | 'complete';
  createdAt: Date;
  completedAt?: Date;
  metadata: {
    qualityScore: number;
    predictedEngagement: number;
    productionTime: number;
    totalCost: number;
  };
  research: {
    trends: any[];
    demographics: any;
    competitive: any;
    virality: any;
  };
  strategy: {
    narrative: string;
    keyMessages: string[];
    callToAction: string;
  };
  script: {
    content: string;
    timestamps: any[];
    transitions: any[];
  };
  assets: {
    images: any[];
    videos: any[];
    audio: any[];
  };
  animation: {
    prompts: any[];
    effects: any[];
    transitions: any[];
  };
  qa: {
    technical: any;
    content: any;
    brand: any;
  };
  output: {
    finalVideo?: string;
    formats: any[];
    distribution: any;
  };
}

export interface AudioVisualConfigV4 {
  providers: {
    unsplash: {
      enabled: boolean;
      apiKey: string;
      rateLimit: number;
      quality: 'low' | 'medium' | 'high';
    };
    runway: {
      enabled: boolean;
      apiKey: string;
      maxDuration: number;
    };
    pika: {
      enabled: boolean;
      apiKey: string;
    };
    luma: {
      enabled: boolean;
      apiKey: string;
    };
  };
  quality: {
    minScore: number;
    verificationLevels: ('technical' | 'content' | 'brand')[];
    autoApproval: boolean;
  };
  production: {
    maxConcurrent: number;
    timeout: number;
    retryAttempts: number;
  };
}

// ================================
// OPTIMIZACIÓN Y MÉTRICAS V4.0
// ================================

export interface OptimizationMetricsV4 {
  timestamp: Date;
  performance: {
    responseTime: number;
    throughput: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  quality: {
    overall: number;
    byType: { [key: string]: number };
    trends: { [key: string]: number[] };
  };
  teams: {
    utilization: number;
    efficiency: number;
    bottlenecks: string[];
    suggestions: string[];
  };
  workflows: {
    successRate: number;
    averageDuration: number;
    errorRate: number;
  };
}

export interface AlertV4 {
  id: string;
  type: 'performance' | 'quality' | 'system' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

// ================================
// ADAPTADORES PARA APIs EXISTENTES
// ================================

export interface LegacyAPIAdapterV4<T, U> {
  // Adaptador de APIs existentes al framework V4.0
  adaptRequest(request: T): U;
  adaptResponse(response: U): T;
  validateCompatibility(request: T): boolean;
}

export interface WorkflowLegacyAdapter extends LegacyAPIAdapterV4<any, WorkflowV4> {
  // Adaptador específico para workflows existentes
}

export interface QASystemLegacyAdapter extends LegacyAPIAdapterV4<any, any> {
  // Adaptador específico para QA System
}

export interface CollaborationLegacyAdapter extends LegacyAPIAdapterV4<any, any> {
  // Adaptador específico para colaboración
}

// ================================
// EVENTOS Y NOTIFICACIONES V4.0
// ================================

export interface FrameworkEventV4 {
  id: string;
  type: EventTypeV4;
  source: string;
  data: any;
  timestamp: Date;
  correlationId?: string;
}

export type EventTypeV4 = 
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'WORKFLOW_STARTED'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_FAILED'
  | 'TEAM_STATUS_CHANGED'
  | 'PERFORMANCE_DEGRADED'
  | 'ALERT_RAISED'
  | 'OPTIMIZATION_APPLIED'
  | 'AUDIOVISUAL_PROJECT_STARTED'
  | 'AUDIOVISUAL_PROJECT_COMPLETED';

// ================================
// CONFIGURACIÓN DE DEPLOYMENT V4.0
// ================================

export interface DeploymentConfigV4 {
  environment: 'development' | 'staging' | 'production';
  scaling: {
    minReplicas: number;
    maxReplicas: number;
    targetCPU: number;
    targetMemory: number;
  };
  monitoring: {
    prometheus: boolean;
    grafana: boolean;
    alerts: boolean;
    retention: string;
  };
  security: {
    encryption: boolean;
    authentication: boolean;
    authorization: boolean;
    audit: boolean;
  };
  networking: {
    internal: boolean;
    external: boolean;
    loadBalancer: boolean;
    ssl: boolean;
  };
}

// ================================
// EXPORTACIONES PRINCIPALES
// ================================

export {
  FrameworkConfigV4 as Config,
  TeamV4 as Team,
  TaskV4 as Task,
  WorkflowV4 as Workflow,
  AudioVisualProjectV4 as AudioVisualProject,
  OptimizationMetricsV4 as Metrics,
  AlertV4 as Alert,
  FrameworkEventV4 as Event
};

// Tipos de compatibilidad con sistema actual
export type LegacyWorkflow = any;
export type LegacyTask = any;
export type LegacyTeam = any;
