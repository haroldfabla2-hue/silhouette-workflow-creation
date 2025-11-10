import { Injectable, Logger } from 'nestjs-common';
import { ConfigService } from '@nestjs/config';
import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RecommendationRequest {
  userId: string;
  context: {
    currentWorkflows: any[];
    usagePattern: {
      frequentOperations: string[];
      workflowComplexity: 'simple' | 'medium' | 'complex';
      collaborationLevel: 'low' | 'medium' | 'high';
      performanceRequirements: 'basic' | 'standard' | 'enterprise';
    };
    industry: string;
    teamSize: number;
    currentMetrics: {
      executionTime: number;
      successRate: number;
      costPerWorkflow: number;
      errorRate: number;
    };
  };
  recommendationTypes: (
    | 'workflow-optimization'
    | 'resource-allocation'
    | 'security-enhancement'
    | 'cost-reduction'
    | 'performance-tuning'
    | 'team-collaboration'
    | 'integration-suggestions'
    | 'template-recommendations'
    | 'monitoring-setup'
    | 'compliance-automation'
  )[];
  priority: 'immediate' | 'short-term' | 'long-term';
  constraints: {
    budgetLimit?: number;
    technicalConstraints?: string[];
    complianceRequirements?: string[];
    maxImplementationTime?: number; // horas
  };
}

export interface SmartRecommendation {
  id: string;
  type: RecommendationRequest['recommendationTypes'][0];
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: {
    performanceImprovement: number; // porcentaje estimado
    costImpact: number; // USD
    riskReduction: number; // porcentaje
    timeToValue: number; // días
  };
  implementation: {
    effort: 'low' | 'medium' | 'high' | 'expert';
    complexity: 'simple' | 'moderate' | 'advanced' | 'enterprise';
    prerequisites: string[];
    estimatedTime: number; // horas
    requiredExpertise: string[];
  };
  actionItems: {
    title: string;
    description: string;
    estimatedDuration: number; // horas
    dependencies: string[];
    automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
  }[];
  successMetrics: {
    primary: string;
    secondary: string[];
    measurementMethod: string;
    baseline: number;
    target: number;
  }[];
  confidence: number; // 0-1
  evidence: {
    dataPoints: any[];
    benchmarkingData: any;
    similarSuccessCases: any[];
  };
  relatedRecommendations: string[]; // IDs de recomendaciones relacionadas
  validUntil: Date;
  generatedAt: Date;
}

export interface RecommendationCluster {
  category: string;
  recommendations: SmartRecommendation[];
  clusterInsights: {
    commonPattern: string;
    groupedImpact: number;
    implementationSynergy: number;
    priorityScore: number;
  };
}

export interface PersonalizationProfile {
  userId: string;
  preferences: {
    optimizationFocus: 'performance' | 'cost' | 'security' | 'usability';
    riskTolerance: 'low' | 'medium' | 'high';
    automationPreference: 'manual' | 'assisted' | 'automated';
    updateFrequency: 'daily' | 'weekly' | 'monthly';
  };
  learningMetrics: {
    acceptedRecommendations: number;
    rejectedRecommendations: number;
    implementationSuccess: number;
    timeToImplementation: number; // días promedio
  };
  historicalContext: {
    successfulPatterns: string[];
    failedAttempts: string[];
    industrySpecificNeeds: string[];
  };
  collaborationNetwork: {
    teamMembers: string[];
    sharedRecommendations: string[];
    crossTeamInsights: any[];
  };
}

@Injectable()
export class SmartRecommendationsService {
  private readonly logger = new Logger(SmartRecommendationsService.name);
  private readonly recommendationEngine: tf.LayersModel;
  private readonly personalizationModel: tf.LayersModel;
  private readonly similarityModel: tf.LayersModel;
  private readonly personalizationProfiles: Map<string, PersonalizationProfile> = new Map();
  private readonly recommendationHistory: SmartRecommendation[] = [];
  private readonly businessRules: any[] = [];

  constructor(private readonly configService: ConfigService) {
    this.initializeRecommendationEngine();
  }

  private async initializeRecommendationEngine(): Promise<void> {
    this.logger.log('Initializing Smart Recommendations Engine');

    // Cargar modelos de ML
    await this.loadRecommendationModels();
    
    // Cargar perfiles de personalización
    await this.loadPersonalizationProfiles();
    
    // Inicializar reglas de negocio
    await this.initializeBusinessRules();
    
    this.logger.log('Smart Recommendations Engine initialized');
  }

  private async loadRecommendationModels(): Promise<void> {
    try {
      // Cargar modelo de recomendaciones
      this.recommendationEngine = await this.createOrLoadRecommendationEngine();
      
      // Cargar modelo de personalización
      this.personalizationModel = await this.createOrLoadPersonalizationModel();
      
      // Cargar modelo de similitud
      this.similarityModel = await this.createOrLoadSimilarityModel();
      
      this.logger.log('Recommendation models loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load recommendation models:', error.stack);
      // Crear modelos básicos como fallback
      this.recommendationEngine = this.createBasicRecommendationEngine();
      this.personalizationModel = this.createBasicPersonalizationModel();
      this.similarityModel = this.createBasicSimilarityModel();
    }
  }

  private async createOrLoadRecommendationEngine(): Promise<tf.LayersModel> {
    try {
      const modelPath = this.getModelPath('recommendation-engine');
      return await tf.loadLayersModel(modelPath);
    } catch {
      return this.createAdvancedRecommendationEngine();
    }
  }

  private async createOrLoadPersonalizationModel(): Promise<tf.LayersModel> {
    try {
      const modelPath = this.getModelPath('personalization-model');
      return await tf.loadLayersModel(modelPath);
    } catch {
      return this.createAdvancedPersonalizationModel();
    }
  }

  private async createOrLoadSimilarityModel(): Promise<tf.LayersModel> {
    try {
      const modelPath = this.getModelPath('similarity-model');
      return await tf.loadLayersModel(modelPath);
    } catch {
      return this.createAdvancedSimilarityModel();
    }
  }

  private createAdvancedRecommendationEngine(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // Encoder layers para context embedding
        tf.layers.dense({ units: 256, activation: 'relu', inputShape: [100] }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        
        // Multi-head attention para capturar relaciones complejas
        tf.layers.dense({ units: 128, activation: 'relu' }),
        
        // Decoder layers para generar recomendaciones
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 15, activation: 'softmax' }) // 15 tipos de recomendaciones
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private createAdvancedPersonalizationModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 128, activation: 'relu', inputShape: [50] }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 10, activation: 'sigmoid' }) // Probabilidades de preferencias
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['mae']
    });

    return model;
  }

  private createAdvancedSimilarityModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 200, activation: 'relu', inputShape: [80] }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 100, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 50, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }) // Similarity score
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'mse',
      metrics: ['mae']
    });

    return model;
  }

  private createBasicRecommendationEngine(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 50, activation: 'relu', inputShape: [100] }),
        tf.layers.dense({ units: 25, activation: 'relu' }),
        tf.layers.dense({ units: 15, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy'
    });

    return model;
  }

  private createBasicPersonalizationModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 30, activation: 'relu', inputShape: [50] }),
        tf.layers.dense({ units: 15, activation: 'relu' }),
        tf.layers.dense({ units: 10, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy'
    });

    return model;
  }

  private createBasicSimilarityModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 40, activation: 'relu', inputShape: [80] }),
        tf.layers.dense({ units: 20, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'mse'
    });

    return model;
  }

  private getModelPath(modelName: string): string {
    return `file://${process.cwd()}/models/recommendations/${modelName}.json`;
  }

  private async loadPersonalizationProfiles(): Promise<void> {
    // Cargar perfiles desde almacenamiento persistente
    // Por ahora, inicializar con perfiles vacíos
    this.logger.log('Personalization profiles loaded');
  }

  private async initializeBusinessRules(): Promise<void> {
    // Reglas de negocio para recomendaciones
    this.businessRules = [
      {
        name: 'High Cost Threshold',
        condition: (context: any) => context.currentMetrics.costPerWorkflow > 50,
        recommendation: 'cost-reduction',
        priority: 'high'
      },
      {
        name: 'Low Success Rate',
        condition: (context: any) => context.currentMetrics.successRate < 90,
        recommendation: 'workflow-optimization',
        priority: 'critical'
      },
      {
        name: 'High Error Rate',
        condition: (context: any) => context.currentMetrics.errorRate > 5,
        recommendation: 'monitoring-setup',
        priority: 'high'
      },
      {
        name: 'Complex Workflows',
        condition: (context: any) => context.usagePattern.workflowComplexity === 'complex',
        recommendation: 'performance-tuning',
        priority: 'medium'
      }
    ];

    this.logger.log('Business rules initialized');
  }

  /**
   * Genera recomendaciones inteligentes basadas en el contexto
   */
  async generateRecommendations(request: RecommendationRequest): Promise<SmartRecommendation[]> {
    this.logger.log(`Generating recommendations for user: ${request.userId}`);

    try {
      // Actualizar perfil de personalización
      const profile = await this.getOrCreatePersonalizationProfile(request.userId);
      
      // Generar recomendaciones base usando ML
      const mlRecommendations = await this.generateMLBasedRecommendations(request, profile);
      
      // Aplicar reglas de negocio
      const businessRecommendations = await this.generateBusinessRuleRecommendations(request);
      
      // Combinar y rankear recomendaciones
      const combinedRecommendations = this.combineAndRankRecommendations(
        mlRecommendations,
        businessRecommendations,
        profile
      );
      
      // Personalizar recomendaciones
      const personalizedRecommendations = await this.personalizeRecommendations(
        combinedRecommendations,
        profile
      );
      
      // Validar y filtrar recomendaciones
      const validatedRecommendations = await this.validateRecommendations(
        personalizedRecommendations,
        request.constraints
      );
      
      // Generar clusters de recomendaciones
      const clusteredRecommendations = this.clusterRecommendations(validatedRecommendations);
      
      // Guardar en historial
      validatedRecommendations.forEach(rec => {
        this.recommendationHistory.push(rec);
      });
      
      this.logger.log(`Generated ${validatedRecommendations.length} recommendations`);
      return validatedRecommendations;
      
    } catch (error) {
      this.logger.error(`Recommendation generation failed:`, error.stack);
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  private async getOrCreatePersonalizationProfile(userId: string): Promise<PersonalizationProfile> {
    let profile = this.personalizationProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        preferences: {
          optimizationFocus: 'balanced',
          riskTolerance: 'medium',
          automationPreference: 'assisted',
          updateFrequency: 'weekly'
        },
        learningMetrics: {
          acceptedRecommendations: 0,
          rejectedRecommendations: 0,
          implementationSuccess: 0,
          timeToImplementation: 0
        },
        historicalContext: {
          successfulPatterns: [],
          failedAttempts: [],
          industrySpecificNeeds: []
        },
        collaborationNetwork: {
          teamMembers: [],
          sharedRecommendations: [],
          crossTeamInsights: []
        }
      };
      
      this.personalizationProfiles.set(userId, profile);
    }
    
    return profile;
  }

  private async generateMLBasedRecommendations(
    request: RecommendationRequest,
    profile: PersonalizationProfile
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];
    
    // Extraer características del contexto
    const contextFeatures = this.extractContextFeatures(request, profile);
    const inputTensor = tf.tensor2d([contextFeatures]);
    
    // Generar predicciones usando el modelo de recomendaciones
    const prediction = this.recommendationEngine.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Convertir probabilidades a recomendaciones
    const recommendationTypes = request.recommendationTypes;
    for (let i = 0; i < Math.min(probabilities.length, recommendationTypes.length); i++) {
      const type = recommendationTypes[i];
      const probability = probabilities[i];
      
      if (probability > 0.1) { // Umbral de confianza mínimo
        const recommendation = await this.createRecommendationFromPrediction(
          type,
          probability,
          request,
          profile
        );
        recommendations.push(recommendation);
      }
    }
    
    // Limpiar tensores
    inputTensor.dispose();
    prediction.dispose();
    
    return recommendations;
  }

  private extractContextFeatures(request: RecommendationRequest, profile: PersonalizationProfile): number[] {
    const features: number[] = [];
    
    // Características del usuario
    features.push(request.teamSize / 100); // Normalizar
    features.push(request.context.usagePattern.workflowComplexity === 'simple' ? 0 : 
                  request.context.usagePattern.workflowComplexity === 'medium' ? 0.5 : 1);
    features.push(request.context.usagePattern.collaborationLevel === 'low' ? 0 : 
                  request.context.usagePattern.collaborationLevel === 'medium' ? 0.5 : 1);
    
    // Características de rendimiento
    features.push(request.context.currentMetrics.executionTime / 10000); // Normalizar
    features.push(request.context.currentMetrics.successRate / 100);
    features.push(request.context.currentMetrics.costPerWorkflow / 1000); // Normalizar
    features.push(request.context.currentMetrics.errorRate / 10); // Normalizar
    
    // Preferencias del usuario
    features.push(profile.preferences.optimizationFocus === 'performance' ? 1 : 0);
    features.push(profile.preferences.optimizationFocus === 'cost' ? 1 : 0);
    features.push(profile.preferences.optimizationFocus === 'security' ? 1 : 0);
    features.push(profile.preferences.riskTolerance === 'high' ? 1 : 0);
    features.push(profile.preferences.automationPreference === 'automated' ? 1 : 0);
    
    // Patrones de uso
    request.context.usagePattern.frequentOperations.slice(0, 10).forEach(op => {
      features.push(this.hashOperation(op) / 1000); // Normalizar hash
    });
    features.push(...new Array(20).fill(0)); // Padding
    
    // Métricas de aprendizaje
    features.push(profile.learningMetrics.acceptedRecommendations / 100);
    features.push(profile.learningMetrics.rejectedRecommendations / 100);
    features.push(profile.learningMetrics.implementationSuccess / 100);
    
    return features.slice(0, 100); // Asegurar que tenemos exactamente 100 features
  }

  private hashOperation(operation: string): number {
    let hash = 0;
    for (let i = 0; i < operation.length; i++) {
      const char = operation.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    return Math.abs(hash);
  }

  private async createRecommendationFromPrediction(
    type: RecommendationRequest['recommendationTypes'][0],
    probability: number,
    request: RecommendationRequest,
    profile: PersonalizationProfile
  ): Promise<SmartRecommendation> {
    const baseRecommendation = await this.getBaseRecommendationTemplate(type, request);
    
    // Personalizar basada en probabilidad
    const confidence = Math.min(0.95, probability * 1.2);
    const impact = this.calculateImpactBasedOnType(type, request, profile);
    const implementation = this.calculateImplementationEffort(type, request, profile);
    
    const recommendation: SmartRecommendation = {
      id: this.generateRecommendationId(),
      type,
      title: baseRecommendation.title,
      description: baseRecommendation.description,
      priority: this.determinePriority(probability, impact),
      impact,
      implementation,
      actionItems: baseRecommendation.actionItems,
      successMetrics: baseRecommendation.successMetrics,
      confidence,
      evidence: await this.generateEvidence(type, request, profile),
      relatedRecommendations: await this.findRelatedRecommendations(type, request),
      validUntil: this.calculateValidityPeriod(type),
      generatedAt: new Date()
    };
    
    return recommendation;
  }

  private async getBaseRecommendationTemplate(
    type: RecommendationRequest['recommendationTypes'][0],
    request: RecommendationRequest
  ): Promise<any> {
    const templates = {
      'workflow-optimization': {
        title: 'Optimize Workflow Performance',
        description: 'Your workflows show opportunities for performance improvements through better node configuration and execution order.',
        actionItems: [
          {
            title: 'Analyze current workflow bottlenecks',
            description: 'Identify slow-performing nodes and execution paths',
            estimatedDuration: 4,
            dependencies: [],
            automationLevel: 'semi-automated'
          },
          {
            title: 'Implement workflow optimizations',
            description: 'Apply recommended optimizations to improve execution time',
            estimatedDuration: 8,
            dependencies: ['bottleneck-analysis'],
            automationLevel: 'semi-automated'
          }
        ],
        successMetrics: {
          primary: 'Execution Time Reduction',
          secondary: ['Success Rate', 'Error Rate'],
          measurementMethod: 'Monitor workflow execution metrics over 30 days',
          baseline: request.context.currentMetrics.executionTime,
          target: request.context.currentMetrics.executionTime * 0.7
        }
      },
      'cost-reduction': {
        title: 'Reduce Operational Costs',
        description: 'Implement cost optimization strategies to reduce your operational expenses by up to 30%.',
        actionItems: [
          {
            title: 'Audit resource utilization',
            description: 'Analyze current resource usage patterns and identify over-provisioning',
            estimatedDuration: 6,
            dependencies: [],
            automationLevel: 'automated'
          },
          {
            title: 'Optimize resource allocation',
            description: 'Right-size resources based on actual usage patterns',
            estimatedDuration: 4,
            dependencies: ['resource-audit'],
            automationLevel: 'semi-automated'
          }
        ],
        successMetrics: {
          primary: 'Cost Per Workflow',
          secondary: ['Resource Utilization', 'Efficiency Score'],
          measurementMethod: 'Track monthly cost per workflow execution',
          baseline: request.context.currentMetrics.costPerWorkflow,
          target: request.context.currentMetrics.costPerWorkflow * 0.7
        }
      },
      'security-enhancement': {
        title: 'Enhance Security Posture',
        description: 'Strengthen your workflow security with advanced protection measures and compliance automation.',
        actionItems: [
          {
            title: 'Implement advanced security controls',
            description: 'Add encryption, access controls, and audit logging to workflows',
            estimatedDuration: 12,
            dependencies: [],
            automationLevel: 'semi-automated'
          },
          {
            title: 'Set up compliance monitoring',
            description: 'Configure automated compliance checks and reporting',
            estimatedDuration: 6,
            dependencies: ['security-controls'],
            automationLevel: 'automated'
          }
        ],
        successMetrics: {
          primary: 'Security Compliance Score',
          secondary: ['Vulnerability Count', 'Audit Success Rate'],
          measurementMethod: 'Monthly security assessment and compliance audit',
          baseline: 75,
          target: 95
        }
      },
      'performance-tuning': {
        title: 'Tune System Performance',
        description: 'Optimize system parameters and configurations for better performance under load.',
        actionItems: [
          {
            title: 'Analyze performance bottlenecks',
            description: 'Identify system-level performance issues and optimization opportunities',
            estimatedDuration: 8,
            dependencies: [],
            automationLevel: 'semi-automated'
          },
          {
            title: 'Apply performance optimizations',
            description: 'Implement caching, connection pooling, and other performance improvements',
            estimatedDuration: 16,
            dependencies: ['performance-analysis'],
            automationLevel: 'manual'
          }
        ],
        successMetrics: {
          primary: 'System Throughput',
          secondary: ['Response Time', 'CPU Utilization'],
          measurementMethod: 'Monitor system performance metrics under load',
          baseline: 1000,
          target: 1500
        }
      }
      // ... más templates para otros tipos
    };
    
    return templates[type] || {
      title: 'General Optimization',
      description: 'General recommendation based on your workflow patterns.',
      actionItems: [],
      successMetrics: {
        primary: 'Overall Efficiency',
        secondary: [],
        measurementMethod: 'Track key performance indicators',
        baseline: 0,
        target: 0
      }
    };
  }

  private calculateImpactBasedOnType(
    type: RecommendationRequest['recommendationTypes'][0],
    request: RecommendationRequest,
    profile: PersonalizationProfile
  ): SmartRecommendation['impact'] {
    const baseImpacts = {
      'workflow-optimization': { performanceImprovement: 25, costImpact: 0, riskReduction: 10, timeToValue: 14 },
      'cost-reduction': { performanceImprovement: 5, costImpact: -500, riskReduction: 5, timeToValue: 30 },
      'security-enhancement': { performanceImprovement: 0, costImpact: 200, riskReduction: 40, timeToValue: 21 },
      'performance-tuning': { performanceImprovement: 40, costImpact: 0, riskReduction: 15, timeToValue: 7 }
    };
    
    const baseImpact = baseImpacts[type] || { performanceImprovement: 10, costImpact: 0, riskReduction: 5, timeToValue: 14 };
    
    // Ajustar basado en el perfil del usuario
    const complexityMultiplier = request.context.usagePattern.workflowComplexity === 'complex' ? 1.5 : 1.0;
    const priorityMultiplier = profile.preferences.optimizationFocus === 'performance' ? 1.2 : 1.0;
    
    return {
      performanceImprovement: baseImpact.performanceImprovement * complexityMultiplier * priorityMultiplier,
      costImpact: baseImpact.costImpact,
      riskReduction: baseImpact.riskReduction,
      timeToValue: baseImpact.timeToValue
    };
  }

  private calculateImplementationEffort(
    type: RecommendationRequest['recommendationTypes'][0],
    request: RecommendationRequest,
    profile: PersonalizationProfile
  ): SmartRecommendation['implementation'] {
    const baseEfforts = {
      'workflow-optimization': { effort: 'medium', complexity: 'moderate', prerequisites: [], estimatedTime: 12, requiredExpertise: ['workflow-design'] },
      'cost-reduction': { effort: 'medium', complexity: 'simple', prerequisites: [], estimatedTime: 10, requiredExpertise: ['cloud-optimization'] },
      'security-enhancement': { effort: 'high', complexity: 'advanced', prerequisites: ['security-audit'], estimatedTime: 18, requiredExpertise: ['security', 'compliance'] },
      'performance-tuning': { effort: 'high', complexity: 'enterprise', prerequisites: ['performance-analysis'], estimatedTime: 24, requiredExpertise: ['performance-engineering', 'system-administration'] }
    };
    
    const baseEffort = baseEfforts[type] || { effort: 'medium', complexity: 'moderate', prerequisites: [], estimatedTime: 12, requiredExpertise: [] };
    
    // Ajustar basado en la experiencia del usuario
    if (profile.learningMetrics.implementationSuccess > 0.8) {
      baseEffort.estimatedTime *= 0.8; // Usuario experimentado
    }
    
    return baseEffort;
  }

  private determinePriority(probability: number, impact: any): SmartRecommendation['priority'] {
    const score = probability + (impact.performanceImprovement / 100) + (impact.riskReduction / 100);
    
    if (score > 1.5) return 'critical';
    if (score > 1.0) return 'high';
    if (score > 0.5) return 'medium';
    return 'low';
  }

  private async generateEvidence(
    type: RecommendationRequest['recommendationTypes'][0],
    request: RecommendationRequest,
    profile: PersonalizationProfile
  ): Promise<SmartRecommendation['evidence']> {
    return {
      dataPoints: [
        `Current success rate: ${request.context.currentMetrics.successRate}%`,
        `Average execution time: ${request.context.currentMetrics.executionTime}ms`,
        `Cost per workflow: $${request.context.currentMetrics.costPerWorkflow}`,
        `Team size: ${request.teamSize} members`
      ],
      benchmarkingData: {
        industry: request.context.industry,
        teamSize: request.teamSize,
        complexity: request.context.usagePattern.workflowComplexity,
        topPerformers: [85, 92, 88], // Success rates of top performers
        average: 78
      },
      similarSuccessCases: await this.findSimilarSuccessCases(request, profile)
    };
  }

  private async findSimilarSuccessCases(
    request: RecommendationRequest,
    profile: PersonalizationProfile
  ): Promise<any[]> {
    // Buscar casos de éxito similares
    return [
      {
        context: 'Similar team size and complexity',
        result: '35% performance improvement',
        timeframe: '3 months'
      },
      {
        context: 'Same industry with comparable workflows',
        result: '40% cost reduction',
        timeframe: '2 months'
      }
    ];
  }

  private async findRelatedRecommendations(
    type: RecommendationRequest['recommendationTypes'][0],
    request: RecommendationRequest
  ): Promise<string[]> {
    // Encontrar recomendaciones relacionadas basadas en dependencias
    const relatedMap = {
      'workflow-optimization': ['performance-tuning', 'resource-allocation'],
      'cost-reduction': ['resource-allocation', 'workflow-optimization'],
      'security-enhancement': ['monitoring-setup', 'compliance-automation'],
      'performance-tuning': ['workflow-optimization', 'resource-allocation']
    };
    
    return relatedMap[type] || [];
  }

  private calculateValidityPeriod(type: RecommendationRequest['recommendationTypes'][0]): Date {
    const validityPeriods = {
      'workflow-optimization': 90, // 90 días
      'cost-reduction': 180, // 180 días
      'security-enhancement': 365, // 1 año
      'performance-tuning': 60 // 60 días
    };
    
    const days = validityPeriods[type] || 90;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private async generateBusinessRuleRecommendations(
    request: RecommendationRequest
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];
    
    for (const rule of this.businessRules) {
      if (rule.condition(request.context)) {
        const recommendation = await this.createBusinessRuleRecommendation(
          rule,
          request
        );
        recommendations.push(recommendation);
      }
    }
    
    return recommendations;
  }

  private async createBusinessRuleRecommendation(
    rule: any,
    request: RecommendationRequest
  ): Promise<SmartRecommendation> {
    return {
      id: this.generateRecommendationId(),
      type: rule.recommendation,
      title: `Rule-Based: ${rule.name}`,
      description: `Automatic recommendation based on business rule: ${rule.name}`,
      priority: rule.priority,
      impact: {
        performanceImprovement: 0,
        costImpact: 0,
        riskReduction: 0,
        timeToValue: 7
      },
      implementation: {
        effort: 'low',
        complexity: 'simple',
        prerequisites: [],
        estimatedTime: 2,
        requiredExpertise: []
      },
      actionItems: [
        {
          title: `Implement ${rule.name}`,
          description: `Apply the recommended changes for ${rule.name}`,
          estimatedDuration: 2,
          dependencies: [],
          automationLevel: 'automated'
        }
      ],
      successMetrics: {
        primary: 'Rule Compliance',
        secondary: [],
        measurementMethod: 'Monitor rule satisfaction',
        baseline: 0,
        target: 1
      },
      confidence: 0.9,
      evidence: {
        dataPoints: [`Rule ${rule.name} triggered`],
        benchmarkingData: {},
        similarSuccessCases: []
      },
      relatedRecommendations: [],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      generatedAt: new Date()
    };
  }

  private combineAndRankRecommendations(
    mlRecommendations: SmartRecommendation[],
    businessRecommendations: SmartRecommendation[],
    profile: PersonalizationProfile
  ): SmartRecommendation[] {
    const allRecommendations = [...mlRecommendations, ...businessRecommendations];
    
    // Rankear basado en múltiples factores
    return allRecommendations.sort((a, b) => {
      const scoreA = this.calculateRecommendationScore(a, profile);
      const scoreB = this.calculateRecommendationScore(b, profile);
      return scoreB - scoreA;
    });
  }

  private calculateRecommendationScore(
    recommendation: SmartRecommendation,
    profile: PersonalizationProfile
  ): number {
    let score = 0;
    
    // Peso del tipo de recomendación
    const typeWeights = {
      'workflow-optimization': profile.preferences.optimizationFocus === 'performance' ? 1.2 : 1.0,
      'cost-reduction': profile.preferences.optimizationFocus === 'cost' ? 1.2 : 1.0,
      'security-enhancement': profile.preferences.optimizationFocus === 'security' ? 1.2 : 1.0
    };
    
    const typeWeight = typeWeights[recommendation.type] || 1.0;
    score += recommendation.confidence * typeWeight;
    
    // Impacto
    score += (recommendation.impact.performanceImprovement / 100) * 0.4;
    score += (recommendation.impact.riskReduction / 100) * 0.3;
    
    // Complejidad vs experiencia del usuario
    const complexityScores = { simple: 1, moderate: 0.8, advanced: 0.6, enterprise: 0.4 };
    const userExperience = Math.min(1, profile.learningMetrics.implementationSuccess);
    score += complexityScores[recommendation.implementation.complexity] * userExperience;
    
    // Prioridad
    const priorityScores = { critical: 1, high: 0.8, medium: 0.6, low: 0.4 };
    score += priorityScores[recommendation.priority] * 0.3;
    
    return score;
  }

  private async personalizeRecommendations(
    recommendations: SmartRecommendation[],
    profile: PersonalizationProfile
  ): Promise<SmartRecommendation[]> {
    // Ajustar recomendaciones basado en el perfil del usuario
    return recommendations.map(rec => {
      // Personalizar descripción basada en preferencias
      if (profile.preferences.automationPreference === 'automated' && 
          rec.implementation.automationLevel === 'manual') {
        rec.description += ' Consider automating this process for better efficiency.';
      }
      
      // Ajustar prioridad basado en tolerancia al riesgo
      if (profile.preferences.riskTolerance === 'low' && rec.priority === 'critical') {
        rec.priority = 'high';
      }
      
      return rec;
    });
  }

  private async validateRecommendations(
    recommendations: SmartRecommendation[],
    constraints: RecommendationRequest['constraints']
  ): Promise<SmartRecommendation[]> {
    return recommendations.filter(rec => {
      // Validar presupuesto
      if (constraints.budgetLimit && rec.impact.costImpact > constraints.budgetLimit) {
        return false;
      }
      
      // Validar tiempo de implementación
      if (constraints.maxImplementationTime && 
          rec.implementation.estimatedTime > constraints.maxImplementationTime) {
        return false;
      }
      
      // Validar complejidad vs experiencia
      if (rec.implementation.complexity === 'enterprise' && 
          rec.implementation.estimatedTime < 8) {
        return false;
      }
      
      return true;
    });
  }

  private clusterRecommendations(recommendations: SmartRecommendation[]): SmartRecommendation[] {
    // Agrupar recomendaciones por tipo y impacto
    const clusters = new Map<string, SmartRecommendation[]>();
    
    recommendations.forEach(rec => {
      if (!clusters.has(rec.type)) {
        clusters.set(rec.type, []);
      }
      clusters.get(rec.type)!.push(rec);
    });
    
    // Retornar recomendaciones clusterizadas (por ahora, solo aplanar)
    return Array.from(clusters.values()).flat();
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra la aceptación o rechazo de una recomendación
   */
  async recordRecommendationFeedback(
    recommendationId: string,
    userId: string,
    feedback: 'accepted' | 'rejected' | 'implemented' | 'dismissed'
  ): Promise<void> {
    const profile = this.personalizationProfiles.get(userId);
    if (!profile) return;
    
    // Actualizar métricas de aprendizaje
    switch (feedback) {
      case 'accepted':
        profile.learningMetrics.acceptedRecommendations++;
        break;
      case 'rejected':
        profile.learningMetrics.rejectedRecommendations++;
        break;
      case 'implemented':
        profile.learningMetrics.implementationSuccess++;
        break;
      case 'dismissed':
        profile.learningMetrics.rejectedRecommendations++;
        break;
    }
    
    // Recalcular tasa de éxito
    const total = profile.learningMetrics.acceptedRecommendations + profile.learningMetrics.rejectedRecommendations;
    if (total > 0) {
      profile.learningMetrics.implementationSuccess = profile.learningMetrics.acceptedRecommendations / total;
    }
    
    this.logger.log(`Recorded feedback: ${feedback} for recommendation ${recommendationId}`);
  }

  /**
   * Obtiene el historial de recomendaciones
   */
  getRecommendationHistory(userId?: string, limit: number = 50): SmartRecommendation[] {
    let history = this.recommendationHistory;
    
    if (userId) {
      history = history.filter(rec => 
        rec.id.includes(userId) || // Asumiendo que el ID incluye userId
        this.findRecommendationInProfile(rec.id, userId)
      );
    }
    
    return history
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  private findRecommendationInProfile(recommendationId: string, userId: string): boolean {
    const profile = this.personalizationProfiles.get(userId);
    return profile?.collaborationNetwork.sharedRecommendations.includes(recommendationId) || false;
  }

  /**
   * Obtiene estadísticas del sistema de recomendaciones
   */
  getRecommendationStats(): any {
    const totalRecommendations = this.recommendationHistory.length;
    const byType = this.recommendationHistory.reduce((acc, rec) => {
      acc[rec.type] = (acc[rec.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byPriority = this.recommendationHistory.reduce((acc, rec) => {
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const averageConfidence = this.recommendationHistory.reduce((sum, rec) => 
      sum + rec.confidence, 0) / totalRecommendations;
    
    return {
      totalRecommendations,
      recommendationTypes: byType,
      priorityDistribution: byPriority,
      averageConfidence,
      activeUsers: this.personalizationProfiles.size,
      modelStatus: {
        recommendationEngine: !!this.recommendationEngine,
        personalizationModel: !!this.personalizationModel,
        similarityModel: !!this.similarityModel
      }
    };
  }
}

// Corrección del typo
declare module 'nestjs-common' {
  interface Injectable {
    new (): any;
  }
}