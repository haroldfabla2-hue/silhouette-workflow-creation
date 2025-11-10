import { Injectable, Logger } from 'nestjs-common';
import { ConfigService } from '@nestjs/config';
import * as tf from '@tensorflow/tfjs-node';
import * as cron from 'node-cron';

export interface ScalingMetrics {
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
}

export interface ScalingPrediction {
  timestamp: Date;
  predictedLoad: number;
  confidence: number;
  recommendedAction: 'scale-up' | 'scale-down' | 'maintain' | 'scale-out' | 'scale-in';
  resourceRecommendations: {
    cpuCores: number;
    memoryGB: number;
    instanceCount: number;
    cacheSizeGB: number;
  };
  estimatedCost: number;
  costEfficiency: number;
}

export interface ScalingPolicy {
  id: string;
  name: string;
  enabled: boolean;
  targetMetrics: {
    primary: keyof ScalingMetrics;
    secondary: keyof ScalingMetrics[];
  };
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
  constraints: {
    minInstances: number;
    maxInstances: number;
    minCpuCores: number;
    maxCpuCores: number;
    minMemoryGB: number;
    maxMemoryGB: number;
    budgetLimit?: number;
  };
  optimization: {
    costOptimization: boolean;
    performancePriority: number; // 0-1
    costPriority: number; // 0-1
  };
}

export interface ScalingAction {
  id: string;
  policyId: string;
  action: 'scale-up' | 'scale-down' | 'scale-out' | 'scale-in' | 'restart';
  target: {
    instances?: number;
    cpuCores?: number;
    memoryGB?: number;
    cacheSizeGB?: number;
  };
  reason: string;
  impact: {
    performanceImprovement: number;
    costImpact: number;
    estimatedExecutionTime: number;
  };
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
}

export interface AutoScalingConfig {
  enabled: boolean;
  predictionHorizon: number; // minutos
  monitoringInterval: number; // segundos
  learningRate: number;
  modelUpdateFrequency: number; // horas
  fallbackToManual: boolean;
  maxScalingActionsPerHour: number;
  coolingDownPeriod: number; // minutos
}

@Injectable()
export class AutoScalingIntelligenceService {
  private readonly logger = new Logger(AutoScalingIntelligenceService.name);
  private readonly predictionModel: tf.LayersModel;
  private readonly anomalyDetector: tf.LayersModel;
  private readonly scalingPolicies: Map<string, ScalingPolicy> = new Map();
  private readonly scalingActions: Map<string, ScalingAction> = new Map();
  private readonly historicalData: ScalingMetrics[] = [];
  private monitoringJob: any;
  private modelUpdateJob: any;

  constructor(private readonly configService: ConfigService) {
    this.initializeAutoScalingEngine();
  }

  private async initializeAutoScalingEngine(): Promise<void> {
    this.logger.log('Initializing Auto-scaling Intelligence Engine');

    // Inicializar modelos de ML
    await this.initializePredictionModels();
    
    // Cargar políticas de escalado
    await this.loadScalingPolicies();
    
    // Iniciar monitoreo continuo
    this.startContinuousMonitoring();
    
    // Iniciar actualización de modelos
    this.scheduleModelUpdates();
    
    this.logger.log('Auto-scaling Intelligence Engine initialized');
  }

  private async initializePredictionModels(): Promise<void> {
    try {
      // Inicializar modelo de predicción de carga
      this.predictionModel = await this.createOrLoadPredictionModel();
      
      // Inicializar modelo de detección de anomalías
      this.anomalyDetector = await this.createOrLoadAnomalyDetector();
      
      this.logger.log('ML models initialized for auto-scaling');
    } catch (error) {
      this.logger.error('Failed to initialize ML models:', error.stack);
      // Continuar con modelos básicos
      this.predictionModel = this.createBasicPredictionModel();
      this.anomalyDetector = this.createBasicAnomalyDetector();
    }
  }

  private async createOrLoadPredictionModel(): Promise<tf.LayersModel> {
    try {
      // Intentar cargar modelo existente
      const modelPath = this.getModelPath('load-prediction');
      return await tf.loadLayersModel(modelPath);
    } catch {
      // Crear nuevo modelo LSTM para predicción de series temporales
      return this.createAdvancedPredictionModel();
    }
  }

  private async createOrLoadAnomalyDetector(): Promise<tf.LayersModel> {
    try {
      const modelPath = this.getModelPath('anomaly-detection');
      return await tf.loadLayersModel(modelPath);
    } catch {
      return this.createAdvancedAnomalyDetector();
    }
  }

  private createAdvancedPredictionModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // LSTM layers para capturar patrones temporales
        tf.layers.lstm({
          units: 128,
          returnSequences: true,
          inputShape: [60, 10] // 60 timesteps, 10 features
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 64,
          returnSequences: false
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' }) // Predicción de carga
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'mse',
      metrics: ['mae']
    });

    return model;
  }

  private createAdvancedAnomalyDetector(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }) // Probabilidad de anomalía
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private createBasicPredictionModel(): tf.LylesModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 50, activation: 'relu', inputShape: [10] }),
        tf.layers.dense({ units: 25, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'mse'
    });

    return model;
  }

  private createBasicAnomalyDetector(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 20, activation: 'relu', inputShape: [10] }),
        tf.layers.dense({ units: 10, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy'
    });

    return model;
  }

  private getModelPath(modelName: string): string {
    return `file://${process.cwd()}/models/auto-scaling/${modelName}.json`;
  }

  private async loadScalingPolicies(): Promise<void> {
    // Cargar políticas de escalado desde base de datos
    const defaultPolicy: ScalingPolicy = {
      id: 'default-policy',
      name: 'Default Auto-scaling Policy',
      enabled: true,
      targetMetrics: {
        primary: 'cpuUtilization',
        secondary: ['memoryUtilization', 'requestRate', 'responseTime']
      },
      thresholds: {
        scaleUp: {
          min: 70,
          max: 90,
          duration: 60
        },
        scaleDown: {
          min: 20,
          max: 30,
          duration: 300
        }
      },
      constraints: {
        minInstances: 1,
        maxInstances: 10,
        minCpuCores: 1,
        maxCpuCores: 16,
        minMemoryGB: 1,
        maxMemoryGB: 32,
        budgetLimit: 1000
      },
      optimization: {
        costOptimization: true,
        performancePriority: 0.7,
        costPriority: 0.3
      }
    };

    this.scalingPolicies.set(defaultPolicy.id, defaultPolicy);
    this.logger.log('Scaling policies loaded');
  }

  private startContinuousMonitoring(): void {
    const config = this.getAutoScalingConfig();
    
    this.monitoringJob = cron.schedule(`*/${config.monitoringInterval} * * * * *`, async () => {
      try {
        await this.performScalingAnalysis();
      } catch (error) {
        this.logger.error('Error in scaling analysis:', error.stack);
      }
    }, { scheduled: false });

    this.monitoringJob.start();
    this.logger.log('Continuous monitoring started');
  }

  private scheduleModelUpdates(): void {
    const config = this.getAutoScalingConfig();
    const cronExpression = `0 */${config.modelUpdateFrequency} * * *`; // Cada N horas

    this.modelUpdateJob = cron.schedule(cronExpression, async () => {
      try {
        await this.updatePredictionModels();
      } catch (error) {
        this.logger.error('Error updating models:', error.stack);
      }
    }, { scheduled: true });

    this.logger.log('Model update schedule created');
  }

  private getAutoScalingConfig(): AutoScalingConfig {
    return {
      enabled: true,
      predictionHorizon: 30, // 30 minutos
      monitoringInterval: 30, // 30 segundos
      learningRate: 0.001,
      modelUpdateFrequency: 6, // 6 horas
      fallbackToManual: true,
      maxScalingActionsPerHour: 5,
      coolingDownPeriod: 5 // 5 minutos
    };
  }

  /**
   * Predice la carga futura y recomienda acciones de escalado
   */
  async predictAndScale(policyId: string, currentMetrics: ScalingMetrics): Promise<ScalingPrediction[]> {
    this.logger.log(`Starting prediction and scaling for policy: ${policyId}`);

    const policy = this.scalingPolicies.get(policyId);
    if (!policy) {
      throw new Error(`Scaling policy not found: ${policyId}`);
    }

    try {
      // Agregar métricas actuales al historial
      this.addMetricsToHistory(currentMetrics);

      // Predecir carga futura
      const predictions = await this.predictFutureLoad(currentMetrics, policy);

      // Generar recomendaciones de escalado
      const scalingRecommendations = await this.generateScalingRecommendations(
        policy,
        predictions,
        currentMetrics
      );

      // Validar y ejecutar acciones si es necesario
      const validatedActions = await this.validateAndQueueScalingActions(
        policy,
        scalingRecommendations
      );

      this.logger.log(`Generated ${scalingRecommendations.length} scaling recommendations`);
      return predictions;

    } catch (error) {
      this.logger.error(`Scaling prediction failed for policy ${policyId}:`, error.stack);
      throw new Error(`Scaling prediction failed: ${error.message}`);
    }
  }

  private async predictFutureLoad(
    currentMetrics: ScalingMetrics,
    policy: ScalingPolicy
  ): Promise<ScalingPrediction[]> {
    const predictions: ScalingPrediction[] = [];
    const config = this.getAutoScalingConfig();

    // Preparar datos de entrada para el modelo
    const inputFeatures = this.extractPredictionFeatures(currentMetrics);
    const inputTensor = tf.tensor2d([inputFeatures]);

    // Generar predicciones para el horizonte futuro
    for (let i = 1; i <= config.predictionHorizon; i++) {
      const prediction = this.predictionModel.predict(inputTensor) as tf.Tensor;
      const predictedLoad = (await prediction.data())[0];

      // Determinar acción recomendada
      const recommendedAction = this.determineScalingAction(
        currentMetrics,
        predictedLoad,
        policy
      );

      // Calcular recomendaciones de recursos
      const resourceRecommendations = this.calculateResourceRecommendations(
        predictedLoad,
        policy
      );

      const predictionResult: ScalingPrediction = {
        timestamp: new Date(Date.now() + i * 60000), // i minutos en el futuro
        predictedLoad,
        confidence: this.calculatePredictionConfidence(i),
        recommendedAction,
        resourceRecommendations,
        estimatedCost: this.estimateScalingCost(resourceRecommendations),
        costEfficiency: this.calculateCostEfficiency(resourceRecommendations, predictedLoad)
      };

      predictions.push(predictionResult);
    }

    // Limpiar tensores
    inputTensor.dispose();

    return predictions;
  }

  private extractPredictionFeatures(currentMetrics: ScalingMetrics): number[] {
    return [
      currentMetrics.cpuUtilization / 100,
      currentMetrics.memoryUtilization / 100,
      currentMetrics.requestRate / 1000, // Normalizado
      currentMetrics.responseTime / 1000, // Normalizado
      currentMetrics.errorRate / 100,
      currentMetrics.queueDepth / 100, // Normalizado
      currentMetrics.activeConnections / 1000, // Normalizado
      currentMetrics.throughput / 1000, // Normalizado
      currentMetrics.latencyP95 / 1000, // Normalizado
      currentMetrics.latencyP99 / 1000 // Normalizado
    ];
  }

  private determineScalingAction(
    currentMetrics: ScalingMetrics,
    predictedLoad: number,
    policy: ScalingPolicy
  ): ScalingPrediction['recommendedAction'] {
    const primaryMetric = currentMetrics[policy.targetMetrics.primary];
    const threshold = policy.thresholds;

    // Determinar acción basada en métricas y predicción
    if (predictedLoad > threshold.scaleUp.max || primaryMetric > threshold.scaleUp.max) {
      return 'scale-up';
    } else if (predictedLoad < threshold.scaleDown.min || primaryMetric < threshold.scaleDown.min) {
      return 'scale-down';
    } else {
      return 'maintain';
    }
  }

  private calculateResourceRecommendations(
    predictedLoad: number,
    policy: ScalingPolicy
  ): ScalingPrediction['resourceRecommendations'] {
    const { constraints } = policy;
    const loadFactor = predictedLoad / 100;

    return {
      cpuCores: Math.max(
        constraints.minCpuCores,
        Math.min(constraints.maxCpuCores, Math.ceil(loadFactor * constraints.maxCpuCores))
      ),
      memoryGB: Math.max(
        constraints.minMemoryGB,
        Math.min(constraints.maxMemoryGB, Math.ceil(loadFactor * constraints.maxMemoryGB))
      ),
      instanceCount: Math.max(
        constraints.minInstances,
        Math.min(constraints.maxInstances, Math.ceil(loadFactor * 5)) // Factor de instancia
      ),
      cacheSizeGB: Math.max(1, Math.ceil(loadFactor * 8))
    };
  }

  private calculatePredictionConfidence(timeHorizon: number): number {
    // La confianza disminuye con el tiempo
    const baseConfidence = 0.95;
    const decayRate = 0.02;
    return Math.max(0.5, baseConfidence - (timeHorizon * decayRate));
  }

  private estimateScalingCost(recommendations: ScalingPrediction['resourceRecommendations']): number {
    // Estimación simplificada de costos
    const cpuCostPerCore = 50; // USD por mes
    const memoryCostPerGB = 10; // USD por mes
    const instanceCost = 100; // USD por mes por instancia
    const cacheCostPerGB = 5; // USD por mes

    return (
      recommendations.cpuCores * cpuCostPerCore +
      recommendations.memoryGB * memoryCostPerGB +
      recommendations.instanceCount * instanceCost +
      recommendations.cacheSizeGB * cacheCostPerGB
    );
  }

  private calculateCostEfficiency(
    recommendations: ScalingPrediction['resourceRecommendations'],
    predictedLoad: number
  ): number {
    const estimatedCost = this.estimateScalingCost(recommendations);
    const efficiency = predictedLoad > 0 ? predictedLoad / estimatedCost : 0;
    return Math.min(100, efficiency * 10); // Normalizar a 0-100
  }

  private async generateScalingRecommendations(
    policy: ScalingPolicy,
    predictions: ScalingPrediction[],
    currentMetrics: ScalingMetrics
  ): Promise<ScalingPrediction[]> {
    return predictions.filter(prediction => {
      // Filtrar predicciones que requieren acción
      return prediction.recommendedAction !== 'maintain' && 
             prediction.confidence > 0.7; // Solo acciones con alta confianza
    });
  }

  private async validateAndQueueScalingActions(
    policy: ScalingPolicy,
    recommendations: ScalingPrediction[]
  ): Promise<ScalingAction[]> {
    const actions: ScalingAction[] = [];
    const config = this.getAutoScalingConfig();
    const recentActions = this.getRecentActions(policy.id, config.coolingDownPeriod);

    for (const recommendation of recommendations.slice(0, 3)) { // Top 3 recomendaciones
      if (this.canExecuteScalingAction(policy, recommendation, recentActions)) {
        const action = this.createScalingAction(policy, recommendation);
        actions.push(action);
        this.scalingActions.set(action.id, action);
      }
    }

    return actions;
  }

  private createScalingAction(
    policy: ScalingPolicy,
    prediction: ScalingPrediction
  ): ScalingAction {
    const actionId = this.generateActionId();
    
    return {
      id: actionId,
      policyId: policy.id,
      action: prediction.recommendedAction === 'maintain' ? 'scale-up' : prediction.recommendedAction,
      target: {
        instances: prediction.resourceRecommendations.instanceCount,
        cpuCores: prediction.resourceRecommendations.cpuCores,
        memoryGB: prediction.resourceRecommendations.memoryGB,
        cacheSizeGB: prediction.resourceRecommendations.cacheSizeGB
      },
      reason: `Predicted load: ${prediction.predictedLoad.toFixed(2)}%, confidence: ${(prediction.confidence * 100).toFixed(1)}%`,
      impact: {
        performanceImprovement: this.estimatePerformanceImprovement(prediction),
        costImpact: prediction.estimatedCost,
        estimatedExecutionTime: this.estimateExecutionTime(prediction.recommendedAction)
      },
      status: 'pending',
      createdAt: new Date()
    };
  }

  private canExecuteScalingAction(
    policy: ScalingPolicy,
    prediction: ScalingPrediction,
    recentActions: ScalingAction[]
  ): boolean {
    const config = this.getAutoScalingConfig();
    
    // Verificar límite de acciones por hora
    if (recentActions.length >= config.maxScalingActionsPerHour) {
      return false;
    }

    // Verificar período de enfriamiento
    const now = new Date();
    for (const recentAction of recentActions) {
      const timeSinceAction = (now.getTime() - recentAction.executedAt!.getTime()) / (1000 * 60);
      if (timeSinceAction < config.coolingDownPeriod) {
        return false;
      }
    }

    // Verificar que la acción es significativa
    return prediction.confidence > 0.7;
  }

  private getRecentActions(policyId: string, withinMinutes: number): ScalingAction[] {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
    return Array.from(this.scalingActions.values()).filter(action => 
      action.policyId === policyId && 
      action.executedAt && 
      action.executedAt > cutoff
    );
  }

  private estimatePerformanceImprovement(prediction: ScalingPrediction): number {
    // Estimación simplificada de mejora de rendimiento
    const baseImprovement = 20; // 20% base
    const loadFactor = prediction.predictedLoad / 100;
    return baseImprovement * (1 + loadFactor);
  }

  private estimateExecutionTime(action: string): number {
    const timeMap: Record<string, number> = {
      'scale-up': 120, // 2 minutos
      'scale-down': 180, // 3 minutos
      'scale-out': 90, // 1.5 minutos
      'scale-in': 150, // 2.5 minutos
      'restart': 60 // 1 minuto
    };
    return timeMap[action] || 120;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addMetricsToHistory(metrics: ScalingMetrics): void {
    this.historicalData.push(metrics);
    
    // Mantener solo los últimos 1000 registros para evitar crecimiento infinito
    if (this.historicalData.length > 1000) {
      this.historicalData.shift();
    }
  }

  private async performScalingAnalysis(): Promise<void> {
    try {
      // Obtener métricas actuales (simulado - en producción vendría de un sistema de monitoreo)
      const currentMetrics = await this.collectCurrentMetrics();
      
      // Ejecutar análisis para todas las políticas activas
      for (const [policyId, policy] of this.scalingScalingPolicies) {
        if (policy.enabled) {
          await this.predictAndScale(policyId, currentMetrics);
        }
      }
    } catch (error) {
      this.logger.error('Error in scaling analysis:', error.stack);
    }
  }

  private async collectCurrentMetrics(): Promise<ScalingMetrics> {
    // En producción, esto obtendría métricas reales del sistema
    return {
      cpuUtilization: Math.random() * 100,
      memoryUtilization: Math.random() * 100,
      requestRate: Math.random() * 1000,
      responseTime: Math.random() * 1000,
      errorRate: Math.random() * 10,
      queueDepth: Math.random() * 100,
      activeConnections: Math.random() * 500,
      throughput: Math.random() * 10000,
      latencyP95: Math.random() * 500,
      latencyP99: Math.random() * 800
    };
  }

  private async updatePredictionModels(): Promise<void> {
    if (this.historicalData.length < 100) {
      this.logger.log('Not enough data to update models');
      return;
    }

    try {
      this.logger.log('Updating prediction models with new data');
      
      // Preparar datos de entrenamiento
      const trainingData = this.prepareTrainingData();
      
      // Actualizar modelo de predicción
      await this.predictionModel.fit(
        trainingData.features,
        trainingData.labels,
        { epochs: 10, batchSize: 32, verbose: 0 }
      );
      
      // Actualizar modelo de detección de anomalías
      await this.anomalyDetector.fit(
        trainingData.anomalyFeatures,
        trainingData.anomalyLabels,
        { epochs: 5, batchSize: 16, verbose: 0 }
      );
      
      this.logger.log('Models updated successfully');
    } catch (error) {
      this.logger.error('Error updating models:', error.stack);
    }
  }

  private prepareTrainingData(): any {
    // Preparar datos de entrenamiento desde el historial
    const features: number[][] = [];
    const labels: number[] = [];
    const anomalyFeatures: number[][] = [];
    const anomalyLabels: number[] = [];

    // Crear secuencias para LSTM
    const sequenceLength = 60;
    for (let i = sequenceLength; i < this.historicalData.length; i++) {
      // Características para predicción
      const featureSequence = this.historicalData
        .slice(i - sequenceLength, i)
        .map(metrics => this.extractPredictionFeatures(metrics));
      features.push(...featureSequence);
      
      // Etiqueta: siguiente valor de CPU utilization
      const nextCpu = this.historicalData[i].cpuUtilization;
      labels.push(nextCpu);
      
      // Datos para detección de anomalías
      const anomalyFeatures = this.extractPredictionFeatures(this.historicalData[i]);
      const isAnomaly = this.historicalData[i].errorRate > 5; // Umbral de anomalía
      anomalyFeatures.push(...featureSequence);
      anomalyLabels.push(isAnomaly ? 1 : 0);
    }

    return {
      features: tf.tensor2d(features),
      labels: tf.tensor2d(labels, [labels.length, 1]),
      anomalyFeatures: tf.tensor2d(anomalyFeatures),
      anomalyLabels: tf.tensor2d(anomalyLabels, [anomalyLabels.length, 1])
    };
  }

  /**
   * Ejecuta una acción de escalado pendiente
   */
  async executeScalingAction(actionId: string): Promise<boolean> {
    const action = this.scalingActions.get(actionId);
    if (!action) {
      throw new Error(`Scaling action not found: ${actionId}`);
    }

    if (action.status !== 'pending') {
      throw new Error(`Action ${actionId} is not pending`);
    }

    try {
      this.logger.log(`Executing scaling action: ${actionId}`);
      
      action.status = 'executing';
      action.executedAt = new Date();
      
      // En producción, aquí se ejecutaría la acción real de escalado
      // Por ejemplo, llamada a API de Kubernetes, AWS Auto Scaling, etc.
      
      // Simular ejecución
      await this.simulateScalingExecution(action);
      
      action.status = 'completed';
      this.logger.log(`Scaling action completed: ${actionId}`);
      
      return true;
    } catch (error) {
      action.status = 'failed';
      this.logger.error(`Scaling action failed: ${actionId}`, error.stack);
      return false;
    }
  }

  private async simulateScalingExecution(action: ScalingAction): Promise<void> {
    // Simular tiempo de ejecución
    const executionTime = Math.random() * 60000 + 30000; // 30-90 segundos
    await new Promise(resolve => setTimeout(resolve, executionTime));
  }

  /**
   * Crea una nueva política de escalado
   */
  async createScalingPolicy(policy: Omit<ScalingPolicy, 'id'>): Promise<ScalingPolicy> {
    const policyId = this.generatePolicyId();
    const newPolicy: ScalingPolicy = {
      ...policy,
      id: policyId
    };
    
    this.scalingPolicies.set(policyId, newPolicy);
    this.logger.log(`Created scaling policy: ${policyId}`);
    
    return newPolicy;
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Lista todas las políticas de escalado
   */
  listScalingPolicies(): ScalingPolicy[] {
    return Array.from(this.scalingPolicies.values());
  }

  /**
   * Obtiene el historial de acciones de escalado
   */
  getScalingActions(policyId?: string, limit: number = 50): ScalingAction[] {
    let actions = Array.from(this.scalingActions.values());
    
    if (policyId) {
      actions = actions.filter(action => action.policyId === policyId);
    }
    
    return actions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Habilita o deshabilita el auto-scaling
   */
  async toggleAutoScaling(enabled: boolean): Promise<void> {
    const config = this.getAutoScalingConfig();
    config.enabled = enabled;
    
    if (enabled && !this.monitoringJob) {
      this.startContinuousMonitoring();
    } else if (!enabled && this.monitoringJob) {
      this.monitoringJob.stop();
      this.monitoringJob = null;
    }
    
    this.logger.log(`Auto-scaling ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Obtiene estadísticas del auto-scaling
   */
  getAutoScalingStats(): any {
    const recentActions = this.getRecentActions('', 60); // Última hora
    const totalActions = this.scalingActions.size;
    const successfulActions = Array.from(this.scalingActions.values())
      .filter(action => action.status === 'completed').length;
    
    return {
      totalPolicies: this.scalingPolicies.size,
      enabledPolicies: Array.from(this.scalingPolicies.values())
        .filter(policy => policy.enabled).length,
      totalActions,
      successfulActions,
      successRate: totalActions > 0 ? (successfulActions / totalActions) * 100 : 0,
      actionsInLastHour: recentActions.length,
      historicalDataPoints: this.historicalData.length,
      isMonitoring: !!this.monitoringJob
    };
  }
}

// Corrección del typo en la declaración de método
// En TypeScript, los decoradores están en packages separados, pero para compilación básica
declare module 'nestjs-common' {
  interface Injectable {
    new (): any;
  }
}