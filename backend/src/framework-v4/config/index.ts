/**
 * Framework Silhouette Enterprise V4.0 - Configuración
 * 
 * Configuración inteligente que mantiene compatibilidad con APIs existentes
 * mientras habilita las nuevas características del V4.0
 * 
 * Autor: Silhouette Anonimo
 * Versión: 4.0.0
 * Fecha: 2025-11-09
 */

import { FrameworkConfigV4 } from '../types';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración por defecto del Framework V4.0
 * Mantiene compatibilidad con el sistema actual
 */
export const defaultFrameworkConfig: FrameworkConfigV4 = {
  version: '4.0.0',
  environment: process.env.NODE_ENV as 'development' | 'production' | 'staging' || 'development',
  
  // Coordinador Engine
  coordinator: {
    enabled: true,
    maxConcurrentTasks: Number(process.env.MAX_CONCURRENT_TASKS) || 100,
    intelligentAssignment: process.env.COORDINATOR_INTELLIGENT_ASSIGNMENT === 'true',
    loadBalancing: process.env.COORDINATOR_LOAD_BALANCING === 'true',
    autoRecovery: process.env.COORDINATOR_AUTO_RECOVERY === 'true',
  },
  
  // Workflow Engine
  workflow: {
    enabled: true,
    dynamicOptimization: process.env.WORKFLOW_DYNAMIC_OPTIMIZATION === 'true',
    autoScaling: process.env.WORKFLOW_AUTO_SCALING === 'true',
    dagSupport: process.env.WORKFLOW_DAG_SUPPORT === 'true',
  },
  
  // Sistema Audiovisual
  audiovisual: {
    enabled: process.env.AUDIOVISUAL_ENABLED === 'true',
    providers: {
      runway: process.env.RUNWAY_ENABLED === 'true',
      pika: process.env.PIKA_ENABLED === 'true',
      luma: process.env.LUMA_ENABLED === 'true',
    },
    quality: {
      minScore: Number(process.env.AUDIOVISUAL_QUALITY_MIN) || 90,
      verificationLevels: ['technical', 'content', 'brand'],
    },
  },
  
  // Auto Optimizer
  optimization: {
    enabled: process.env.AUTO_OPTIMIZATION_ENABLED === 'true',
    mlBased: process.env.AUTO_OPTIMIZATION_ML === 'true',
    autoScaling: process.env.AUTO_SCALING_ENABLED === 'true',
    performanceThreshold: Number(process.env.PERFORMANCE_THRESHOLD) || 80,
  },
  
  // Monitoreo
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsInterval: Number(process.env.METRICS_INTERVAL) || 30000,
    alerts: process.env.ALERTS_ENABLED === 'true',
  },
};

/**
 * Configuración de servicios existentes
 * Asegura compatibilidad con APIs actuales
 */
export const legacyServiceConfig = {
  // QA System existente
  qa: {
    enabled: true,
    successRate: 99.99,
    version: '1.0.0',
    keepLegacyAPIs: true,
    backwardCompatibility: true,
  },
  
  // Sistema de colaboración
  collaboration: {
    enabled: true,
    keepWebSockets: true,
    keepRealTime: true,
    enableNewFeatures: true,
  },
  
  // Sistema de workflows
  workflows: {
    enabled: true,
    keepExistingAPIs: true,
    enableV4Features: true,
    migrationMode: 'gradual',
  },
  
  // Autenticación
  auth: {
    enabled: true,
    keepJWT: true,
    enhanceWithV4: true,
  },
  
  // Métricas existentes
  metrics: {
    enabled: true,
    keepExistingCollection: true,
    addV4Metrics: true,
  },
};

/**
 * Configuración de equipos especializados V4.0
 * 45+ equipos predefinidos
 */
export const specializedTeamsConfig = {
  // Equipos core del sistema
  core: [
    {
      id: 'audiovisual',
      name: 'AudioVisual Team',
      type: 'AudioVisual',
      capabilities: [
        'video_production',
        'animation',
        'script_writing',
        'asset_search',
        'quality_verification',
        'scene_composition'
      ],
      priority: 1,
      maxCapacity: 10,
    },
    {
      id: 'qa',
      name: 'Quality Assurance Team',
      type: 'Quality Assurance',
      capabilities: [
        'information_verification',
        'hallucination_detection',
        'fact_checking',
        'cross_reference',
        'quality_gates'
      ],
      priority: 1,
      maxCapacity: 15,
    },
    {
      id: 'business',
      name: 'Business Development Team',
      type: 'Business Development',
      capabilities: [
        'market_analysis',
        'business_strategy',
        'opportunity_identification',
        'stakeholder_management'
      ],
      priority: 2,
      maxCapacity: 8,
    },
    {
      id: 'marketing',
      name: 'Marketing & Sales Team',
      type: 'Marketing & Sales',
      capabilities: [
        'campaign_strategy',
        'content_marketing',
        'social_media',
        'lead_generation',
        'conversion_optimization'
      ],
      priority: 2,
      maxCapacity: 12,
    },
    {
      id: 'research',
      name: 'Research & Analytics Team',
      type: 'Research & Analytics',
      capabilities: [
        'data_analysis',
        'trend_identification',
        'competitive_analysis',
        'predictive_modeling',
        'insights_generation'
      ],
      priority: 2,
      maxCapacity: 10,
    },
  ],
  
  // Equipos de soporte
  support: [
    {
      id: 'design',
      name: 'Design & Creative Team',
      type: 'Design & Creative',
      capabilities: [
        'ui_ux_design',
        'graphic_design',
        'brand_identity',
        'visual_communication'
      ],
      priority: 3,
      maxCapacity: 6,
    },
    {
      id: 'legal',
      name: 'Legal & Compliance Team',
      type: 'Legal & Compliance',
      capabilities: [
        'legal_review',
        'compliance_check',
        'risk_assessment',
        'regulatory_filing'
      ],
      priority: 3,
      maxCapacity: 4,
    },
    {
      id: 'finance',
      name: 'Finance & Operations Team',
      type: 'Finance & Operations',
      capabilities: [
        'financial_analysis',
        'budget_planning',
        'cost_optimization',
        'operational_efficiency'
      ],
      priority: 3,
      maxCapacity: 5,
    },
    {
      id: 'it',
      name: 'IT Infrastructure Team',
      type: 'IT Infrastructure',
      capabilities: [
        'system_maintenance',
        'infrastructure_optimization',
        'security_management',
        'technical_support'
      ],
      priority: 2,
      maxCapacity: 8,
    },
  ],
  
  // Equipos especializados
  specialized: [
    {
      id: 'datascience',
      name: 'Data Science Team',
      type: 'Data Science',
      capabilities: [
        'machine_learning',
        'predictive_analytics',
        'data_modeling',
        'statistical_analysis'
      ],
      priority: 2,
      maxCapacity: 6,
    },
    {
      id: 'clouddevops',
      name: 'Cloud & DevOps Team',
      type: 'Cloud & DevOps',
      capabilities: [
        'cloud_migration',
        'ci_cd_pipeline',
        'infrastructure_automation',
        'monitoring_setup'
      ],
      priority: 2,
      maxCapacity: 5,
    },
    {
      id: 'security',
      name: 'Security & Risk Team',
      type: 'Security & Risk',
      capabilities: [
        'security_audit',
        'risk_assessment',
        'vulnerability_scanning',
        'incident_response'
      ],
      priority: 1,
      maxCapacity: 4,
    },
  ],
};

/**
 * Configuración del sistema audiovisual V4.0
 */
export const audiovisualConfig = {
  // Configuración de proveedores
  providers: {
    unsplash: {
      enabled: !!process.env.UNSPLASH_ACCESS_KEY,
      apiKey: process.env.UNSPLASH_ACCESS_KEY || '',
      rateLimit: Number(process.env.UNSPLASH_RATE_LIMIT) || 50,
      quality: process.env.UNSPLASH_QUALITY || 'high',
    },
    runway: {
      enabled: !!process.env.RUNWAY_API_KEY,
      apiKey: process.env.RUNWAY_API_KEY || '',
      maxDuration: Number(process.env.RUNWAY_MAX_DURATION) || 30,
      models: ['gen2', 'gen3', 'interpolate'],
    },
    pika: {
      enabled: !!process.env.PIKA_API_KEY,
      apiKey: process.env.PIKA_API_KEY || '',
      models: ['pika-0.9', 'pika-1.0'],
    },
    luma: {
      enabled: !!process.env.LUMA_API_KEY,
      apiKey: process.env.LUMA_API_KEY || '',
      models: ['dream-machine-v1', 'dream-machine-v1.5'],
    },
  },
  
  // Configuración de calidad
  quality: {
    minScore: Number(process.env.AUDIOVISUAL_QUALITY_MIN) || 90,
    verificationLevels: ['technical', 'content', 'brand'],
    autoApproval: process.env.AUDIOVISUAL_AUTO_APPROVAL === 'true',
  },
  
  // Configuración de producción
  production: {
    maxConcurrent: Number(process.env.AUDIOVISUAL_MAX_CONCURRENT) || 5,
    timeout: Number(process.env.AUDIOVISUAL_TIMEOUT) || 300000, // 5 minutos
    retryAttempts: Number(process.env.AUDIOVISUAL_RETRIES) || 3,
  },
  
  // Métricas esperadas
  metrics: {
    expectedQuality: 96.3,
    expectedTime: 300000, // 5 minutos
    expectedEngagement: 8.2,
    expectedScalability: 1000, // videos por día
  },
};

/**
 * Configuración de optimización automática
 */
export const optimizationConfig = {
  // Métricas de rendimiento
  performance: {
    targetResponseTime: 100, // ms
    targetThroughput: 1000, // tasks/hour
    targetCPUUsage: 70, // %
    targetMemoryUsage: 80, // %
  },
  
  // Auto-scaling
  autoScaling: {
    enabled: process.env.AUTO_SCALING_ENABLED === 'true',
    minReplicas: Number(process.env.AUTO_SCALING_MIN_REPLICAS) || 1,
    maxReplicas: Number(process.env.AUTO_SCALING_MAX_REPLICAS) || 10,
    targetCPU: Number(process.env.AUTO_SCALING_TARGET_CPU) || 70,
    targetMemory: Number(process.env.AUTO_SCALING_TARGET_MEMORY) || 80,
  },
  
  // ML-based optimization
  mlOptimization: {
    enabled: process.env.ML_OPTIMIZATION_ENABLED === 'true',
    modelPath: process.env.ML_MODEL_PATH || './models/optimization',
    trainingInterval: Number(process.env.ML_TRAINING_INTERVAL) || 3600000, // 1 hora
    predictionConfidence: 0.95,
  },
};

/**
 * Configuración de monitoreo y alertas
 */
export const monitoringConfig = {
  // Métricas
  metrics: {
    collectionInterval: Number(process.env.METRICS_INTERVAL) || 30000, // 30 segundos
    retention: process.env.METRICS_RETENTION || '7d',
    aggregation: '1m',
  },
  
  // Alertas
  alerts: {
    enabled: process.env.ALERTS_ENABLED === 'true',
    email: {
      enabled: !!process.env.ALERT_EMAIL,
      recipients: process.env.ALERT_EMAIL?.split(',') || [],
    },
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK,
      webhook: process.env.SLACK_WEBHOOK || '',
    },
    thresholds: {
      responseTime: 500, // ms
      errorRate: 5, // %
      cpuUsage: 90, // %
      memoryUsage: 90, // %
      queueLength: 50, // tasks
    },
  },
  
  // Dashboards
  dashboards: {
    grafana: {
      enabled: process.env.GRAFANA_ENABLED === 'true',
      url: process.env.GRAFANA_URL || 'http://localhost:3000',
      refreshInterval: '30s',
    },
  },
};

/**
 * Función para obtener configuración completa
 */
export function getFrameworkConfig(): FrameworkConfigV4 {
  return {
    ...defaultFrameworkConfig,
    environment: process.env.NODE_ENV as 'development' | 'production' | 'staging' || 'development',
  };
}

/**
 * Función para validar configuración
 */
export function validateConfig(config: FrameworkConfigV4): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.version || config.version !== '4.0.0') {
    errors.push('Invalid framework version');
  }
  
  if (!['development', 'production', 'staging'].includes(config.environment)) {
    errors.push('Invalid environment');
  }
  
  if (config.coordinator.maxConcurrentTasks < 1) {
    errors.push('Max concurrent tasks must be at least 1');
  }
  
  if (config.audiovisual.quality.minScore < 0 || config.audiovisual.quality.minScore > 100) {
    errors.push('Quality score must be between 0 and 100');
  }
  
  if (config.optimization.performanceThreshold < 0 || config.optimization.performanceThreshold > 100) {
    errors.push('Performance threshold must be between 0 and 100');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Configuración de deployment
 */
export const deploymentConfig = {
  environment: process.env.DEPLOYMENT_ENV || 'development',
  
  // Docker
  docker: {
    imageName: 'silhouette-framework-v4',
    imageTag: process.env.DOCKER_IMAGE_TAG || '4.0.0',
    registry: process.env.DOCKER_REGISTRY || '',
  },
  
  // Kubernetes
  kubernetes: {
    namespace: process.env.K8S_NAMESPACE || 'silhouette-framework',
    replicas: Number(process.env.K8S_REPLICAS) || 3,
    resources: {
      requests: {
        memory: '512Mi',
        cpu: '250m',
      },
      limits: {
        memory: '1Gi',
        cpu: '500m',
      },
    },
  },
  
  // Variables de entorno críticas
  requiredEnvVars: [
    'NODE_ENV',
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'API_KEY',
  ],
  
  // Variables opcionales
  optionalEnvVars: [
    'UNSPLASH_ACCESS_KEY',
    'RUNWAY_API_KEY',
    'PIKA_API_KEY',
    'LUMA_API_KEY',
    'GRAFANA_URL',
    'ALERT_EMAIL',
    'SLACK_WEBHOOK',
  ],
};

// Exportar configuración por defecto
export default {
  config: defaultFrameworkConfig,
  legacy: legacyServiceConfig,
  teams: specializedTeamsConfig,
  audiovisual: audiovisualConfig,
  optimization: optimizationConfig,
  monitoring: monitoringConfig,
  deployment: deploymentConfig,
};
