import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { WorkflowExecution, Workflow, Team, TeamMember, User } from '../entities';
import { WorkflowService } from '../services/workflowService';
import { ExecutionService } from '../services/executionService';
import { SocketService } from '../services/socketService';
import { AuditService } from '../services/auditService';
import { RabbitMQService } from '../config/rabbitmq';

const router = Router();
const executionRepository = AppDataSource.getRepository(WorkflowExecution);
const workflowRepository = AppDataSource.getRepository(Workflow);
const teamRepository = AppDataSource.getRepository(Team);
const teamMemberRepository = AppDataSource.getRepository(TeamMember);
const userRepository = AppDataSource.getRepository(User);

// ==================== WORKFLOW EXECUTION ====================

/**
 * Start workflow execution
 * @route POST /executions
 * @desc Start a new workflow execution
 * @access Private (team members with execute permission)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager', 'lead', 'member']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        workflowId, 
        teamId, 
        inputData = {}, 
        triggerType = 'manual',
        scheduledAt,
        priority = 'normal',
        metadata = {}
      } = req.body;
      const userId = req.user?.id;

      // Get workflow
      const workflow = await workflowRepository.findOne({
        where: { id: workflowId },
        relations: ['team', 'team.members']
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      // Verify team membership and permissions
      if (teamId) {
        const team = await teamRepository.findOne({
          where: { id: teamId },
          relations: ['members', 'members.user']
        });

        if (!team) {
          return res.status(404).json({
            success: false,
            message: 'Team not found'
          });
        }

        const teamMember = team.members.find(member => member.userId === userId);
        if (!teamMember) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Not a team member'
          });
        }

        if (!teamMember.permissions.includes('workflows:execute') && teamMember.role !== 'owner') {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Insufficient permissions to execute workflows'
          });
        }
      }

      // Check workflow status
      if (workflow.status === 'disabled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot execute disabled workflow'
        });
      }

      if (workflow.status === 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Cannot execute draft workflow'
        });
      }

      // Validate input data against workflow schema
      const validationResult = await WorkflowService.validateInputData(workflow, inputData);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input data',
          errors: validationResult.errors
        });
      }

      // Check for concurrent executions limit
      const concurrentLimit = workflow.settings?.concurrentExecutions || 10;
      const activeExecutions = await executionRepository.count({
        where: {
          workflowId,
          status: 'running'
        }
      });

      if (activeExecutions >= concurrentLimit) {
        return res.status(429).json({
          success: false,
          message: `Workflow execution limit reached (${concurrentLimit} concurrent executions allowed)`
        });
      }

      // Create execution record
      const execution = new WorkflowExecution();
      execution.workflow = workflow;
      execution.triggeredBy = userId!;
      execution.inputData = inputData;
      execution.triggerType = triggerType;
      execution.priority = priority;
      execution.metadata = {
        ...metadata,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        timestamp: new Date().toISOString()
      };

      // Set scheduled execution time
      if (scheduledAt) {
        execution.scheduledAt = new Date(scheduledAt);
        execution.status = 'scheduled';
      } else {
        execution.status = 'pending';
      }

      const savedExecution = await executionRepository.save(execution);

      // If not scheduled, start execution immediately
      if (!scheduledAt) {
        await startWorkflowExecution(savedExecution.id);
      }

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'workflow:execute:start',
        resourceType: 'workflow_execution',
        resourceId: savedExecution.id,
        details: { 
          workflowId, 
          triggerType, 
          priority,
          hasScheduledTime: !!scheduledAt
        }
      });

      // Emit real-time events
      SocketService.emitToWorkflow(workflowId, 'execution:started', {
        execution: savedExecution,
        triggeredBy: req.user
      });

      if (teamId) {
        SocketService.emitToTeam(teamId, 'workflow:executed', {
          execution: savedExecution,
          workflow: {
            id: workflow.id,
            name: workflow.name
          },
          executedBy: req.user
        });
      }

      res.status(201).json({
        success: true,
        message: scheduledAt ? 'Workflow execution scheduled' : 'Workflow execution started',
        data: savedExecution
      });

    } catch (error) {
      console.error('Start workflow execution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start workflow execution',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get execution details
 * @route GET /executions/:executionId
 * @desc Get specific execution details
 * @access Private (execution creator or team member)
 */
router.get(
  '/:executionId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { executionId } = req.params;
      const userId = req.user?.id;

      const execution = await executionRepository.findOne({
        where: { id: executionId },
        relations: [
          'workflow', 
          'workflow.team', 
          'workflow.team.members',
          'triggeredByUser'
        ]
      });

      if (!execution) {
        return res.status(404).json({
          success: false,
          message: 'Execution not found'
        });
      }

      // Check access permissions
      const hasAccess = 
        execution.triggeredBy === userId ||
        execution.workflow.team.members.some(member => member.userId === userId) ||
        req.user?.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      // Get execution logs
      const logs = await ExecutionService.getExecutionLogs(executionId);

      res.json({
        success: true,
        data: {
          ...execution,
          logs,
          triggeredByUser: {
            id: execution.triggeredByUser.id,
            name: execution.triggeredByUser.name,
            email: execution.triggeredByUser.email
          }
        }
      });

    } catch (error) {
      console.error('Get execution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch execution',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get executions list
 * @route GET /executions
 * @desc Get executions list with filtering and pagination
 * @access Private
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        workflowId, 
        teamId, 
        status, 
        triggerType,
        priority,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'startedAt',
        sortOrder = 'DESC'
      } = req.query;
      const userId = req.user?.id;

      let query = executionRepository
        .createQueryBuilder('execution')
        .leftJoinAndSelect('execution.workflow', 'workflow')
        .leftJoinAndSelect('workflow.team', 'team')
        .leftJoinAndSelect('execution.triggeredByUser', 'user')
        .where('team.members.userId = :userId', { userId });

      // Apply filters
      if (workflowId) {
        query = query.andWhere('execution.workflowId = :workflowId', { workflowId });
      }

      if (teamId) {
        query = query.andWhere('team.id = :teamId', { teamId });
      }

      if (status) {
        query = query.andWhere('execution.status = :status', { status });
      }

      if (triggerType) {
        query = query.andWhere('execution.triggerType = :triggerType', { triggerType });
      }

      if (priority) {
        query = query.andWhere('execution.priority = :priority', { priority });
      }

      if (dateFrom) {
        query = query.andWhere('execution.startedAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        query = query.andWhere('execution.startedAt <= :dateTo', { dateTo });
      }

      // Apply sorting
      const validSortFields = ['startedAt', 'completedAt', 'duration', 'priority', 'status'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'startedAt';
      query = query.orderBy(`execution.${sortField}`, sortOrder as 'ASC' | 'DESC');

      // Apply pagination
      const executions = await query
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getMany();

      // Get total count
      const totalQuery = executionRepository
        .createQueryBuilder('execution')
        .leftJoin('execution.workflow', 'workflow')
        .leftJoin('workflow.team', 'team')
        .where('team.members.userId = :userId', { userId });

      if (workflowId) totalQuery.andWhere('execution.workflowId = :workflowId', { workflowId });
      if (teamId) totalQuery.andWhere('team.id = :teamId', { teamId });
      if (status) totalQuery.andWhere('execution.status = :status', { status });
      if (triggerType) totalQuery.andWhere('execution.triggerType = :triggerType', { triggerType });
      if (priority) totalQuery.andWhere('execution.priority = :priority', { priority });
      if (dateFrom) totalQuery.andWhere('execution.startedAt >= :dateFrom', { dateFrom });
      if (dateTo) totalQuery.andWhere('execution.startedAt <= :dateTo', { dateTo });

      const total = await totalQuery.getCount();

      res.json({
        success: true,
        data: executions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get executions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch executions',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Cancel running execution
 * @route POST /executions/:executionId/cancel
 * @desc Cancel a running workflow execution
 * @access Private (execution creator or team member with manage permissions)
 */
router.post(
  '/:executionId/cancel',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { executionId } = req.params;
      const { reason = 'User requested cancellation' } = req.body;
      const userId = req.user?.id;

      const execution = await executionRepository.findOne({
        where: { id: executionId },
        relations: [
          'workflow', 
          'workflow.team', 
          'workflow.team.members',
          'triggeredByUser'
        ]
      });

      if (!execution) {
        return res.status(404).json({
          success: false,
          message: 'Execution not found'
        });
      }

      // Check permissions
      const hasAccess = 
        execution.triggeredBy === userId ||
        execution.workflow.team.members.some(member => 
          member.userId === userId && 
          ['owner', 'manager'].includes(member.role)
        ) ||
        req.user?.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      // Check if execution can be cancelled
      if (!['running', 'pending', 'scheduled'].includes(execution.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel execution with status: ${execution.status}`
        });
      }

      // Cancel the execution
      const success = await ExecutionService.cancelExecution(executionId, {
        reason,
        cancelledBy: userId
      });

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to cancel execution'
        });
      }

      // Update execution record
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      execution.cancelledAt = new Date();
      execution.cancellationReason = reason;
      await executionRepository.save(execution);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'workflow:execute:cancel',
        resourceType: 'workflow_execution',
        resourceId: executionId,
        details: { reason }
      });

      // Emit real-time events
      SocketService.emitToWorkflow(execution.workflowId, 'execution:cancelled', {
        execution,
        cancelledBy: req.user,
        reason
      });

      if (execution.workflow.teamId) {
        SocketService.emitToTeam(execution.workflow.teamId, 'workflow:execution:cancelled', {
          execution,
          workflow: {
            id: execution.workflow.id,
            name: execution.workflow.name
          },
          cancelledBy: req.user,
          reason
        });
      }

      res.json({
        success: true,
        message: 'Execution cancelled successfully',
        data: { 
          executionId, 
          status: 'cancelled', 
          reason,
          cancelledAt: new Date()
        }
      });

    } catch (error) {
      console.error('Cancel execution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel execution',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Retry failed execution
 * @route POST /executions/:executionId/retry
 * @desc Retry a failed workflow execution
 * @access Private (execution creator or team member with execute permissions)
 */
router.post(
  '/:executionId/retry',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { executionId } = req.params;
      const { inputData, priority } = req.body;
      const userId = req.user?.id;

      const originalExecution = await executionRepository.findOne({
        where: { id: executionId },
        relations: [
          'workflow', 
          'workflow.team', 
          'workflow.team.members'
        ]
      });

      if (!originalExecution) {
        return res.status(404).json({
          success: false,
          message: 'Execution not found'
        });
      }

      // Check permissions
      const hasAccess = 
        originalExecution.triggeredBy === userId ||
        originalExecution.workflow.team.members.some(member => 
          member.userId === userId && 
          member.permissions.includes('workflows:execute')
        ) ||
        req.user?.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      // Check if execution can be retried
      if (originalExecution.status !== 'failed' && originalExecution.status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: `Cannot retry execution with status: ${originalExecution.status}`
        });
      }

      // Create new execution as retry
      const retryExecution = new WorkflowExecution();
      retryExecution.workflow = originalExecution.workflow;
      retryExecution.triggeredBy = userId!;
      retryExecution.inputData = inputData || originalExecution.inputData;
      retryExecution.triggerType = 'retry';
      retryExecution.priority = priority || originalExecution.priority;
      retryExecution.metadata = {
        ...originalExecution.metadata,
        originalExecutionId: executionId,
        retryCount: (originalExecution.metadata?.retryCount || 0) + 1,
        lastRetryAt: new Date().toISOString()
      };

      const savedExecution = await executionRepository.save(retryExecution);

      // Start the retry execution
      await startWorkflowExecution(savedExecution.id);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'workflow:execute:retry',
        resourceType: 'workflow_execution',
        resourceId: savedExecution.id,
        details: { 
          originalExecutionId: executionId,
          retryCount: retryExecution.metadata.retryCount
        }
      });

      // Emit real-time events
      SocketService.emitToWorkflow(originalExecution.workflowId, 'execution:retry:started', {
        newExecution: savedExecution,
        originalExecution: originalExecution,
        triggeredBy: req.user
      });

      res.status(201).json({
        success: true,
        message: 'Execution retry started',
        data: savedExecution
      });

    } catch (error) {
      console.error('Retry execution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry execution',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get execution statistics
 * @route GET /executions/stats
 * @desc Get execution statistics and metrics
 * @access Private (team members)
 */
router.get(
  '/stats',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId, workflowId, dateFrom, dateTo } = req.query;
      const userId = req.user?.id;

      // Get user's accessible teams
      const userTeams = await teamMemberRepository.find({
        where: { userId },
        relations: ['team']
      });

      const teamIds = userTeams.map(utm => utm.team.id);
      const accessibleTeamIds = teamId ? [teamId] : teamIds;

      if (accessibleTeamIds.length === 0) {
        return res.json({
          success: true,
          data: {
            total: 0,
            byStatus: {},
            byTriggerType: {},
            byPriority: {},
            averageDuration: 0,
            successRate: 0,
            trends: []
          }
        });
      }

      // Build base query
      let query = executionRepository
        .createQueryBuilder('execution')
        .leftJoin('execution.workflow', 'workflow')
        .where('workflow.teamId IN (:...teamIds)', { teamIds: accessibleTeamIds });

      if (workflowId) {
        query = query.andWhere('execution.workflowId = :workflowId', { workflowId });
      }

      if (dateFrom) {
        query = query.andWhere('execution.startedAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        query = query.andWhere('execution.startedAt <= :dateTo', { dateTo });
      }

      // Get statistics
      const totalExecutions = await query.getCount();

      // Status breakdown
      const statusStats = await query
        .select('execution.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('execution.status')
        .getRawMany();

      // Trigger type breakdown
      const triggerTypeStats = await query
        .select('execution.triggerType', 'triggerType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('execution.triggerType')
        .getRawMany();

      // Priority breakdown
      const priorityStats = await query
        .select('execution.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .groupBy('execution.priority')
        .getRawMany();

      // Average duration
      const durationStats = await query
        .select('AVG(EXTRACT(EPOCH FROM (execution.completedAt - execution.startedAt)))', 'avgDuration')
        .where('execution.status = :status', { status: 'completed' })
        .getRawOne();

      // Success rate
      const successRateStats = await query
        .select('COUNT(CASE WHEN execution.status = \'completed\' THEN 1 END)', 'successCount')
        .addSelect('COUNT(*)', 'totalCount')
        .getRawOne();

      // Daily trends (last 30 days)
      const trends = await query
        .select('DATE(execution.startedAt)', 'date')
        .addSelect('COUNT(*)', 'total')
        .addSelect('COUNT(CASE WHEN execution.status = \'completed\' THEN 1 END)', 'successful')
        .addSelect('COUNT(CASE WHEN execution.status = \'failed\' THEN 1 END)', 'failed')
        .where('execution.startedAt >= NOW() - INTERVAL \'30 days\'')
        .groupBy('DATE(execution.startedAt)')
        .orderBy('date', 'ASC')
        .getRawMany();

      // Format response
      const byStatus = statusStats.reduce((acc, stat) => {
        acc[stat.status] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      const byTriggerType = triggerTypeStats.reduce((acc, stat) => {
        acc[stat.triggerType] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      const byPriority = priorityStats.reduce((acc, stat) => {
        acc[stat.priority] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      const avgDuration = durationStats?.avgDuration ? Number(durationStats.avgDuration) : 0;
      const successRate = totalExecutions > 0 && successRateStats ? 
        (Number(successRateStats.successCount) / Number(successRateStats.totalCount)) * 100 : 0;

      res.json({
        success: true,
        data: {
          total: totalExecutions,
          byStatus,
          byTriggerType,
          byPriority,
          averageDuration: Math.round(avgDuration),
          successRate: Math.round(successRate * 100) / 100,
          trends: trends.map(trend => ({
            date: trend.date,
            total: Number(trend.total),
            successful: Number(trend.successful),
            failed: Number(trend.failed)
          }))
        }
      });

    } catch (error) {
      console.error('Get execution stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch execution statistics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * Webhook endpoint for external triggers
 * @route POST /executions/webhook/:workflowId
 * @desc Trigger workflow via webhook
 * @access Public (with valid webhook token)
 */
router.post(
  '/webhook/:workflowId',
  async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const { inputData = {}, metadata = {} } = req.body;
      const webhookToken = req.headers['x-webhook-token'] as string;

      // Validate webhook token
      const workflow = await workflowRepository.findOne({
        where: { 
          id: workflowId,
          webhookToken: webhookToken
        },
        relations: ['team']
      });

      if (!workflow) {
        return res.status(401).json({
          success: false,
          message: 'Invalid webhook token or workflow not found'
        });
      }

      // Check if webhook is enabled
      if (!workflow.settings?.webhookEnabled) {
        return res.status(400).json({
          success: false,
          message: 'Webhook triggers are disabled for this workflow'
        });
      }

      // Create execution
      const execution = new WorkflowExecution();
      execution.workflow = workflow;
      execution.triggeredBy = 'webhook';
      execution.inputData = inputData;
      execution.triggerType = 'webhook';
      execution.priority = 'normal';
      execution.metadata = {
        ...metadata,
        webhookToken: webhookToken ? 'provided' : 'missing',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        timestamp: new Date().toISOString()
      };

      const savedExecution = await executionRepository.save(execution);

      // Start execution
      await startWorkflowExecution(savedExecution.id);

      res.status(201).json({
        success: true,
        message: 'Workflow execution triggered via webhook',
        data: {
          executionId: savedExecution.id,
          workflowId: workflow.id,
          status: 'pending'
        }
      });

    } catch (error) {
      console.error('Webhook trigger error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger workflow via webhook',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Webhook signature verification
 * @route GET /executions/webhook/:workflowId/verify
 * @desc Verify webhook configuration
 * @access Public
 */
router.get(
  '/webhook/:workflowId/verify',
  async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const webhookToken = req.headers['x-webhook-token'] as string;

      const workflow = await workflowRepository.findOne({
        where: { 
          id: workflowId,
          webhookToken: webhookToken
        },
        select: ['id', 'name', 'webhookToken', 'settings']
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found or invalid token'
        });
      }

      res.json({
        success: true,
        data: {
          workflowId: workflow.id,
          workflowName: workflow.name,
          webhookEnabled: workflow.settings?.webhookEnabled || false,
          validToken: true
        }
      });

    } catch (error) {
      console.error('Webhook verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify webhook',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== HELPER FUNCTIONS ====================

/**
 * Start workflow execution in background
 */
async function startWorkflowExecution(executionId: string): Promise<void> {
  try {
    // Publish execution task to RabbitMQ
    await RabbitMQService.publish('workflow.execution', {
      executionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to start workflow execution:', error);
    throw error;
  }
}

export default router;