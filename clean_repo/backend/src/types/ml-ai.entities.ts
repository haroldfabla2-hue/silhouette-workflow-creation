import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Entidad para almacenar modelos de Machine Learning entrenados
 */
@Entity('ml_models')
@Index(['modelType', 'isActive', 'version'])
export class MLModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  modelType: string; // 'workflow-classifier', 'performance-predictor', etc.

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'varchar', length: 20, default: 'production' })
  environment: 'development' | 'staging' | 'production';

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'json' })
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    loss: number;
    valLoss: number;
    trainingTime: number;
    inferenceTime: number;
    memoryUsage: number;
    modelSize: number;
    trainingDate: Date;
    validationDate: Date;
  };

  @Column({ type: 'json' })
  hyperparameters: {
    learningRate: number;
    epochs: number;
    batchSize: number;
    validationSplit: number;
    dropoutRate: number;
    optimizer: string;
    loss: string;
    metrics: string[];
  };

  @Column({ type: 'json' })
  artifacts: {
    modelPath: string;
    metadataPath: string;
    performancePath: string;
    configPath?: string;
  };

  @Column({ type: 'json' })
  trainingData: {
    featureCount: number;
    sampleCount: number;
    labelShape: number[];
    dataQuality: {
      missingValues: number;
      outliers: number;
      classDistribution: Record<string, number>;
    };
  };

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trainedBy: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  modelUrl: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;

  @Column({ type: 'int', default: 0 })
  usageCount: number;
}

/**
 * Entidad para historial de entrenamientos de modelos
 */
@Entity('ml_training_jobs')
@Index(['status', 'modelType', 'createdAt'])
export class MLTrainingJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  modelType: string;

  @Column({ type: 'varchar', length: 50 })
  jobId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'training' | 'completed' | 'failed' | 'cancelled';

  @Column({ type: 'float', default: 0 })
  progress: number; // 0-100

  @Column({ type: 'int', default: 0 })
  currentEpoch: number;

  @Column({ type: 'int', default: 0 })
  totalEpochs: number;

  @Column({ type: 'int', nullable: true })
  estimatedTimeRemaining: number; // en segundos

  @Column({ type: 'json' })
  trainingRequest: {
    hyperparameters: Record<string, any>;
    modelConfig: Record<string, any>;
    dataConfig: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  trainingResults: {
    history: any;
    finalMetrics: any;
    artifacts: Record<string, string>;
    trainingTime: number;
    memoryUsage: number;
  };

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', length: 100 })
  initiatedBy: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;
}

/**
 * Entidad para resultados de optimizaciones
 */
@Entity('optimization_results')
@Index(['workflowId', 'optimizationType', 'createdAt'])
export class OptimizationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  optimizationId: string;

  @Column({ type: 'varchar', length: 100 })
  workflowId: string;

  @Column({ type: 'varchar', length: 50 })
  optimizationType: 'performance' | 'resource' | 'cost' | 'reliability' | 'composite';

  @Column({ type: 'json' })
  originalWorkflow: any;

  @Column({ type: 'json' })
  optimizedWorkflow: any;

  @Column({ type: 'json' })
  improvements: {
    executionTimeReduction: number;
    memoryOptimization: number;
    costReduction: number;
    successRateImprovement: number;
    throughputIncrease: number;
  };

  @Column({ type: 'json' })
  newConfiguration: {
    nodeConfigurations: any[];
    executionOrder: any[];
    resourceAllocation: any[];
    retryStrategies: any[];
  };

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'json' })
  estimatedImpact: {
    shortTerm: {
      executionTimeImprovement: number;
      costReduction: number;
      resourceEfficiency: number;
    };
    longTerm: {
      scalabilityImprovement: number;
      maintenanceCostReduction: number;
      operationalEfficiency: number;
    };
  };

  @Column({ type: 'json' })
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };

  @Column({ type: 'varchar', length: 50 })
  algorithm: 'genetic-algorithm' | 'neural-optimization' | 'particle-swarm' | 'simulated-annealing' | 'mixed';

  @Column({ type: 'json', nullable: true })
  algorithmMetrics: {
    fitnessScore: number;
    convergenceRate: number;
    solutionDiversity: number;
    explorationVsExploitation: number;
    optimizationTime: number;
    iterations: number;
  };

  @Column({ type: 'varchar', length: 100 })
  requestedBy: string;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;
}

/**
 * Entidad para políticas de auto-scaling
 */
@Entity('auto_scaling_policies')
@Index(['name', 'enabled'])
export class AutoScalingPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'json' })
  targetMetrics: {
    primary: string; // 'cpuUtilization', 'memoryUtilization', etc.
    secondary: string[]; // Array de métricas secundarias
  };

  @Column({ type: 'json' })
  thresholds: {
    scaleUp: {
      min: number;
      max: number;
      duration: number; // en segundos
    };
    scaleDown: {
      min: number;
      max: number;
      duration: number; // en segundos
    };
  };

  @Column({ type: 'json' })
  constraints: {
    minInstances: number;
    maxInstances: number;
    minCpuCores: number;
    maxCpuCores: number;
    minMemoryGB: number;
    maxMemoryGB: number;
    budgetLimit?: number;
  };

  @Column({ type: 'json' })
  optimization: {
    costOptimization: boolean;
    performancePriority: number; // 0-1
    costPriority: number; // 0-1
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetService: string;

  @Column({ type: 'varchar', length: 50, default: 'general' })
  environment: 'development' | 'staging' | 'production' | 'general';

  @Column({ type: 'json', nullable: true })
  schedule: {
    enabled: boolean;
    timezone: string;
    schedule: string; // cron expression
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;
}

/**
 * Entidad para acciones de auto-scaling
 */
@Entity('auto_scaling_actions')
@Index(['policyId', 'status', 'createdAt'])
export class AutoScalingAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  actionId: string;

  @Column({ type: 'varchar', length: 100 })
  policyId: string;

  @Column({ type: 'varchar', length: 50 })
  action: 'scale-up' | 'scale-down' | 'scale-out' | 'scale-in' | 'restart';

  @Column({ type: 'json' })
  target: {
    instances?: number;
    cpuCores?: number;
    memoryGB?: number;
    cacheSizeGB?: number;
  };

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'json' })
  impact: {
    performanceImprovement: number;
    costImpact: number;
    estimatedExecutionTime: number;
  };

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

  @Column({ type: 'json', nullable: true })
  executionDetails: {
    startTime?: Date;
    endTime?: Date;
    actualExecutionTime?: number;
    errorMessage?: string;
    rollbackRequired?: boolean;
  };

  @Column({ type: 'varchar', length: 50, default: 'immediate' })
  trigger: 'scheduled' | 'manual' | 'threshold' | 'prediction' | 'alert';

  @Column({ type: 'varchar', length: 100, nullable: true })
  triggeredBy: string;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;
}

/**
 * Entidad para métricas de auto-scaling
 */
@Entity('auto_scaling_metrics')
@Index(['timestamp', 'policyId'])
export class AutoScalingMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  policyId: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'json' })
  metrics: {
    cpuUtilization: number;
    memoryUtilization: number;
    requestRate: number;
    responseTime: number;
    errorRate: number;
    queueDepth: number;
    activeConnections: number;
    throughput: number;
    latencyP95: number;
    latencyP99: number;
  };

  @Column({ type: 'json', nullable: true })
  predictedMetrics: {
    predictedLoad: number;
    confidence: number;
    predictionHorizon: number; // minutos
  };

  @Column({ type: 'varchar', length: 50, nullable: true })
  recommendedAction: 'scale-up' | 'scale-down' | 'maintain' | 'scale-out' | 'scale-in';

  @Column({ type: 'json', nullable: true })
  resourceRecommendations: {
    cpuCores: number;
    memoryGB: number;
    instanceCount: number;
    cacheSizeGB: number;
  };
}

/**
 * Entidad para perfiles de personalización de recomendaciones
 */
@Entity('recommendation_profiles')
@Index(['userId'])
export class RecommendationProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  userId: string;

  @Column({ type: 'json' })
  preferences: {
    optimizationFocus: 'performance' | 'cost' | 'security' | 'usability' | 'balanced';
    riskTolerance: 'low' | 'medium' | 'high';
    automationPreference: 'manual' | 'assisted' | 'automated';
    updateFrequency: 'daily' | 'weekly' | 'monthly';
  };

  @Column({ type: 'json' })
  learningMetrics: {
    acceptedRecommendations: number;
    rejectedRecommendations: number;
    implementationSuccess: number;
    timeToImplementation: number; // días promedio
    averageConfidence: number;
    preferredComplexity: 'simple' | 'moderate' | 'advanced' | 'enterprise';
  };

  @Column({ type: 'json' })
  historicalContext: {
    successfulPatterns: string[];
    failedAttempts: string[];
    industrySpecificNeeds: string[];
    commonWorkflowTypes: string[];
    teamSize: number;
    budgetRange: {
      min: number;
      max: number;
    };
  };

  @Column({ type: 'json' })
  collaborationNetwork: {
    teamMembers: string[];
    sharedRecommendations: string[];
    crossTeamInsights: any[];
    influenceScore: number;
  };

  @Column({ type: 'timestamp' })
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date;
}

/**
 * Entidad para recomendaciones inteligentes generadas
 */
@Entity('smart_recommendations')
@Index(['userId', 'type', 'priority', 'generatedAt'])
export class SmartRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  recommendationId: string;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'workflow-optimization' | 'resource-allocation' | 'security-enhancement' | 'cost-reduction' | 'performance-tuning' | 'team-collaboration' | 'integration-suggestions' | 'template-recommendations' | 'monitoring-setup' | 'compliance-automation';

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20 })
  priority: 'critical' | 'high' | 'medium' | 'low';

  @Column({ type: 'json' })
  impact: {
    performanceImprovement: number;
    costImpact: number;
    riskReduction: number;
    timeToValue: number;
  };

  @Column({ type: 'json' })
  implementation: {
    effort: 'low' | 'medium' | 'high' | 'expert';
    complexity: 'simple' | 'moderate' | 'advanced' | 'enterprise';
    prerequisites: string[];
    estimatedTime: number;
    requiredExpertise: string[];
  };

  @Column({ type: 'json' })
  actionItems: Array<{
    title: string;
    description: string;
    estimatedDuration: number;
    dependencies: string[];
    automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
  }>;

  @Column({ type: 'json' })
  successMetrics: {
    primary: string;
    secondary: string[];
    measurementMethod: string;
    baseline: number;
    target: number;
  };

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'json' })
  evidence: {
    dataPoints: any[];
    benchmarkingData: any;
    similarSuccessCases: any[];
  };

  @Column({ type: 'text', array: true, default: [] })
  relatedRecommendations: string[];

  @Column({ type: 'timestamp' })
  validUntil: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'accepted' | 'rejected' | 'implemented' | 'dismissed' | 'expired';

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  implementedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  feedback: 'accepted' | 'rejected' | 'implemented' | 'dismissed';

  @Column({ type: 'text', nullable: true })
  feedbackNotes: string;

  @Column({ type: 'varchar', length: 50, default: 'ai-generated' })
  source: 'ai-generated' | 'business-rule' | 'manual' | 'collaboration';

  @Column({ type: 'json', nullable: true })
  context: {
    workflowId?: string;
    currentMetrics: any;
    userContext: any;
  };

  @CreateDateColumn()
  generatedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Entidad para feedback y aprendizaje de las recomendaciones
 */
@Entity('recommendation_feedback')
@Index(['recommendationId', 'userId', 'createdAt'])
export class RecommendationFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  recommendationId: string;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  feedback: 'accepted' | 'rejected' | 'implemented' | 'dismissed' | 'helpful' | 'not-helpful';

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'int', nullable: true })
  rating: number; // 1-5 scale

  @Column({ type: 'int', nullable: true })
  timeToImplementation: number; // días

  @Column({ type: 'json', nullable: true })
  implementationDetails: {
    actualTime: number;
    challenges: string[];
    benefits: string[];
    automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
  };

  @Column({ type: 'varchar', length: 50, nullable: true })
  context: 'immediate' | 'short-term' | 'long-term';

  @CreateDateColumn()
  createdAt: Date;
}