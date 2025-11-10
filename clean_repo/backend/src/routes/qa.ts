import express from 'express';
import { body, param, query } from 'express-validator';
import { QASystem } from '../services/qa/QASystem';
import { AgentManager } from '../services/qa/AgentManager';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

const router = express.Router();
const qaSystem = new QASystem();
const agentManager = new AgentManager();

// Middleware para validación de errores
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * POST /api/qa/verify-information
 * Verifica la veracidad de información proporcionada
 */
router.post('/verify-information', [
  body('content').isString().isLength({ min: 1 }).withMessage('Content is required'),
  body('context').optional().isObject().withMessage('Context must be an object'),
  body('sources').optional().isArray().withMessage('Sources must be an array'),
  body('requireConsensus').optional().isBoolean().withMessage('requireConsensus must be boolean'),
  body('strictMode').optional().isBoolean().withMessage('strictMode must be boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { content, context, sources, requireConsensus = true, strictMode = false } = req.body;
    const userId = (req as any).user?.id || 'system';
    
    logger.info(`QA Information verification requested by user ${userId}`);
    
    const result = await qaSystem.verifyInformation({
      content,
      context,
      sources,
      userId,
      options: {
        requireConsensus,
        strictMode,
        timeout: 30000,
        cacheResults: true
      }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('QA verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QA_VERIFICATION_ERROR',
        message: 'Failed to verify information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * POST /api/qa/detect-hallucination
 * Detecta posibles alucinaciones en el contenido
 */
router.post('/detect-hallucination', [
  body('content').isString().isLength({ min: 1 }).withMessage('Content is required'),
  body('context').optional().isObject().withMessage('Context must be an object'),
  body('sensitivity').optional().isFloat({ min: 0, max: 1 }).withMessage('Sensitivity must be between 0 and 1')
], handleValidationErrors, async (req, res) => {
  try {
    const { content, context, sensitivity = 0.5 } = req.body;
    const userId = (req as any).user?.id || 'system';
    
    logger.info(`QA Hallucination detection requested by user ${userId}`);
    
    const result = await qaSystem.detectHallucination({
      content,
      context,
      userId,
      options: {
        sensitivity,
        timeout: 20000,
        enableModels: ['nlpSemantic', 'patternMatching', 'contradictionAnalysis', 'factualValidator', 'ensembleModel', 'externalValidation']
      }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('QA hallucination detection error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QA_HALLUCINATION_ERROR',
        message: 'Failed to detect hallucinations',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * POST /api/qa/verify-sources
 * Verifica la credibilidad y validez de fuentes de información
 */
router.post('/verify-sources', [
  body('sources').isArray().isLength({ min: 1 }).withMessage('Sources array is required'),
  body('content').optional().isString().withMessage('Content must be string'),
  body('checkDomainReputation').optional().isBoolean().withMessage('checkDomainReputation must be boolean'),
  body('requireMultipleSources').optional().isBoolean().withMessage('requireMultipleSources must be boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { sources, content, checkDomainReputation = true, requireMultipleSources = true } = req.body;
    const userId = (req as any).user?.id || 'system';
    
    logger.info(`QA Source verification requested by user ${userId} for ${sources.length} sources`);
    
    const result = await qaSystem.verifySources({
      sources,
      content,
      userId,
      options: {
        checkDomainReputation,
        requireMultipleSources,
        timeout: 25000,
        cacheResults: true
      }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('QA source verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QA_SOURCE_ERROR',
        message: 'Failed to verify sources',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/qa/health
 * Estado de salud del sistema QA
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await qaSystem.getSystemHealth();
    
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    logger.error('QA health check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QA_HEALTH_ERROR',
        message: 'QA system health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/qa/agents/status
 * Estado de todos los agentes QA
 */
router.get('/agents/status', async (req, res) => {
  try {
    const agentStatus = await agentManager.getAllAgentStatus();
    
    res.json({
      success: true,
      data: agentStatus
    });
  } catch (error) {
    logger.error('QA agent status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QA_AGENT_ERROR',
        message: 'Failed to get agent status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/qa/verification/:id
 * Obtiene el estado de una verificación específica
 */
router.get('/verification/:id', [
  param('id').isString().isLength({ min: 1 }).withMessage('Verification ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 'system';
    
    const verification = await qaSystem.getVerificationStatus(id, userId);
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VERIFICATION_NOT_FOUND',
          message: 'Verification not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    logger.error('QA verification status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QA_STATUS_ERROR',
        message: 'Failed to get verification status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * POST /api/qa/batch-verify
 * Verificación por lotes de múltiples elementos
 */
router.post('/batch-verify', [
  body('items').isArray().isLength({ min: 1, max: 100 }).withMessage('Items array (1-100) is required'),
  body('items.*.content').isString().isLength({ min: 1 }).withMessage('Each item must have content'),
  body('items.*.type').isIn(['information', 'hallucination', 'sources']).withMessage('Type must be valid'),
  body('items.*.context').optional().isObject().withMessage('Context must be object')
], handleValidationErrors, async (req, res) => {
  try {
    const { items } = req.body;
    const userId = (req as any).user?.id || 'system';
    
    logger.info(`QA Batch verification requested by user ${userId} for ${items.length} items`);
    
    const result = await qaSystem.batchVerify({
      items,
      userId,
      options: {
        timeout: 60000,
        enableCache: true,
        parallel: true,
        maxConcurrency: 5
      }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('QA batch verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QA_BATCH_ERROR',
        message: 'Failed to perform batch verification',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/qa/metrics
 * Métricas de rendimiento del sistema QA
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await qaSystem.getSystemMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('QA metrics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QA_METRICS_ERROR',
        message: 'Failed to get system metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;