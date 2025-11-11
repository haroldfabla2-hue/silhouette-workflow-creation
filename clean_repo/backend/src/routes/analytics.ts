import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { User, Team, TeamMember, Workflow, WorkflowExecution, AnalyticsEvent } from '../entities';
import { AnalyticsService } from '../services/analyticsService';
import { MetricsService } from '../services/metricsService';
import { ReportService } from '../services/reportService';

const router = Router();
const userRepository = AppDataSource.getRepository(User);
const teamRepository = AppDataSource.getRepository(Team);
const teamMemberRepository = AppDataSource.getRepository(TeamMember);
const workflowRepository = AppDataSource.getRepository(Workflow);
const executionRepository = AppDataSource.getRepository(WorkflowExecution);
const eventRepository = AppDataSource.getRepository(AnalyticsEvent);

// ==================== ANALYTICS DASHBOARD ====================

/**
 * Get analytics overview
 * @route GET /analytics/overview
 * @desc Get comprehensive analytics overview for the organization/team
 * @access Private (team members with analytics permissions)
 */
router.get(
  '/overview',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId, 
        dateFrom, 
        dateTo, 
        granularity = 'day',
        compareWithPrevious = false
      } = req.query;
      const userId = req.user?.id;

      // Determine date range
      const endDate = dateTo ? new Date(dateTo as string) : new Date();
      const startDate = dateFrom ? new Date(dateFrom as string) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
      
      // Get user's accessible teams
      const userTeams = await teamMemberRepository.find({
        where: { userId },
        relations: ['team']
      });

      const teamIds = userTeams.map(utm => utm.team.id);
      const targetTeamIds = teamId ? [teamId] : teamIds;

      if (targetTeamIds.length === 0) {
        return res.json({
          success: true,
          data: {
            summary: {
              totalWorkflows: 0,
              totalExecutions: 0,
              activeWorkflows: 0,
              successRate: 0,
              averageExecutionTime: 0,
              totalUsers: 0,
              activeUsers: 0
            },
            trends: [],
            performance: {
              topWorkflows: [],
              executionFrequency: {},
              userActivity: {}
            }
          }
        });
      }

      // Get summary metrics
      const summary = await AnalyticsService.getSummaryMetrics({
        teamIds: targetTeamIds,
        startDate,
        endDate
      });

      // Get trends data
      const trends = await AnalyticsService.getTrends({
        teamIds: targetTeamIds,
        startDate,
        endDate,
        granularity: granularity as 'hour' | 'day' | 'week' | 'month'
      });

      // Get performance metrics
      const performance = await AnalyticsService.getPerformanceMetrics({
        teamIds: targetTeamIds,
        startDate,
        endDate
      });

      // Get comparison data if requested
      let comparison = null;
      if (compareWithPrevious === 'true') {
        const compareStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
        comparison = await AnalyticsService.getSummaryMetrics({
          teamIds: targetTeamIds,
          startDate: compareStartDate,
          endDate: startDate
        });
      }

      res.json({
        success: true,
        data: {
          summary,
          trends,
          performance,
          comparison,
          dateRange: {
            from: startDate,
            to: endDate,
            granularity
          }
        }
      });

    } catch (error) {
      console.error('Get analytics overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics overview',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get workflow analytics
 * @route GET /analytics/workflows
 * @desc Get detailed analytics for workflows
 * @access Private (team members)
 */
router.get(
  '/workflows',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId, 
        workflowId,
        dateFrom, 
        dateTo,
        sortBy = 'executions',
        sortOrder = 'DESC',
        page = 1,
        limit = 20
      } = req.query;
      const userId = req.user?.id;

      // Get user's accessible teams
      const userTeams = await teamMemberRepository.find({
        where: { userId },
        relations: ['team']
      });

      const teamIds = userTeams.map(utm => utm.team.id);
      const targetTeamIds = teamId ? [teamId] : teamIds;

      // Get workflow analytics
      const workflowAnalytics = await AnalyticsService.getWorkflowAnalytics({
        teamIds: targetTeamIds,
        workflowId: workflowId as string,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
        page: Number(page),
        limit: Number(limit)
      });

      res.json({
        success: true,
        data: workflowAnalytics
      });

    } catch (error) {
      console.error('Get workflow analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflow analytics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get user analytics
 * @route GET /analytics/users
 * @desc Get user activity and engagement analytics
 * @access Private (team managers and owners)
 */
router.get(
  '/users',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId,
        dateFrom, 
        dateTo,
        sortBy = 'activity',
        sortOrder = 'DESC',
        page = 1,
        limit = 20
      } = req.query;
      const userId = req.user?.id;

      // Get user's team and check permissions
      const userMembership = await teamMemberRepository.findOne({
        where: { userId },
        relations: ['team']
      });

      if (!userMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Only managers and owners can view user analytics
      if (!['owner', 'manager'].includes(userMembership.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to view user analytics'
        });
      }

      const targetTeamId = teamId || userMembership.team.id;

      // Get user analytics
      const userAnalytics = await AnalyticsService.getUserAnalytics({
        teamId: targetTeamId,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
        page: Number(page),
        limit: Number(limit)
      });

      res.json({
        success: true,
        data: userAnalytics
      });

    } catch (error) {
      console.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user analytics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== EXECUTION ANALYTICS ====================

/**
 * Get execution analytics
 * @route GET /analytics/executions
 * @desc Get detailed execution analytics and patterns
 * @access Private (team members)
 */
router.get(
  '/executions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId,
        workflowId,
        dateFrom, 
        dateTo,
        status,
        triggerType,
        groupBy = 'day',
        page = 1,
        limit = 50
      } = req.query;
      const userId = req.user?.id;

      // Get user's accessible teams
      const userTeams = await teamMemberRepository.find({
        where: { userId },
        relations: ['team']
      });

      const teamIds = userTeams.map(utm => utm.team.id);
      const targetTeamIds = teamId ? [teamId] : teamIds;

      // Get execution analytics
      const executionAnalytics = await AnalyticsService.getExecutionAnalytics({
        teamIds: targetTeamIds,
        workflowId: workflowId as string,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined,
        status: status as string,
        triggerType: triggerType as string,
        groupBy: groupBy as 'hour' | 'day' | 'week' | 'month',
        page: Number(page),
        limit: Number(limit)
      });

      res.json({
        success: true,
        data: executionAnalytics
      });

    } catch (error) {
      console.error('Get execution analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch execution analytics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get execution performance metrics
 * @route GET /analytics/executions/performance
 * @desc Get performance metrics for workflow executions
 * @access Private (team members)
 */
router.get(
  '/executions/performance',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId,
        workflowId,
        dateFrom, 
        dateTo,
        metric = 'duration'
      } = req.query;
      const userId = req.user?.id;

      // Get user's accessible teams
      const userTeams = await teamMemberRepository.find({
        where: { userId },
        relations: ['team']
      });

      const teamIds = userTeams.map(utm => utm.team.id);
      const targetTeamIds = teamId ? [teamId] : teamIds;

      // Get performance metrics
      const performanceMetrics = await MetricsService.getExecutionPerformanceMetrics({
        teamIds: targetTeamIds,
        workflowId: workflowId as string,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined,
        metric: metric as 'duration' | 'memory' | 'cpu' | 'errors'
      });

      res.json({
        success: true,
        data: performanceMetrics
      });

    } catch (error) {
      console.error('Get execution performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch execution performance metrics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== BUSINESS INTELLIGENCE ====================

/**
 * Get business metrics
 * @route GET /analytics/business
 * @desc Get high-level business metrics and KPIs
 * @access Private (team owners and managers)
 */
router.get(
  '/business',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId,
        dateFrom, 
        dateTo,
        comparisonPeriod = 'previous_period'
      } = req.query;
      const userId = req.user?.id;

      // Get user's team and check permissions
      const userMembership = await teamMemberRepository.findOne({
        where: { userId },
        relations: ['team']
      });

      if (!userMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Only owners and managers can view business metrics
      if (!['owner', 'manager'].includes(userMembership.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to view business metrics'
        });
      }

      const targetTeamId = teamId || userMembership.team.id;

      // Get business metrics
      const businessMetrics = await AnalyticsService.getBusinessMetrics({
        teamId: targetTeamId,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined,
        comparisonPeriod: comparisonPeriod as string
      });

      res.json({
        success: true,
        data: businessMetrics
      });

    } catch (error) {
      console.error('Get business metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business metrics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get ROI analysis
 * @route GET /analytics/roi
 * @desc Get return on investment analysis for workflows
 * @access Private (team owners and managers)
 */
router.get(
  '/roi',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId,
        dateFrom, 
        dateTo,
        workflowId
      } = req.query;
      const userId = req.user?.id;

      // Get user's team and check permissions
      const userMembership = await teamMemberRepository.findOne({
        where: { userId },
        relations: ['team']
      });

      if (!userMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Only owners and managers can view ROI analysis
      if (!['owner', 'manager'].includes(userMembership.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to view ROI analysis'
        });
      }

      const targetTeamId = teamId || userMembership.team.id;

      // Get ROI analysis
      const roiAnalysis = await AnalyticsService.getROIAnalysis({
        teamId: targetTeamId,
        workflowId: workflowId as string,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined
      });

      res.json({
        success: true,
        data: roiAnalysis
      });

    } catch (error) {
      console.error('Get ROI analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ROI analysis',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== PREDICTIVE ANALYTICS ====================

/**
 * Get predictive insights
 * @route GET /analytics/predictions
 * @desc Get AI-powered predictive insights and forecasting
 * @access Private (team owners and managers)
 */
router.get(
  '/predictions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId,
        dateFrom, 
        dateTo,
        forecastHorizon = 30, // days
        modelType = 'time_series'
      } = req.query;
      const userId = req.user?.id;

      // Get user's team and check permissions
      const userMembership = await teamMemberRepository.findOne({
        where: { userId },
        relations: ['team']
      });

      if (!userMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Only owners and managers can view predictive insights
      if (!['owner', 'manager'].includes(userMembership.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to view predictive insights'
        });
      }

      const targetTeamId = teamId || userMembership.team.id;

      // Get predictive insights
      const predictions = await AnalyticsService.getPredictiveInsights({
        teamId: targetTeamId,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined,
        forecastHorizon: Number(forecastHorizon),
        modelType: modelType as string
      });

      res.json({
        success: true,
        data: predictions
      });

    } catch (error) {
      console.error('Get predictive insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch predictive insights',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get anomaly detection
 * @route GET /analytics/anomalies
 * @desc Get anomaly detection and alert insights
 * @access Private (team owners and managers)
 */
router.get(
  '/anomalies',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId,
        dateFrom, 
        dateTo,
        sensitivity = 'medium',
        alertType = 'all'
      } = req.query;
      const userId = req.user?.id;

      // Get user's team and check permissions
      const userMembership = await teamMemberRepository.findOne({
        where: { userId },
        relations: ['team']
      });

      if (!userMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Only owners and managers can view anomaly detection
      if (!['owner', 'manager'].includes(userMembership.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to view anomaly detection'
        });
      }

      const targetTeamId = teamId || userMembership.team.id;

      // Get anomaly detection
      const anomalies = await AnalyticsService.getAnomalyDetection({
        teamId: targetTeamId,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined,
        sensitivity: sensitivity as 'low' | 'medium' | 'high',
        alertType: alertType as 'all' | 'performance' | 'usage' | 'errors'
      });

      res.json({
        success: true,
        data: anomalies
      });

    } catch (error) {
      console.error('Get anomaly detection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch anomaly detection',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== REPORTS AND EXPORTS ====================

/**
 * Generate custom report
 * @route POST /analytics/reports
 * @desc Generate a custom analytics report
 * @access Private (team owners and managers)
 */
router.post(
  '/reports',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        reportType,
        teamId,
        dateFrom, 
        dateTo,
        filters = {},
        metrics = [],
        format = 'json',
        schedule = null
      } = req.body;
      const userId = req.user?.id;

      // Get user's team and check permissions
      const userMembership = await teamMemberRepository.findOne({
        where: { userId },
        relations: ['team']
      });

      if (!userMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Only owners and managers can generate reports
      if (!['owner', 'manager'].includes(userMembership.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to generate reports'
        });
      }

      const targetTeamId = teamId || userMembership.team.id;

      // Generate report
      const report = await ReportService.generateReport({
        type: reportType,
        teamId: targetTeamId,
        userId: userId!,
        startDate: dateFrom ? new Date(dateFrom) : undefined,
        endDate: dateTo ? new Date(dateTo) : undefined,
        filters,
        metrics,
        format: format as 'json' | 'csv' | 'pdf',
        schedule
      });

      res.status(201).json({
        success: true,
        message: 'Report generated successfully',
        data: report
      });

    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate report',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get report list
 * @route GET /analytics/reports
 * @desc Get list of generated reports
 * @access Private (team owners and managers)
 */
router.get(
  '/reports',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        teamId,
        page = 1,
        limit = 20
      } = req.query;
      const userId = req.user?.id;

      // Get user's team and check permissions
      const userMembership = await teamMemberRepository.findOne({
        where: { userId },
        relations: ['team']
      });

      if (!userMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Only owners and managers can view reports
      if (!['owner', 'manager'].includes(userMembership.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to view reports'
        });
      }

      const targetTeamId = teamId || userMembership.team.id;

      // Get reports
      const reports = await ReportService.getReports({
        teamId: targetTeamId,
        userId: userId!,
        page: Number(page),
        limit: Number(limit)
      });

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reports',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Download report
 * @route GET /analytics/reports/:reportId/download
 * @desc Download a generated report
 * @access Private (report owner or team manager/owner)
 */
router.get(
  '/reports/:reportId/download',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reportId } = req.params;
      const userId = req.user?.id;

      // Get report
      const report = await ReportService.getReportById(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Check permissions
      const userMembership = await teamMemberRepository.findOne({
        where: { userId },
        relations: ['team']
      });

      const isOwner = report.createdBy === userId;
      const isTeamManager = userMembership && ['owner', 'manager'].includes(userMembership.role);

      if (!isOwner && !isTeamManager) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to download this report'
        });
      }

      // Download report
      const downloadUrl = await ReportService.generateDownloadUrl(reportId);

      res.json({
        success: true,
        data: {
          downloadUrl,
          fileName: report.fileName,
          format: report.format,
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        }
      });

    } catch (error) {
      console.error('Download report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download report',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== REAL-TIME ANALYTICS ====================

/**
 * Get real-time metrics
 * @route GET /analytics/realtime
 * @desc Get real-time metrics and live data
 * @access Private (team members)
 */
router.get(
  '/realtime',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId } = req.query;
      const userId = req.user?.id;

      // Get user's accessible teams
      const userTeams = await teamMemberRepository.find({
        where: { userId },
        relations: ['team']
      });

      const teamIds = userTeams.map(utm => utm.team.id);
      const targetTeamIds = teamId ? [teamId] : teamIds;

      if (targetTeamIds.length === 0) {
        return res.json({
          success: true,
          data: {
            activeExecutions: 0,
            queuedExecutions: 0,
            activeUsers: 0,
            systemLoad: 0,
            lastUpdate: new Date()
          }
        });
      }

      // Get real-time metrics
      const realTimeMetrics = await AnalyticsService.getRealTimeMetrics({
        teamIds: targetTeamIds
      });

      res.json({
        success: true,
        data: realTimeMetrics
      });

    } catch (error) {
      console.error('Get real-time metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch real-time metrics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Track custom event
 * @route POST /analytics/events
 * @desc Track a custom analytics event
 * @access Private (team members)
 */
router.post(
  '/events',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        eventType,
        eventData = {},
        teamId,
        workflowId,
        metadata = {}
      } = req.body;
      const userId = req.user?.id;

      // Create analytics event
      const event = new AnalyticsEvent();
      event.userId = userId!;
      event.teamId = teamId;
      event.workflowId = workflowId;
      event.eventType = eventType;
      event.eventData = eventData;
      event.metadata = {
        ...metadata,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      };

      const savedEvent = await eventRepository.save(event);

      res.status(201).json({
        success: true,
        message: 'Event tracked successfully',
        data: { eventId: savedEvent.id }
      });

    } catch (error) {
      console.error('Track event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track event',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

export default router;