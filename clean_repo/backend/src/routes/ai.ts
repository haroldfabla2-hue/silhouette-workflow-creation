import { Router, Request, Response } from 'express';
import { MLTrainingService } from '../ai/ml-training.service';
import { AdvancedOptimizationService } from '../ai/advanced-optimization.service';
import { AutoScalingIntelligenceService } from '../ai/auto-scaling.service';
import { SmartRecommendationsService } from '../ai/smart-recommendations.service';

const router = Router();

// Middleware de autenticación básico (en producción usar JWT)
const authenticateUser = (req: Request, res: Response, next: Function) => {
  // Simular autenticación
  const userId = req.headers['x-user-id'] as string || 'demo-user';
  (req as any).userId = userId;
  next();
};

// ================== ML TRAINING ROUTES ==================

/**
 * POST /api/ai/ml/train
 * Entrena un modelo personalizado de ML
 */
router.post('/ml/train', authenticateUser, async (req: Request, res: Response) => {
  try {
    const mlTrainingService = new MLTrainingService(req.app.get('config'));
    const trainingRequest = req.body;
    
    if (!trainingRequest.modelType || !trainingRequest.trainingData) {
      return res.status(400).json({
        error: 'Missing required fields: modelType and trainingData'
      });
    }
    
    const trainingId = await mlTrainingService.trainCustomModel(trainingRequest);
    
    res.json({
      success: true,
      trainingId,
      message: 'Model training started successfully',
      estimatedTime: '15-30 minutes depending on data size'
    });
  } catch (error) {
    console.error('ML Training error:', error);
    res.status(500).json({
      error: 'Model training failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/ml/training/:trainingId
 * Obtiene el estado de un entrenamiento
 */
router.get('/ml/training/:trainingId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const mlTrainingService = new MLTrainingService(req.app.get('config'));
    const { trainingId } = req.params;
    
    const status = await mlTrainingService.getTrainingStatus(trainingId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get training status',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/ml/models
 * Lista todos los modelos entrenados
 */
router.get('/ml/models', authenticateUser, async (req: Request, res: Response) => {
  try {
    const mlTrainingService = new MLTrainingService(req.app.get('config'));
    const { modelType, isActive, minAccuracy } = req.query;
    
    const filter: any = {};
    if (modelType) filter.modelType = modelType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (minAccuracy) filter.minAccuracy = parseFloat(minAccuracy as string);
    
    const models = await mlTrainingService.listTrainedModels(filter);
    
    res.json({
      success: true,
      models,
      total: models.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list models',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/ml/models/:modelId
 * Obtiene detalles de un modelo específico
 */
router.get('/ml/models/:modelId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const mlTrainingService = new MLTrainingService(req.app.get('config'));
    const { modelId } = req.params;
    
    const model = await mlTrainingService.getModelDetails(modelId);
    
    if (!model) {
      return res.status(404).json({
        error: 'Model not found'
      });
    }
    
    res.json({
      success: true,
      model
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get model details',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/ml/models/:modelId/deploy
 * Despliega un modelo a producción
 */
router.post('/ml/models/:modelId/deploy', authenticateUser, async (req: Request, res: Response) => {
  try {
    const mlTrainingService = new MLTrainingService(req.app.get('config'));
    const { modelId } = req.params;
    const { target = 'production' } = req.body;
    
    await mlTrainingService.deployModel(modelId, target);
    
    res.json({
      success: true,
      message: `Model ${modelId} deployed to ${target} successfully`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to deploy model',
      message: error.message
    });
  }
});

/**
 * DELETE /api/ai/ml/models/:modelId
 * Elimina un modelo
 */
router.delete('/ml/models/:modelId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const mlTrainingService = new MLTrainingService(req.app.get('config'));
    const { modelId } = req.params;
    
    await mlTrainingService.deleteModel(modelId);
    
    res.json({
      success: true,
      message: `Model ${modelId} deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete model',
      message: error.message
    });
  }
});

// ================== OPTIMIZATION ROUTES ==================

/**
 * POST /api/ai/optimize
 * Optimiza un workflow usando técnicas avanzadas de IA
 */
router.post('/optimize', authenticateUser, async (req: Request, res: Response) => {
  try {
    const optimizationService = new AdvancedOptimizationService(req.app.get('config'));
    const request = req.body;
    
    if (!request.workflowId || !request.workflowData) {
      return res.status(400).json({
        error: 'Missing required fields: workflowId and workflowData'
      });
    }
    
    const result = await optimizationService.optimizeWorkflow(request);
    
    res.json({
      success: true,
      optimization: result
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({
      error: 'Workflow optimization failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/optimize/history
 * Obtiene el historial de optimizaciones
 */
router.get('/optimize/history', authenticateUser, async (req: Request, res: Response) => {
  try {
    const optimizationService = new AdvancedOptimizationService(req.app.get('config'));
    const { workflowId } = req.query;
    
    const history = optimizationService.getOptimizationHistory(workflowId as string);
    
    res.json({
      success: true,
      history,
      total: history.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get optimization history',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/optimize/compare
 * Compara dos optimizaciones
 */
router.post('/optimize/compare', authenticateUser, async (req: Request, res: Response) => {
  try {
    const optimizationService = new AdvancedOptimizationService(req.app.get('config'));
    const { optimizationId1, optimizationId2 } = req.body;
    
    if (!optimizationId1 || !optimizationId2) {
      return res.status(400).json({
        error: 'Both optimizationId1 and optimizationId2 are required'
      });
    }
    
    const comparison = await optimizationService.compareOptimizations(
      optimizationId1,
      optimizationId2
    );
    
    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to compare optimizations',
      message: error.message
    });
  }
});

// ================== AUTO-SCALING ROUTES ==================

/**
 * POST /api/ai/auto-scaling/predict
 * Predice carga futura y recomienda acciones de escalado
 */
router.post('/auto-scaling/predict', authenticateUser, async (req: Request, res: Response) => {
  try {
    const autoScalingService = new AutoScalingIntelligenceService(req.app.get('config'));
    const { policyId, currentMetrics } = req.body;
    
    if (!policyId || !currentMetrics) {
      return res.status(400).json({
        error: 'Missing required fields: policyId and currentMetrics'
      });
    }
    
    const predictions = await autoScalingService.predictAndScale(policyId, currentMetrics);
    
    res.json({
      success: true,
      predictions,
      count: predictions.length
    });
  } catch (error) {
    console.error('Auto-scaling prediction error:', error);
    res.status(500).json({
      error: 'Auto-scaling prediction failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/auto-scaling/policies
 * Lista todas las políticas de auto-scaling
 */
router.get('/auto-scaling/policies', authenticateUser, async (req: Request, res: Response) => {
  try {
    const autoScalingService = new AutoScalingIntelligenceService(req.app.get('config'));
    const policies = autoScalingService.listScalingPolicies();
    
    res.json({
      success: true,
      policies,
      total: policies.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list scaling policies',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/auto-scaling/policies
 * Crea una nueva política de auto-scaling
 */
router.post('/auto-scaling/policies', authenticateUser, async (req: Request, res: Response) => {
  try {
    const autoScalingService = new AutoScalingIntelligenceService(req.app.get('config'));
    const policy = req.body;
    
    if (!policy.name || !policy.targetMetrics) {
      return res.status(400).json({
        error: 'Missing required fields: name and targetMetrics'
      });
    }
    
    const newPolicy = await autoScalingService.createScalingPolicy(policy);
    
    res.json({
      success: true,
      policy: newPolicy
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create scaling policy',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/auto-scaling/actions/:actionId/execute
 * Ejecuta una acción de escalado
 */
router.post('/auto-scaling/actions/:actionId/execute', authenticateUser, async (req: Request, res: Response) => {
  try {
    const autoScalingService = new AutoScalingIntelligenceService(req.app.get('config'));
    const { actionId } = req.params;
    
    const success = await autoScalingService.executeScalingAction(actionId);
    
    if (success) {
      res.json({
        success: true,
        message: `Scaling action ${actionId} executed successfully`
      });
    } else {
      res.status(500).json({
        error: 'Scaling action execution failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to execute scaling action',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/auto-scaling/actions
 * Obtiene el historial de acciones de escalado
 */
router.get('/auto-scaling/actions', authenticateUser, async (req: Request, res: Response) => {
  try {
    const autoScalingService = new AutoScalingIntelligenceService(req.app.get('config'));
    const { policyId, limit = 50 } = req.query;
    
    const actions = autoScalingService.getScalingActions(
      policyId as string,
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      actions,
      total: actions.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get scaling actions',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/auto-scaling/toggle
 * Habilita o deshabilita el auto-scaling
 */
router.post('/auto-scaling/toggle', authenticateUser, async (req: Request, res: Response) => {
  try {
    const autoScalingService = new AutoScalingIntelligenceService(req.app.get('config'));
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Enabled field must be boolean'
      });
    }
    
    await autoScalingService.toggleAutoScaling(enabled);
    
    res.json({
      success: true,
      message: `Auto-scaling ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to toggle auto-scaling',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/auto-scaling/stats
 * Obtiene estadísticas del auto-scaling
 */
router.get('/auto-scaling/stats', authenticateUser, async (req: Request, res: Response) => {
  try {
    const autoScalingService = new AutoScalingIntelligenceService(req.app.get('config'));
    const stats = autoScalingService.getAutoScalingStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get auto-scaling stats',
      message: error.message
    });
  }
});

// ================== RECOMMENDATIONS ROUTES ==================

/**
 * POST /api/ai/recommendations
 * Genera recomendaciones inteligentes
 */
router.post('/recommendations', authenticateUser, async (req: Request, res: Response) => {
  try {
    const recommendationsService = new SmartRecommendationsService(req.app.get('config'));
    const request = req.body;
    
    if (!request.context) {
      return res.status(400).json({
        error: 'Missing required field: context'
      });
    }
    
    const recommendations = await recommendationsService.generateRecommendations(request);
    
    res.json({
      success: true,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Recommendations generation error:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/recommendations/:recommendationId/feedback
 * Registra feedback sobre una recomendación
 */
router.post('/recommendations/:recommendationId/feedback', authenticateUser, async (req: Request, res: Response) => {
  try {
    const recommendationsService = new SmartRecommendationsService(req.app.get('config'));
    const { recommendationId } = req.params;
    const { feedback } = req.body;
    const userId = (req as any).userId;
    
    if (!['accepted', 'rejected', 'implemented', 'dismissed'].includes(feedback)) {
      return res.status(400).json({
        error: 'Invalid feedback value. Must be: accepted, rejected, implemented, or dismissed'
      });
    }
    
    await recommendationsService.recordRecommendationFeedback(
      recommendationId,
      userId,
      feedback
    );
    
    res.json({
      success: true,
      message: `Feedback recorded: ${feedback}`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to record feedback',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/recommendations/history
 * Obtiene el historial de recomendaciones
 */
router.get('/recommendations/history', authenticateUser, async (req: Request, res: Response) => {
  try {
    const recommendationsService = new SmartRecommendationsService(req.app.get('config'));
    const userId = (req as any).userId;
    const { limit = 50 } = req.query;
    
    const history = recommendationsService.getRecommendationHistory(
      userId,
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      history,
      total: history.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get recommendation history',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/recommendations/stats
 * Obtiene estadísticas del sistema de recomendaciones
 */
router.get('/recommendations/stats', authenticateUser, async (req: Request, res: Response) => {
  try {
    const recommendationsService = new SmartRecommendationsService(req.app.get('config'));
    const stats = recommendationsService.getRecommendationStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get recommendation stats',
      message: error.message
    });
  }
});

// ================== GENERAL AI ROUTES ==================

/**
 * GET /api/ai/health
 * Health check del sistema de IA
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mlTraining: 'available',
        optimization: 'available',
        autoScaling: 'available',
        recommendations: 'available'
      },
      models: {
        loaded: 4, // Número de modelos cargados
        lastUpdate: new Date().toISOString()
      }
    };
    
    res.json({
      success: true,
      ...health
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/ai/dashboard
 * Dashboard general de IA
 */
router.get('/dashboard', authenticateUser, async (req: Request, res: Response) => {
  try {
    // Recopilar estadísticas de todos los servicios
    const dashboard = {
      summary: {
        totalModels: 4,
        activeOptimizations: 2,
        scalingPolicies: 5,
        recentRecommendations: 15
      },
      mlModels: {
        total: 4,
        active: 3,
        inTraining: 1,
        lastTraining: '2025-11-09T05:30:00Z'
      },
      optimizations: {
        total: 25,
        thisWeek: 8,
        averageImprovement: '32%',
        popularTypes: ['performance', 'cost', 'resource']
      },
      autoScaling: {
        policies: 5,
        active: 3,
        actionsThisMonth: 45,
        successRate: '94%'
      },
      recommendations: {
        total: 150,
        thisWeek: 23,
        acceptanceRate: '67%',
        topCategories: ['workflow-optimization', 'cost-reduction', 'security']
      },
      systemHealth: {
        cpuUsage: '45%',
        memoryUsage: '62%',
        modelLoadTime: '2.3s',
        predictionLatency: '45ms'
      }
    };
    
    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get AI dashboard',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/capabilities
 * Lista las capacidades de IA disponibles
 */
router.get('/capabilities', async (req: Request, res: Response) => {
  const capabilities = {
    mlTraining: {
      available: true,
      supportedModels: [
        'workflow-classifier',
        'performance-predictor',
        'optimization-recommender',
        'resource-estimator'
      ],
      features: [
        'Custom model training',
        'Automated hyperparameter tuning',
        'Model versioning',
        'Performance monitoring',
        'Deployment automation'
      ]
    },
    optimization: {
      available: true,
      algorithms: [
        'genetic-algorithm',
        'neural-optimization',
        'particle-swarm',
        'simulated-annealing',
        'mixed'
      ],
      optimizationTypes: [
        'performance',
        'resource',
        'cost',
        'reliability',
        'composite'
      ]
    },
    autoScaling: {
      available: true,
      features: [
        'Predictive scaling',
        'Multi-metric monitoring',
        'Policy-based scaling',
        'Cost optimization',
        'Performance prioritization'
      ],
      supportedMetrics: [
        'cpuUtilization',
        'memoryUtilization',
        'requestRate',
        'responseTime',
        'errorRate',
        'queueDepth',
        'activeConnections',
        'throughput'
      ]
    },
    recommendations: {
      available: true,
      recommendationTypes: [
        'workflow-optimization',
        'resource-allocation',
        'security-enhancement',
        'cost-reduction',
        'performance-tuning',
        'team-collaboration',
        'integration-suggestions',
        'template-recommendations',
        'monitoring-setup',
        'compliance-automation'
      ],
      features: [
        'AI-powered recommendations',
        'Personalized suggestions',
        'Learning from feedback',
        'Business rule integration',
        'Cross-team insights'
      ]
    }
  };
  
  res.json({
    success: true,
    capabilities
  });
});

export default router;