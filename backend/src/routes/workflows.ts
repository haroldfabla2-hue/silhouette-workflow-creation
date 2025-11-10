import express from 'express';
import { WorkflowsService } from '../workflows/workflows.service';
import { AuthService } from '../auth/auth.service';

const router = express.Router();
const workflowsService = new WorkflowsService();
const authService = new AuthService();

// Middleware de autenticación
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido',
      error: 'MISSING_TOKEN',
    });
  }

  const user = await authService.validateToken(token);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      error: 'INVALID_TOKEN',
    });
  }

  req.user = user;
  next();
};

// Crear workflow
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, canvasData, nodes, edges } = req.body;
    
    if (!name || !canvasData) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y datos del canvas son requeridos',
        error: 'MISSING_FIELDS',
      });
    }

    const workflow = await workflowsService.createWorkflow(req.user, {
      name,
      description,
      canvasData,
      nodes,
      edges,
    }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Workflow creado exitosamente',
      data: workflow,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      error: 'WORKFLOW_CREATION_ERROR',
    });
  }
});

// Obtener lista de workflows
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, name, page, limit } = req.query;
    
    const filters: any = {};
    if (status) filters.status = status;
    if (name) filters.name = name;

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;

    const result = await workflowsService.getWorkflows(
      req.user,
      filters,
      pageNum,
      limitNum,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'WORKFLOWS_FETCH_ERROR',
    });
  }
});

// Obtener workflow por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const workflow = await workflowsService.getWorkflowById(req.user, id);

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      error: 'WORKFLOW_FETCH_ERROR',
    });
  }
});

// Actualizar workflow
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, canvasData, nodes, edges, status } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (canvasData !== undefined) updateData.canvasData = canvasData;
    if (nodes !== undefined) updateData.nodes = nodes;
    if (edges !== undefined) updateData.edges = edges;
    if (status !== undefined) updateData.status = status;

    const workflow = await workflowsService.updateWorkflow(
      req.user,
      id,
      updateData,
      req.ip,
    );

    res.json({
      success: true,
      message: 'Workflow actualizado exitosamente',
      data: workflow,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      error: 'WORKFLOW_UPDATE_ERROR',
    });
  }
});

// Eliminar workflow
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await workflowsService.deleteWorkflow(req.user, id, req.ip);

    res.status(204).json({
      success: true,
      message: 'Workflow eliminado exitosamente',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      error: 'WORKFLOW_DELETE_ERROR',
    });
  }
});

// Duplicar workflow
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido para duplicar',
        error: 'NAME_REQUIRED',
      });
    }

    const workflow = await workflowsService.duplicateWorkflow(
      req.user,
      id,
      name,
      req.ip,
    );

    res.status(201).json({
      success: true,
      message: 'Workflow duplicado exitosamente',
      data: workflow,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      error: 'WORKFLOW_DUPLICATION_ERROR',
    });
  }
});

// Obtener estadísticas
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await workflowsService.getWorkflowStats(req.user);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'WORKFLOW_STATS_ERROR',
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'workflows',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;