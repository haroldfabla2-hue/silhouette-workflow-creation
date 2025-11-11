import { AppDataSource } from '../config/database';
import { WorkflowExecution, Workflow, Team, TeamMember, AnalyticsEvent, User } from '../entities';
import { EventEmitter } from 'events';

interface MetricData {
  timestamp: Date;
  value: number;
  tags?: Record<string, any>;
  metadata?: any;
}

interface PerformanceMetrics {
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  errorRate: number;
  availability: number;
}

interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export class MetricsService extends EventEmitter {
  private executionRepository: any;
  private workflowRepository: any;
  private teamMemberRepository: any;
  private eventRepository: any;
  private userRepository: any;

  // In-memory storage for real-time metrics (in production, use Redis or similar)
  private realTimeMetrics: Map<string, MetricData[]> = new Map();
  private metricAggregations: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeRepositories();
    this.setupPeriodicAggregations();
  }

  private initializeRepositories() {
    this.executionRepository = AppDataSource.getRepository(WorkflowExecution);
    this.workflowRepository = AppDataSource.getRepository(Workflow);
    this.teamMemberRepository = AppDataSource.getRepository(TeamMember);
    this.eventRepository = AppDataSource.getRepository(AnalyticsEvent);
    this.userRepository = AppDataSource.getRepository(User);
  }

  private setupPeriodicAggregations() {
    // Aggregate metrics every minute
    setInterval(() => {
      this.aggregateMetrics();
    }, 60000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  // ==================== REAL-TIME METRICS ====================

  /**
   * Record a real-time metric
   */
  async recordMetric(metricName: string, value: number, tags: Record<string, any> = {}, metadata: any = {}): Promise<void> {
    const metricData: MetricData = {
      timestamp: new Date(),
      value,
      tags,
      metadata
    };

    // Store in memory for real-time access
    if (!this.realTimeMetrics.has(metricName)) {
      this.realTimeMetrics.set(metricName, []);
    }
    
    this.realTimeMetrics.get(metricName)!.push(metricData);

    // Keep only recent metrics in memory (last 5 minutes)
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    this.realTimeMetrics.set(
      metricName, 
      this.realTimeMetrics.get(metricName)!.filter(m => m.timestamp > cutoff)
    );

    // Emit metric event
    this.emit('metric:recorded', { metricName, data: metricData });

    // Update aggregation
    this.updateAggregation(metricName, metricData);
  }

  /**
   * Get real-time metric value
   */
  async getRealTimeMetric(metricName: string, timeWindow: number = 300000): Promise<any> {
    const metrics = this.realTimeMetrics.get(metricName) || [];
    const cutoff = new Date(Date.now() - timeWindow);
    
    const recentMetrics = metrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        count: 0,
        trend: 'stable'
      };
    }

    const values = recentMetrics.map(m => m.value);
    const current = values[values.length - 1];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate trend (simple linear regression)
    const trend = this.calculateTrend(recentMetrics);

    return {
      current,
      average: Math.round(average * 100) / 100,
      min,
      max,
      count: values.length,
      trend,
      data: recentMetrics
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<any> {
    const metrics = await Promise.all([
      this.getRealTimeMetric('active_workflows', 60000),
      this.getRealTimeMetric('active_executions', 60000),
      this.getRealTimeMetric('response_time', 60000),
      this.getRealTimeMetric('error_rate', 60000),
      this.getRealTimeMetric('memory_usage', 60000),
      this.getRealTimeMetric('cpu_usage', 60000)
    ]);

    const [activeWorkflows, activeExecutions, responseTime, errorRate, memoryUsage, cpuUsage] = metrics;

    // Calculate overall health score
    const healthScore = this.calculateHealthScore({
      responseTime: responseTime.average,
      errorRate: errorRate.average,
      memoryUsage: memoryUsage.average,
      cpuUsage: cpuUsage.average
    });

    return {
      status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
      score: healthScore,
      metrics: {
        activeWorkflows: activeWorkflows.current,
        activeExecutions: activeExecutions.current,
        averageResponseTime: responseTime.average,
        errorRate: errorRate.average,
        memoryUsage: memoryUsage.average,
        cpuUsage: cpuUsage.average
      },
      timestamp: new Date()
    };
  }

  // ==================== WORKFLOW PERFORMANCE METRICS ====================

  /**
   * Get execution performance metrics
   */
  async getExecutionPerformanceMetrics(params: {
    teamIds?: string[];
    workflowId?: string;
    startDate?: Date;
    endDate?: Date;
    metric: 'duration' | 'memory' | 'cpu' | 'errors';
  }): Promise<any> {
    const { teamIds, workflowId, startDate, endDate, metric } = params;

    let query = this.executionRepository
      .createQueryBuilder('execution')
      .leftJoin('execution.workflow', 'workflow')
      .leftJoin('workflow.team', 'team')
      .where('workflow.teamId IN (:...teamIds)', { teamIds: teamIds || [] });

    if (workflowId) {
      query = query.andWhere('execution.workflowId = :workflowId', { workflowId });
    }

    if (startDate && endDate) {
      query = query.andWhere('execution.startedAt >= :startDate AND execution.startedAt <= :endDate', { 
        startDate, 
        endDate 
      });
    }

    // Get execution data based on metric type
    let performanceData;
    switch (metric) {
      case 'duration':
        performanceData = await query
          .select([
            'execution.id',
            'execution.duration',
            'execution.status',
            'workflow.name as workflowName',
            'execution.startedAt'
          ])
          .getRawMany();
        break;
      case 'memory':
        performanceData = await query
          .select([
            'execution.id',
            'execution.metadata->>\'memoryUsage\' as memoryUsage',
            'execution.status',
            'workflow.name as workflowName',
            'execution.startedAt'
          ])
          .getRawMany();
        break;
      case 'cpu':
        performanceData = await query
          .select([
            'execution.id',
            'execution.metadata->>\'cpuUsage\' as cpuUsage',
            'execution.status',
            'workflow.name as workflowName',
            'execution.startedAt'
          ])
          .getRawMany();
        break;
      case 'errors':
        performanceData = await query
          .select([
            'execution.id',
            'execution.errorMessage',
            'execution.status',
            'workflow.name as workflowName',
            'execution.startedAt'
          ])
          .where('execution.status = :status', { status: 'failed' })
          .getRawMany();
        break;
    }

    return this.processPerformanceData(performanceData, metric);
  }

  /**
   * Get workflow reliability metrics
   */
  async getWorkflowReliabilityMetrics(teamId: string, workflowId?: string): Promise<any> {
    let query = this.executionRepository
      .createQueryBuilder('execution')
      .leftJoin('execution.workflow', 'workflow')
      .where('workflow.teamId = :teamId', { teamId });

    if (workflowId) {
      query = query.andWhere('execution.workflowId = :workflowId', { workflowId });
    }

    // Get execution counts by status
    const statusMetrics = await query
      .select(['execution.status', 'COUNT(*) as count'])
      .groupBy('execution.status')
      .getRawMany();

    // Calculate reliability metrics
    const total = statusMetrics.reduce((sum, stat) => sum + Number(stat.count), 0);
    const successful = Number(statusMetrics.find(s => s.status === 'completed')?.count || 0);
    const failed = Number(statusMetrics.find(s => s.status === 'failed')?.count || 0);
    const running = Number(statusMetrics.find(s => s.status === 'running')?.count || 0);

    // Get average duration for successful executions
    const avgDurationResult = await query
      .select('AVG(execution.duration) as avgDuration')
      .where('execution.status = :status', { status: 'completed' })
      .getRawOne();

    // Get failure rate trend (last 7 days)
    const failureTrend = await query
      .select([
        'DATE(execution.startedAt) as date',
        'COUNT(CASE WHEN execution.status = \'failed\' THEN 1 END) as failed',
        'COUNT(*) as total'
      ])
      .where('execution.startedAt >= :weekAgo', { weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
      .groupBy('DATE(execution.startedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      reliability: {
        successRate: total > 0 ? Math.round((successful / total) * 10000) / 100 : 0,
        failureRate: total > 0 ? Math.round((failed / total) * 10000) / 100 : 0,
        averageDuration: Number(avgDurationResult?.avgDuration || 0),
        totalExecutions: total,
        successfulExecutions: successful,
        failedExecutions: failed,
        runningExecutions: running
      },
      trends: failureTrend.map(trend => ({
        date: trend.date,
        failureRate: Number(trend.total) > 0 ? 
          Math.round((Number(trend.failed) / Number(trend.total)) * 10000) / 100 : 0
      })),
      status: this.getReliabilityStatus(successful, total)
    };
  }

  // ==================== USAGE ANALYTICS ====================

  /**
   * Get user activity metrics
   */
  async getUserActivityMetrics(teamId: string, dateFrom: Date, dateTo: Date): Promise<any> {
    // Get team members
    const teamMembers = await this.teamMemberRepository.find({
      where: { teamId },
      relations: ['user']
    });

    const userIds = teamMembers.map(member => member.userId);

    // Get user activity from executions
    const executionActivity = await this.executionRepository
      .createQueryBuilder('execution')
      .leftJoin('execution.workflow', 'workflow')
      .where('workflow.teamId = :teamId', { teamId })
      .andWhere('execution.triggeredBy IN (:...userIds)', { userIds })
      .andWhere('execution.startedAt >= :dateFrom AND execution.startedAt <= :dateTo', { dateFrom, dateTo })
      .select([
        'execution.triggeredBy',
        'COUNT(*) as executionCount',
        'COUNT(CASE WHEN execution.status = \'completed\' THEN 1 END) as successfulExecutions',
        'AVG(execution.duration) as avgDuration'
      ])
      .groupBy('execution.triggeredBy')
      .getRawMany();

    // Get user activity from events
    const eventActivity = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.userId IN (:...userIds)', { userIds })
      .andWhere('event.createdAt >= :dateFrom AND event.createdAt <= :dateTo', { dateFrom, dateTo })
      .select([
        'event.userId',
        'COUNT(*) as eventCount',
        'event.eventType'
      ])
      .groupBy('event.userId, event.eventType')
      .getRawMany();

    // Calculate user engagement scores
    const userEngagement = teamMembers.map(member => {
      const userExecutions = executionActivity.find(e => e.triggeredBy === member.userId) || {};
      const userEvents = eventActivity.filter(e => e.userId === member.userId);
      
      const executionCount = Number(userExecutions.executionCount || 0);
      const successfulCount = Number(userExecutions.successfulExecutions || 0);
      const eventCount = userEvents.reduce((sum, e) => sum + Number(e.eventCount || 0), 0);
      
      const engagementScore = this.calculateEngagementScore(executionCount, successfulCount, eventCount);
      
      return {
        userId: member.userId,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          role: member.role
        },
        metrics: {
          executionCount,
          successfulExecutions: successfulCount,
          successRate: executionCount > 0 ? Math.round((successfulCount / executionCount) * 10000) / 100 : 0,
          averageDuration: Math.round(Number(userExecutions.avgDuration || 0)),
          eventCount,
          engagementScore
        }
      };
    });

    return {
      summary: {
        totalUsers: userEngagement.length,
        activeUsers: userEngagement.filter(u => u.metrics.executionCount > 0).length,
        totalExecutions: executionActivity.reduce((sum, e) => sum + Number(e.executionCount), 0),
        totalEvents: eventActivity.reduce((sum, e) => sum + Number(e.eventCount), 0),
        averageEngagement: userEngagement.reduce((sum, u) => sum + u.metrics.engagementScore, 0) / userEngagement.length
      },
      users: userEngagement.sort((a, b) => b.metrics.engagementScore - a.metrics.engagementScore)
    };
  }

  /**
   * Get feature usage metrics
   */
  async getFeatureUsageMetrics(teamId: string, dateFrom: Date, dateTo: Date): Promise<any> {
    // Get events for feature usage
    const featureEvents = await this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('event.team', 'team')
      .where('team.id = :teamId', { teamId })
      .andWhere('event.createdAt >= :dateFrom AND event.createdAt <= :dateTo', { dateFrom, dateTo })
      .select([
        'event.eventType',
        'COUNT(*) as usageCount',
        'COUNT(DISTINCT event.userId) as uniqueUsers'
      ])
      .groupBy('event.eventType')
      .getRawMany();

    // Calculate feature adoption rates
    const teamSize = await this.teamMemberRepository.count({
      where: { teamId, isActive: true }
    });

    return {
      features: featureEvents.map(event => ({
        name: event.eventType,
        usageCount: Number(event.usageCount),
        uniqueUsers: Number(event.uniqueUsers),
        adoptionRate: teamSize > 0 ? Math.round((Number(event.uniqueUsers) / teamSize) * 10000) / 100 : 0,
        popularity: this.calculateFeaturePopularity(event)
      })),
      summary: {
        totalFeatureUsage: featureEvents.reduce((sum, event) => sum + Number(event.usageCount), 0),
        uniqueFeatures: featureEvents.length,
        averageAdoptionRate: featureEvents.length > 0 ? 
          featureEvents.reduce((sum, event) => {
            return sum + (teamSize > 0 ? (Number(event.uniqueUsers) / teamSize) * 100 : 0);
          }, 0) / featureEvents.length : 0
      }
    };
  }

  // ==================== BUSINESS METRICS ====================

  /**
   * Calculate ROI metrics
   */
  async calculateROIMetrics(teamId: string, dateFrom: Date, dateTo: Date): Promise<any> {
    // Get execution time saved (estimated)
    const executionMetrics = await this.executionRepository
      .createQueryBuilder('execution')
      .leftJoin('execution.workflow', 'workflow')
      .where('workflow.teamId = :teamId', { teamId })
      .andWhere('execution.status = :status', { status: 'completed' })
      .andWhere('execution.startedAt >= :dateFrom AND execution.startedAt <= :dateTo', { dateFrom, dateTo })
      .select([
        'SUM(execution.duration) as totalDuration',
        'COUNT(*) as completedExecutions'
      ])
      .getRawOne();

    // Estimate manual processing time vs automated (assuming 10x faster automation)
    const totalExecutionTime = Number(executionMetrics?.totalDuration || 0) / 1000; // Convert to seconds
    const estimatedManualTime = totalExecutionTime * 10; // Estimated 10x more time if done manually
    const timeSaved = estimatedManualTime - totalExecutionTime;

    // Get team size for cost calculations
    const teamSize = await this.teamMemberRepository.count({
      where: { teamId, isActive: true }
    });

    // Estimate costs (these would be configured per organization)
    const hourlyRate = 50; // USD per hour (configurable)
    const timeSavedHours = timeSaved / 3600;
    const costSavings = timeSavedHours * hourlyRate;
    const developmentCost = teamSize * 1000; // Estimated development cost per team member
    const roi = developmentCost > 0 ? ((costSavings - developmentCost) / developmentCost) * 100 : 0;

    return {
      timeMetrics: {
        totalExecutionTime: Math.round(totalExecutionTime),
        estimatedManualTime: Math.round(estimatedManualTime),
        timeSaved: Math.round(timeSaved),
        timeSavedHours: Math.round(timeSavedHours * 100) / 100
      },
      costMetrics: {
        costSavings: Math.round(costSavings * 100) / 100,
        developmentCost,
        netSavings: Math.round((costSavings - developmentCost) * 100) / 100
      },
      roi: {
        percentage: Math.round(roi * 100) / 100,
        paybackPeriod: costSavings > 0 ? Math.round((developmentCost / costSavings) * 30) : 0, // Days
        status: roi > 0 ? 'profitable' : roi > -50 ? 'breakeven' : 'loss'
      },
      efficiency: {
        executionsCompleted: Number(executionMetrics?.completedExecutions || 0),
        averageTimePerExecution: executionMetrics?.completedExecutions > 0 ? 
          Math.round(totalExecutionTime / Number(executionMetrics.completedExecutions)) : 0,
        productivityGain: Math.round((timeSaved / estimatedManualTime) * 10000) / 100
      }
    };
  }

  /**
   * Get business KPIs
   */
  async getBusinessKPIs(teamId: string, dateFrom: Date, dateTo: Date): Promise<any> {
    // Get workflow performance KPIs
    const workflowKPIs = await this.getWorkflowReliabilityMetrics(teamId);
    
    // Get user engagement KPIs
    const engagementKPIs = await this.getUserActivityMetrics(teamId, dateFrom, dateTo);
    
    // Get feature usage KPIs
    const featureKPIs = await this.getFeatureUsageMetrics(teamId, dateFrom, dateTo);

    // Calculate business health score
    const healthScore = this.calculateBusinessHealthScore({
      reliability: workflowKPIs.reliability.successRate,
      engagement: engagementKPIs.summary.averageEngagement,
      adoption: featureKPIs.summary.averageAdoptionRate
    });

    return {
      overall: {
        healthScore,
        status: this.getBusinessHealthStatus(healthScore),
        lastUpdated: new Date()
      },
      performance: {
        workflowSuccessRate: workflowKPIs.reliability.successRate,
        averageExecutionTime: workflowKPIs.reliability.averageDuration,
        totalExecutions: workflowKPIs.reliability.totalExecutions
      },
      engagement: {
        activeUserRate: engagementKPIs.summary.teamSize > 0 ? 
          Math.round((engagementKPJSummary.activeUsers / engagementKPIs.summary.totalUsers) * 10000) / 100 : 0,
        averageUserEngagement: Math.round(engagementKPIs.summary.averageEngagement),
        totalUserActivity: engagementKPIs.summary.totalEvents
      },
      adoption: {
        featureAdoptionRate: featureKPIs.summary.averageAdoptionRate,
        popularFeatures: featureKPIs.features
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 5)
          .map(f => ({ name: f.name, usageCount: f.usageCount }))
      }
    };
  }

  // ==================== PREDICTIVE ANALYTICS ====================

  /**
   * Generate performance predictions
   */
  async generatePerformancePredictions(teamId: string, forecastDays: number = 30): Promise<any> {
    // Get historical performance data (last 90 days)
    const historicalData = await this.executionRepository
      .createQueryBuilder('execution')
      .leftJoin('execution.workflow', 'workflow')
      .where('workflow.teamId = :teamId', { teamId })
      .andWhere('execution.startedAt >= :startDate', { 
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) 
      })
      .select([
        'DATE(execution.startedAt) as date',
        'COUNT(*) as executionCount',
        'AVG(execution.duration) as avgDuration',
        'COUNT(CASE WHEN execution.status = \'completed\' THEN 1 END) as successful',
        'COUNT(CASE WHEN execution.status = \'failed\' THEN 1 END) as failed'
      ])
      .groupBy('DATE(execution.startedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    if (historicalData.length < 7) {
      return {
        error: 'Insufficient historical data for predictions',
        minimumDataPoints: 7,
        available: historicalData.length
      };
    }

    // Apply simple time series forecasting
    const predictions = this.applyTimeSeriesForecast(historicalData, forecastDays);

    return {
      historicalPeriod: {
        startDate: historicalData[0]?.date,
        endDate: historicalData[historicalData.length - 1]?.date,
        dataPoints: historicalData.length
      },
      forecast: {
        period: forecastDays,
        predictions: predictions.daily,
        confidence: predictions.confidence
      },
      insights: this.generateForecastInsights(predictions),
      recommendations: this.generateOptimizationRecommendations(predictions)
    };
  }

  /**
   * Detect performance anomalies
   */
  async detectPerformanceAnomalies(teamId: string, sensitivity: 'low' | 'medium' | 'high' = 'medium'): Promise<any> {
    // Get recent performance data
    const recentData = await this.executionRepository
      .createQueryBuilder('execution')
      .leftJoin('execution.workflow', 'workflow')
      .where('workflow.teamId = :teamId', { teamId })
      .andWhere('execution.startedAt >= :startDate', { 
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      })
      .select([
        'execution.id',
        'execution.duration',
        'execution.status',
        'execution.startedAt',
        'workflow.name as workflowName'
      ])
      .getRawMany();

    const anomalies = [];
    const baselineData = await this.getBaselinePerformance(teamId);

    // Detect duration anomalies
    const durationAnomalies = this.detectAnomalies(
      recentData.map(d => ({ value: Number(d.duration), timestamp: d.startedAt })),
      baselineData.duration,
      sensitivity
    );

    anomalies.push(...durationAnomalies.map(anomaly => ({
      type: 'duration',
      severity: anomaly.severity,
      currentValue: anomaly.value,
      baselineValue: anomaly.baseline,
      deviation: anomaly.deviation,
      workflow: recentData.find(d => d.id === anomaly.id)?.workflowName,
      timestamp: anomaly.timestamp
    })));

    // Detect failure rate anomalies
    const recentFailures = recentData.filter(d => d.status === 'failed').length;
    const failureRate = recentData.length > 0 ? (recentFailures / recentData.length) * 100 : 0;
    const baselineFailureRate = baselineData.failureRate;
    
    if (Math.abs(failureRate - baselineFailureRate) > this.getAnomalyThreshold(sensitivity)) {
      anomalies.push({
        type: 'failure_rate',
        severity: Math.abs(failureRate - baselineFailureRate) > baselineFailureRate * 2 ? 'high' : 'medium',
        currentValue: failureRate,
        baselineValue: baselineFailureRate,
        deviation: failureRate - baselineFailureRate
      });
    }

    return {
      scanTime: new Date(),
      anomalies: anomalies.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      summary: {
        totalAnomalies: anomalies.length,
        highSeverity: anomalies.filter(a => a.severity === 'high').length,
        mediumSeverity: anomalies.filter(a => a.severity === 'medium').length,
        lowSeverity: anomalies.filter(a => a.severity === 'low').length
      }
    };
  }

  // ==================== AGGREGATION AND CLEANUP ====================

  /**
   * Aggregate metrics for storage
   */
  private aggregateMetrics(): void {
    for (const [metricName, data] of this.realTimeMetrics.entries()) {
      if (data.length === 0) continue;

      const aggregated = {
        timestamp: new Date(),
        count: data.length,
        sum: data.reduce((sum, d) => sum + d.value, 0),
        min: Math.min(...data.map(d => d.value)),
        max: Math.max(...data.map(d => d.value)),
        avg: data.reduce((sum, d) => sum + d.value, 0) / data.length
      };

      // Store aggregated data (in production, this would go to a time-series database)
      this.metricAggregations.set(`${metricName}_${Date.now()}`, aggregated);
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [key, data] of this.realTimeMetrics.entries()) {
      this.realTimeMetrics.set(
        key,
        data.filter(m => m.timestamp > cutoff)
      );
    }

    // Clean up old aggregations
    for (const key of this.metricAggregations.keys()) {
      if (new Date(key.split('_')[1]) < cutoff) {
        this.metricAggregations.delete(key);
      }
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Process performance data
   */
  private processPerformanceData(data: any[], metric: string): any {
    if (data.length === 0) {
      return { summary: {}, trends: [] };
    }

    const values = data.map(d => {
      switch (metric) {
        case 'duration': return Number(d.duration) / 1000; // Convert to seconds
        case 'memory': return Number(d.memoryUsage) || 0;
        case 'cpu': return Number(d.cpuUsage) || 0;
        case 'errors': return 1; // Count of errors
        default: return 0;
      }
    });

    return {
      summary: {
        count: values.length,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: this.calculateMedian(values),
        p95: this.calculatePercentile(values, 95),
        p99: this.calculatePercentile(values, 99)
      },
      trends: this.createTimeSeriesData(data, metric),
      byWorkflow: this.groupByWorkflow(data, metric)
    };
  }

  /**
   * Create time series data
   */
  private createTimeSeriesData(data: any[], metric: string): TimeSeriesData[] {
    return data.map(d => ({
      timestamp: new Date(d.startedAt),
      value: this.extractMetricValue(d, metric)
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Extract metric value from data point
   */
  private extractMetricValue(data: any, metric: string): number {
    switch (metric) {
      case 'duration': return Number(data.duration) / 1000;
      case 'memory': return Number(data.memoryUsage) || 0;
      case 'cpu': return Number(data.cpuUsage) || 0;
      case 'errors': return data.status === 'failed' ? 1 : 0;
      default: return 0;
    }
  }

  /**
   * Group data by workflow
   */
  private groupByWorkflow(data: any[], metric: string): any {
    const grouped = data.reduce((acc, item) => {
      const workflowName = item.workflowName || 'Unknown';
      if (!acc[workflowName]) {
        acc[workflowName] = [];
      }
      acc[workflowName].push(this.extractMetricValue(item, metric));
      return acc;
    }, {});

    return Object.entries(grouped).map(([workflow, values]) => ({
      workflow,
      count: values.length,
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    }));
  }

  /**
   * Calculate trend
   */
  private calculateTrend(data: MetricData[]): string {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(executions: number, successful: number, events: number): number {
    const executionScore = Math.min(executions * 10, 50);
    const successScore = executions > 0 ? (successful / executions) * 30 : 0;
    const eventScore = Math.min(events * 2, 20);

    return Math.round(executionScore + successScore + eventScore);
  }

  /**
   * Calculate feature popularity
   */
  private calculateFeaturePopularity(event: any): string {
    const usage = Number(event.usageCount);
    const uniqueUsers = Number(event.uniqueUsers);
    const ratio = uniqueUsers > 0 ? usage / uniqueUsers : 0;

    if (ratio > 10) return 'very_popular';
    if (ratio > 5) return 'popular';
    if (ratio > 2) return 'moderately_popular';
    return 'niche';
  }

  /**
   * Calculate median
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Apply time series forecast
   */
  private applyTimeSeriesForecast(historicalData: any[], forecastDays: number): any {
    // Simple linear regression forecast
    const dailyData = historicalData.map(d => ({
      date: new Date(d.date),
      value: Number(d.executionCount)
    }));

    // Calculate trend
    const n = dailyData.length;
    const sumX = dailyData.reduce((sum, _, i) => sum + i, 0);
    const sumY = dailyData.reduce((sum, d) => sum + d.value, 0);
    const sumXY = dailyData.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumX2 = dailyData.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate predictions
    const predictions = [];
    const lastDate = dailyData[dailyData.length - 1].date;

    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);
      
      const predictedValue = Math.max(0, slope * (n + i - 1) + intercept);
      
      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predictedExecutions: Math.round(predictedValue)
      });
    }

    return {
      daily: predictions,
      confidence: this.calculateForecastConfidence(historicalData),
      trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable'
    };
  }

  /**
   * Calculate forecast confidence
   */
  private calculateForecastConfidence(historicalData: any[]): number {
    // Simple confidence calculation based on data consistency
    const values = historicalData.map(d => Number(d.executionCount));
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Higher CV means lower confidence
    const confidence = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));
    return Math.round(confidence);
  }

  /**
   * Generate forecast insights
   */
  private generateForecastInsights(predictions: any): string[] {
    const insights = [];
    
    const totalPredicted = predictions.daily.reduce((sum, p) => sum + p.predictedExecutions, 0);
    const avgDaily = totalPredicted / predictions.daily.length;
    
    if (predictions.trend === 'increasing') {
      insights.push(`Workflow usage is expected to increase over the next ${predictions.daily.length} days`);
    } else if (predictions.trend === 'decreasing') {
      insights.push(`Workflow usage is expected to decrease over the next ${predictions.daily.length} days`);
    }
    
    if (predictions.confidence > 80) {
      insights.push(`High confidence forecast (${predictions.confidence}%) based on consistent historical patterns`);
    } else if (predictions.confidence < 60) {
      insights.push(`Low confidence forecast (${predictions.confidence}%) due to high variability in historical data`);
    }
    
    insights.push(`Average daily execution count predicted: ${Math.round(avgDaily)}`);

    return insights;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(predictions: any): string[] {
    const recommendations = [];
    
    if (predictions.trend === 'increasing') {
      recommendations.push('Consider scaling infrastructure to handle increased load');
      recommendations.push('Monitor resource usage more closely during peak periods');
    }
    
    if (predictions.trend === 'decreasing') {
      recommendations.push('Investigate reasons for decreased usage and consider optimization initiatives');
      recommendations.push('Review workflow efficiency and user experience');
    }
    
    if (predictions.confidence < 70) {
      recommendations.push('Collect more data to improve forecast accuracy');
      recommendations.push('Consider external factors that may influence usage patterns');
    }

    return recommendations;
  }

  /**
   * Get baseline performance metrics
   */
  private async getBaselinePerformance(teamId: string): Promise<any> {
    // Get baseline data from last 30 days
    const baselineData = await this.executionRepository
      .createQueryBuilder('execution')
      .leftJoin('execution.workflow', 'workflow')
      .where('workflow.teamId = :teamId', { teamId })
      .andWhere('execution.startedAt >= :startDate', { 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      })
      .select([
        'AVG(execution.duration) as avgDuration',
        'COUNT(CASE WHEN execution.status = \'failed\' THEN 1 END) * 100.0 / COUNT(*) as failureRate'
      ])
      .getRawOne();

    return {
      duration: Number(baselineData?.avgDuration || 0),
      failureRate: Number(baselineData?.failureRate || 0)
    };
  }

  /**
   * Detect anomalies using statistical methods
   */
  private detectAnomalies(data: any[], baseline: number, sensitivity: string): any[] {
    const threshold = this.getAnomalyThreshold(sensitivity);
    const anomalies = [];

    for (const point of data) {
      const deviation = Math.abs(point.value - baseline) / baseline;
      if (deviation > threshold) {
        anomalies.push({
          id: point.id || Math.random().toString(36).substr(2, 9),
          value: point.value,
          baseline,
          deviation,
          timestamp: point.timestamp,
          severity: deviation > threshold * 2 ? 'high' : 'medium'
        });
      }
    }

    return anomalies;
  }

  /**
   * Get anomaly detection threshold
   */
  private getAnomalyThreshold(sensitivity: string): number {
    const thresholds = {
      low: 2.0,      // 200% deviation
      medium: 1.5,   // 150% deviation
      high: 1.0      // 100% deviation
    };
    return thresholds[sensitivity] || thresholds.medium;
  }

  /**
   * Update metric aggregation
   */
  private updateAggregation(metricName: string, data: MetricData): void {
    if (!this.metricAggregations.has(metricName)) {
      this.metricAggregations.set(metricName, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        lastUpdate: new Date()
      });
    }

    const agg = this.metricAggregations.get(metricName);
    agg.count++;
    agg.sum += data.value;
    agg.min = Math.min(agg.min, data.value);
    agg.max = Math.max(agg.max, data.value);
    agg.lastUpdate = new Date();
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(metrics: any): number {
    let score = 100;

    // Penalize high response time
    if (metrics.responseTime > 1000) score -= 20;
    else if (metrics.responseTime > 500) score -= 10;

    // Penalize high error rate
    if (metrics.errorRate > 5) score -= 30;
    else if (metrics.errorRate > 2) score -= 15;

    // Penalize high resource usage
    if (metrics.memoryUsage > 80) score -= 25;
    else if (metrics.memoryUsage > 60) score -= 10;

    if (metrics.cpuUsage > 80) score -= 25;
    else if (metrics.cpuUsage > 60) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Get reliability status
   */
  private getReliabilityStatus(successful: number, total: number): string {
    const rate = total > 0 ? (successful / total) * 100 : 0;
    if (rate >= 95) return 'excellent';
    if (rate >= 90) return 'good';
    if (rate >= 80) return 'fair';
    return 'poor';
  }

  /**
   * Get business health status
   */
  private getBusinessHealthStatus(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Calculate business health score
   */
  private calculateBusinessHealthScore(kpis: any): number {
    const { reliability, engagement, adoption } = kpis;
    
    // Weight different factors
    const weights = {
      reliability: 0.4,
      engagement: 0.3,
      adoption: 0.3
    };

    const score = (
      (reliability * weights.reliability) +
      (engagement * weights.engagement) +
      (adoption * weights.adoption)
    );

    return Math.round(score);
  }
}

export default MetricsService;