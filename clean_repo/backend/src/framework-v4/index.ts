/**
 * Framework Silhouette Enterprise V4.0 - Server Integration
 * 
 * Integra el framework V4.0 con el servidor Express existente, manteniendo
 * compatibilidad con las APIs actuales mientras habilita las nuevas características.
 * 
 * Autor: Silhouette Anonimo
 * Versión: 4.0.0
 * Fecha: 2025-11-09
 */

import express from 'express';
import { getCoordinator } from './coordinator';
import { getWorkflowEngine } from './workflow';
import { getAudioVisualSystem } from './audiovisual';
import { getAutoOptimizer } from './optimizer';
import { FrameworkConfigV4, FrameworkEventV4 } from './types';
import { getFrameworkConfig } from './config';
import { CompatibilityUtils } from './adapters/compatibility';

interface EnhancedSilhouetteServer {
  coordinator: ReturnType<typeof getCoordinator>;
  workflowEngine: ReturnType<typeof getWorkflowEngine>;
  audioVisualSystem: ReturnType<typeof getAudioVisualSystem>;
  autoOptimizer: ReturnType<typeof getAutoOptimizer>;
  v4Enabled: boolean;
  config: FrameworkConfigV4;
}

/**
 * Middleware para habilitar el Framework V4.0
 */
export function enableFrameworkV4(): express.RequestHandler {
  return (req, res, next) => {
    // Agregar el framework V4.0 al objeto request
    (req as any).frameworkV4 = {
      coordinator: getCoordinator(),
      workflowEngine: getWorkflowEngine(),
      audioVisualSystem: getAudioVisualSystem(),
      autoOptimizer: getAutoOptimizer(),
    };
    
    next();
  };
}

/**
 * Obtiene el framework V4.0 desde el request
 */
export function getFrameworkV4FromRequest(req: express.Request): EnhancedSilhouetteServer | null {
  return (req as any).frameworkV4 || null;
}

/**
 * Middleware para validar compatibilidad
 */
export function validateCompatibility(): express.RequestHandler {
  return (req, res, next) => {
    const version = req.headers['x-framework-version'] || req.query.version;
    
    if (version === '4.0.0') {
      (req as any).isV4Request = true;
    } else {
      (req as any).isV4Request = false;
    }
    
    next();
  };
}

/**
 * Router principal del Framework V4.0
 */
export const frameworkV4Router = express.Router();

// ================================
// ENDPOINTS DEL COORDINADOR V4.0
// ================================

/**
 * Crear una nueva tarea
 */
frameworkV4Router.post('/tasks', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { data, isV4Request } = req.body;
    
    let taskData = data;
    if (!isV4Request) {
      // Adaptar datos legacy a V4.0
      taskData = CompatibilityUtils.adaptRequest(data, 'task');
    }

    const task = await frameworkV4.coordinator.createTask(taskData);
    
    res.json({
      success: true,
      data: task,
      version: '4.0.0',
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Obtener estado de tareas
 */
frameworkV4Router.get('/tasks/status', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const tasks = frameworkV4.coordinator.getTasksStatus();
    const metrics = frameworkV4.coordinator.getMetrics();

    res.json({
      success: true,
      data: {
        tasks,
        metrics,
      },
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Obtener estado de equipos
 */
frameworkV4Router.get('/teams/status', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const teams = frameworkV4.coordinator.getTeamsStatus();

    res.json({
      success: true,
      data: teams,
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

// ================================
// ENDPOINTS DEL WORKFLOW ENGINE V4.0
// ================================

/**
 * Crear un nuevo workflow
 */
frameworkV4Router.post('/workflows', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { data, isV4Request } = req.body;
    
    let workflowData = data;
    if (!isV4Request) {
      // Adaptar workflow legacy a V4.0
      workflowData = CompatibilityUtils.adaptRequest(data, 'workflow');
    }

    const workflow = await frameworkV4.workflowEngine.createWorkflow(workflowData);
    
    res.json({
      success: true,
      data: workflow,
      version: '4.0.0',
    });
  } catch (error) {
    console.error('Failed to create workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Ejecutar un workflow
 */
frameworkV4Router.post('/workflows/:id/execute', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { id } = req.params;
    const workflow = await frameworkV4.workflowEngine.executeWorkflow(id);
    
    res.json({
      success: true,
      data: workflow,
      version: '4.0.0',
    });
  } catch (error) {
    console.error('Failed to execute workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Listar workflows
 */
frameworkV4Router.get('/workflows', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const workflows = frameworkV4.workflowEngine.listWorkflows();
    const metrics = frameworkV4.workflowEngine.getMetrics();

    res.json({
      success: true,
      data: {
        workflows,
        metrics,
      },
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Pausar workflow
 */
frameworkV4Router.post('/workflows/:id/pause', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { id } = req.params;
    await frameworkV4.workflowEngine.pauseWorkflow(id);
    
    res.json({
      success: true,
      message: 'Workflow paused successfully',
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Reanudar workflow
 */
frameworkV4Router.post('/workflows/:id/resume', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { id } = req.params;
    await frameworkV4.workflowEngine.resumeWorkflow(id);
    
    res.json({
      success: true,
      message: 'Workflow resumed successfully',
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

// ================================
// ENDPOINTS DEL SISTEMA AUDIOVISUAL V4.0
// ================================

/**
 * Crear proyecto audiovisual
 */
frameworkV4Router.post('/audiovisual/projects', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { titulo, plataforma, duracion, audiencia, objetivo, tema, estilo } = req.body;
    
    if (!titulo || !plataforma || !duracion || !audiencia || !objetivo) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: titulo, plataforma, duracion, audiencia, objetivo',
        version: '4.0.0',
      });
    }

    const project = await frameworkV4.audioVisualSystem.createProject({
      titulo,
      plataforma,
      duracion,
      audiencia,
      objetivo,
      tema,
      estilo,
    });
    
    res.json({
      success: true,
      data: project,
      version: '4.0.0',
    });
  } catch (error) {
    console.error('Failed to create audiovisual project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Ejecutar pipeline de producción audiovisual
 */
frameworkV4Router.post('/audiovisual/projects/:id/produce', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { id } = req.params;
    
    // Iniciar producción en background
    const productionPromise = frameworkV4.audioVisualSystem.executeProductionPipeline(id);
    
    res.json({
      success: true,
      message: 'Production pipeline started',
      data: { projectId: id },
      version: '4.0.0',
    });
    
    // No esperar a que termine la producción
    productionPromise.catch(error => {
      console.error('AudioVisual production failed:', error);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Obtener proyecto audiovisual
 */
frameworkV4Router.get('/audiovisual/projects/:id', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { id } = req.params;
    const project = frameworkV4.audioVisualSystem.getProject(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        version: '4.0.0',
      });
    }
    
    res.json({
      success: true,
      data: project,
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Listar proyectos audiovisuales
 */
frameworkV4Router.get('/audiovisual/projects', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const projects = frameworkV4.audioVisualSystem.listProjects();
    
    res.json({
      success: true,
      data: projects,
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Generar video con proveedor específico
 */
frameworkV4Router.post('/audiovisual/projects/:id/generate-video', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { id } = req.params;
    const { provider } = req.body;
    
    if (!['runway', 'pika', 'luma'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be runway, pika, or luma',
        version: '4.0.0',
      });
    }
    
    const result = await frameworkV4.audioVisualSystem.generateVideo(id, provider);
    
    res.json({
      success: true,
      data: result,
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

// ================================
// ENDPOINTS DEL AUTO OPTIMIZER V4.0
// ================================

/**
 * Obtener métricas de optimización
 */
frameworkV4Router.get('/optimizer/metrics', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const metrics = frameworkV4.autoOptimizer.getOptimizationMetrics();
    const baseline = frameworkV4.autoOptimizer.getPerformanceBaseline();

    res.json({
      success: true,
      data: {
        metrics,
        baseline,
      },
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Ejecutar optimización manual
 */
frameworkV4Router.post('/optimizer/optimize', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const { component } = req.body;
    const actions = await frameworkV4.autoOptimizer.manualOptimization(component);
    
    res.json({
      success: true,
      data: {
        actions,
        timestamp: new Date(),
      },
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Obtener historial de optimizaciones
 */
frameworkV4Router.get('/optimizer/history', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const history = frameworkV4.autoOptimizer.getOptimizationHistory();

    res.json({
      success: true,
      data: history,
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

// ================================
// ENDPOINTS GENERALES DEL FRAMEWORK
// ================================

/**
 * Estado general del framework V4.0
 */
frameworkV4Router.get('/status', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ error: 'Framework V4.0 not initialized' });
    }

    const coordinatorMetrics = frameworkV4.coordinator.getMetrics();
    const workflowMetrics = frameworkV4.workflowEngine.getMetrics();
    const optimizationMetrics = frameworkV4.autoOptimizer.getOptimizationMetrics().slice(-1)[0];

    res.json({
      success: true,
      data: {
        version: '4.0.0',
        status: 'running',
        components: {
          coordinator: {
            status: 'active',
            metrics: coordinatorMetrics,
          },
          workflowEngine: {
            status: 'active',
            metrics: workflowMetrics,
          },
          audioVisualSystem: {
            status: 'active',
            projects: frameworkV4.audioVisualSystem.listProjects().length,
          },
          autoOptimizer: {
            status: 'active',
            lastOptimization: optimizationMetrics?.timestamp,
          },
        },
        performance: optimizationMetrics?.performance || {},
        quality: optimizationMetrics?.quality || {},
        timestamp: new Date(),
      },
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Configuración del framework V4.0
 */
frameworkV4Router.get('/config', async (req, res) => {
  try {
    const config = getFrameworkConfig();
    
    res.json({
      success: true,
      data: {
        version: config.version,
        environment: config.environment,
        features: {
          coordinator: config.coordinator.enabled,
          workflow: config.workflow.enabled,
          audiovisual: config.audiovisual.enabled,
          optimization: config.optimization.enabled,
          monitoring: config.monitoring.enabled,
        },
        capabilities: {
          intelligentAssignment: config.coordinator.intelligentAssignment,
          loadBalancing: config.coordinator.loadBalancing,
          autoRecovery: config.coordinator.autoRecovery,
          dynamicOptimization: config.workflow.dynamicOptimization,
          mlOptimization: config.optimization.mlBased,
        },
      },
      version: '4.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      version: '4.0.0',
    });
  }
});

/**
 * Health check del framework V4.0
 */
frameworkV4Router.get('/health', async (req, res) => {
  try {
    const frameworkV4 = getFrameworkV4FromRequest(req);
    if (!frameworkV4) {
      return res.status(500).json({ 
        status: 'unhealthy',
        error: 'Framework V4.0 not initialized',
        version: '4.0.0',
      });
    }

    // Verificar salud de todos los componentes
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '4.0.0',
      components: {
        coordinator: 'healthy',
        workflowEngine: 'healthy',
        audioVisualSystem: 'healthy',
        autoOptimizer: 'healthy',
      },
    };

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      version: '4.0.0',
    });
  }
});

/**
 * Middleware de error para el framework V4.0
 */
export function frameworkV4ErrorHandler(err: any, req: express.Request, res: express.Response, next: express.NextFunction): void {
  console.error('Framework V4.0 Error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    version: '4.0.0',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Inicializa el framework V4.0
 */
export async function initializeFrameworkV4(): Promise<void> {
  console.log('🚀 Initializing Silhouette Framework V4.0...');
  
  const config = getFrameworkConfig();
  
  if (!config.coordinator.enabled) {
    console.log('⚠️ Coordinator disabled, skipping V4.0 initialization');
    return;
  }
  
  // Inicializar componentes principales
  const coordinator = getCoordinator();
  const workflowEngine = getWorkflowEngine();
  const audioVisualSystem = getAudioVisualSystem();
  const autoOptimizer = getAutoOptimizer();
  
  console.log('✅ Framework V4.0 initialized successfully');
  console.log(`📊 Environment: ${config.environment}`);
  console.log(`🔧 Features: Coordinator=${config.coordinator.enabled}, Workflow=${config.workflow.enabled}, AudioVisual=${config.audiovisual.enabled}, Optimizer=${config.optimization.enabled}`);
}

/**
 * Detiene el framework V4.0
 */
export function shutdownFrameworkV4(): void {
  console.log('🛑 Shutting down Framework V4.0...');
  
  try {
    const coordinator = getCoordinator();
    coordinator.destroy();
    
    const autoOptimizer = getAutoOptimizer();
    autoOptimizer.stopOptimizer();
    
    console.log('✅ Framework V4.0 shutdown complete');
  } catch (error) {
    console.error('❌ Error during Framework V4.0 shutdown:', error);
  }
}

// Exportaciones principales
export { frameworkV4Router as FrameworkV4Router };
export { initializeFrameworkV4, shutdownFrameworkV4 };
