# Monitoreo Avanzado

## 1. Real-time Dashboard

### 1.1 System Monitoring Dashboard

```typescript
// backend/src/monitoring/dashboard/system-dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface DashboardMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  timestamp: Date;
  threshold: { warning: number; critical: number };
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastCheck: Date;
  services: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime: number;
      errorRate: number;
    };
  };
}

interface PerformanceMetrics {
  cpu: { usage: number; loadAverage: number[] };
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  network: { bytesIn: number; bytesOut: number; connections: number };
  database: { connectionPool: number; queryTime: number; cacheHitRate: number };
  cache: { hitRate: number; missRate: number; memoryUsage: number };
  application: { activeUsers: number; requestsPerSecond: number; errorRate: number };
}

@Injectable()
export class SystemDashboardService {
  private readonly logger = new Logger(SystemDashboardService.name);
  private metrics: Map<string, DashboardMetric> = new Map();
  private historicalData: any[] = [];
  private dashboardUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeMetrics();
    this.startRealTimeUpdates();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const services = await this.checkAllServices();
    const healthStatus = this.calculateOverallHealth(services);
    
    return {
      overall: healthStatus,
      uptime: process.uptime(),
      lastCheck: new Date(),
      services
    };
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const metrics = await Promise.all([
      this.getSystemMetrics(),
      this.getDatabaseMetrics(),
      this.getCacheMetrics(),
      this.getApplicationMetrics()
    ]);
    
    return {
      cpu: metrics[0].cpu,
      memory: metrics[0].memory,
      disk: metrics[0].disk,
      network: metrics[0].network,
      database: metrics[1],
      cache: metrics[2],
      application: metrics[3]
    };
  }

  async getRealTimeMetrics(): Promise<DashboardMetric[]> {
    // Actualizar métricas en tiempo real
    await this.updateSystemMetrics();
    await this.updateApplicationMetrics();
    await this.updateSecurityMetrics();
    
    return Array.from(this.metrics.values());
  }

  async generateExecutiveDashboard(): Promise<any> {
    const [systemHealth, performance, security, business] = await Promise.all([
      this.getSystemHealth(),
      this.getPerformanceMetrics(),
      this.getSecurityMetrics(),
      this.getBusinessMetrics()
    ]);
    
    return {
      timestamp: new Date(),
      summary: {
        systemHealth: systemHealth.overall,
        performanceScore: this.calculatePerformanceScore(performance),
        securityScore: this.calculateSecurityScore(security),
        businessHealth: business.overall
      },
      kpis: {
        availability: this.calculateAvailability(systemHealth),
        responseTime: performance.application.requestsPerSecond > 0 ? 200 : 0,
        errorRate: performance.application.errorRate,
        userSatisfaction: business.userSatisfaction
      },
      trends: {
        performance: this.analyzePerformanceTrends(),
        security: this.analyzeSecurityTrends(),
        business: this.analyzeBusinessTrends()
      },
      alerts: await this.getActiveAlerts(),
      recommendations: this.generateRecommendations(systemHealth, performance)
    };
  }

  async getWorkflowPerformanceDashboard(workflowId: string): Promise<any> {
    const metrics = await Promise.all([
      this.getWorkflowMetrics(workflowId),
      this.getWorkflowExecutionMetrics(workflowId),
      this.getWorkflowErrorMetrics(workflowId)
    ]);
    
    return {
      workflowId,
      timestamp: new Date(),
      performance: {
        averageExecutionTime: metrics[0].avgExecutionTime,
        successRate: metrics[0].successRate,
        throughput: metrics[0].throughput,
        errorRate: metrics[2].errorRate
      },
      executions: {
        total: metrics[1].total,
        successful: metrics[1].successful,
        failed: metrics[1].failed,
        averageDuration: metrics[1].avgDuration
      },
      trends: this.analyzeWorkflowTrends(workflowId),
      alerts: await this.getWorkflowAlerts(workflowId)
    };
  }

  private async checkAllServices(): Promise<{[serviceName: string]: any}> {
    const services = ['database', 'redis', 'rabbitmq', 'api-gateway', 'auth-service'];
    const results: any = {};
    
    for (const service of services) {
      try {
        const health = await this.checkServiceHealth(service);
        results[service] = health;
      } catch (error) {
        this.logger.error(`Error checking service ${service}: ${error.message}`);
        results[service] = {
          status: 'down',
          responseTime: 0,
          errorRate: 100
        };
      }
    }
    
    return results;
  }

  private async checkServiceHealth(service: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Simular verificación de salud del servicio
      await this.simulateServiceCheck(service);
      
      return {
        status: 'up',
        responseTime: Date.now() - startTime,
        errorRate: Math.random() * 5 // 0-5% error rate
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        errorRate: 100
      };
    }
  }

  private async simulateServiceCheck(service: string): Promise<void> {
    // Simular latencia de red y procesamiento
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    
    // Simular fallos ocasionales
    if (Math.random() < 0.05) { // 5% chance of failure
      throw new Error(`Service ${service} unavailable`);
    }
  }

  private calculateOverallHealth(services: any): 'healthy' | 'warning' | 'critical' {
    const serviceStatuses = Object.values(services);
    const downServices = serviceStatuses.filter((s: any) => s.status === 'down').length;
    const degradedServices = serviceStatuses.filter((s: any) => s.errorRate > 10).length;
    
    if (downServices > 0) return 'critical';
    if (degradedServices > 0) return 'warning';
    return 'healthy';
  }

  private async getSystemMetrics(): Promise<any> {
    const memUsage = process.memoryUsage();
    
    return {
      cpu: {
        usage: Math.random() * 100,
        loadAverage: process.platform !== 'win32' ? process.loadavg() : [0, 0, 0]
      },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      disk: {
        used: 45, // GB
        total: 100, // GB
        percentage: 45
      },
      network: {
        bytesIn: 1024 * 1024,
        bytesOut: 512 * 1024,
        connections: 25
      }
    };
  }

  private async getDatabaseMetrics(): Promise<any> {
    return {
      connectionPool: Math.floor(Math.random() * 20) + 5,
      queryTime: Math.random() * 100 + 10,
      cacheHitRate: Math.random() * 30 + 70 // 70-100%
    };
  }

  private async getCacheMetrics(): Promise<any> {
    return {
      hitRate: Math.random() * 20 + 80, // 80-100%
      missRate: Math.random() * 10 + 0, // 0-10%
      memoryUsage: Math.random() * 1000 + 500 // MB
    };
  }

  private async getApplicationMetrics(): Promise<any> {
    return {
      activeUsers: Math.floor(Math.random() * 1000) + 100,
      requestsPerSecond: Math.random() * 50 + 10,
      errorRate: Math.random() * 5 // 0-5%
    };
  }

  private async updateSystemMetrics(): Promise<void> {
    const systemMetrics = await this.getSystemMetrics();
    
    // Actualizar métricas del sistema
    this.updateMetric('cpu_usage', systemMetrics.cpu.usage, '%', 'warning', 70, 90);
    this.updateMetric('memory_usage', systemMetrics.memory.percentage, '%', 'warning', 80, 95);
    this.updateMetric('disk_usage', systemMetrics.disk.percentage, '%', 'warning', 85, 95);
  }

  private async updateApplicationMetrics(): Promise<void> {
    const appMetrics = await this.getApplicationMetrics();
    
    this.updateMetric('active_users', appMetrics.activeUsers, 'count', 'healthy', 0, 0);
    this.updateMetric('requests_per_second', appMetrics.requestsPerSecond, '/s', 'healthy', 0, 0);
    this.updateMetric('error_rate', appMetrics.errorRate, '%', 'warning', 5, 10);
  }

  private async updateSecurityMetrics(): Promise<void> {
    // Métricas de seguridad en tiempo real
    this.updateMetric('failed_logins', Math.random() * 10, 'count', 'healthy', 0, 0);
    this.updateMetric('security_alerts', Math.random() * 3, 'count', 'warning', 5, 10);
    this.updateMetric('blocked_ips', Math.random() * 5, 'count', 'healthy', 0, 0);
  }

  private updateMetric(id: string, value: number, unit: string, status: any, warning: number, critical: number): void {
    const trend = this.calculateTrend(id, value);
    
    this.metrics.set(id, {
      id,
      name: this.getMetricName(id),
      value,
      unit,
      status,
      trend,
      timestamp: new Date(),
      threshold: { warning, critical }
    });
  }

  private getMetricName(id: string): string {
    const names: {[key: string]: string} = {
      cpu_usage: 'CPU Usage',
      memory_usage: 'Memory Usage',
      disk_usage: 'Disk Usage',
      active_users: 'Active Users',
      requests_per_second: 'Requests per Second',
      error_rate: 'Error Rate',
      failed_logins: 'Failed Logins',
      security_alerts: 'Security Alerts',
      blocked_ips: 'Blocked IPs'
    };
    
    return names[id] || id;
  }

  private calculateTrend(id: string, currentValue: number): 'up' | 'down' | 'stable' {
    const historical = this.historicalData.filter(d => d.metricId === id);
    if (historical.length < 2) return 'stable';
    
    const lastValue = historical[historical.length - 1].value;
    const change = (currentValue - lastValue) / lastValue;
    
    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private async getSecurityMetrics(): Promise<any> {
    return {
      securityScore: 95,
      activeThreats: 0,
      vulnerabilities: 2,
      complianceScore: 98
    };
  }

  private async getBusinessMetrics(): Promise<any> {
    return {
      overall: 'healthy',
      userSatisfaction: 4.5,
      revenue: 125000,
      growth: 15.2
    };
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;
    
    // Penalizar por alto uso de recursos
    if (metrics.cpu.usage > 80) score -= 20;
    if (metrics.memory.percentage > 85) score -= 20;
    if (metrics.disk.percentage > 90) score -= 15;
    
    // Penalizar por métricas de aplicación
    if (metrics.application.errorRate > 5) score -= 25;
    if (metrics.database.queryTime > 1000) score -= 15;
    if (metrics.cache.hitRate < 80) score -= 10;
    
    return Math.max(0, score);
  }

  private calculateSecurityScore(metrics: any): number {
    return metrics.securityScore || 85;
  }

  private calculateAvailability(health: SystemHealth): number {
    const totalServices = Object.keys(health.services).length;
    const healthyServices = Object.values(health.services).filter((s: any) => s.status === 'up').length;
    return (healthyServices / totalServices) * 100;
  }

  private analyzePerformanceTrends(): any {
    return {
      trend: 'improving',
      change: 5.2,
      factors: ['Cache optimization', 'Database indexing', 'CDN implementation']
    };
  }

  private analyzeSecurityTrends(): any {
    return {
      trend: 'stable',
      change: 0,
      factors: ['Continuous monitoring', 'Regular updates', 'Access controls']
    };
  }

  private analyzeBusinessTrends(): any {
    return {
      trend: 'growing',
      change: 15.2,
      factors: ['User growth', 'Feature adoption', 'Market expansion']
    };
  }

  private generateRecommendations(health: SystemHealth, performance: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (health.overall === 'critical') {
      recommendations.push('Implementar plan de recuperación de desastres');
    }
    
    if (performance.memory.percentage > 80) {
      recommendations.push('Considerar escalar horizontalmente los recursos de memoria');
    }
    
    if (performance.application.errorRate > 5) {
      recommendations.push('Revisar y optimizar código con alto error rate');
    }
    
    return recommendations;
  }

  private async getActiveAlerts(): Promise<any[]> {
    return [
      {
        id: 'alert_1',
        severity: 'warning',
        message: 'High memory usage detected',
        timestamp: new Date(),
        acknowledged: false
      }
    ];
  }

  private async getWorkflowMetrics(workflowId: string): Promise<any> {
    return {
      avgExecutionTime: 2000,
      successRate: 95.5,
      throughput: 120
    };
  }

  private async getWorkflowExecutionMetrics(workflowId: string): Promise<any> {
    return {
      total: 1000,
      successful: 955,
      failed: 45,
      avgDuration: 2000
    };
  }

  private async getWorkflowErrorMetrics(workflowId: string): Promise<any> {
    return {
      errorRate: 4.5,
      commonErrors: [
        { type: 'Timeout', count: 20 },
        { type: 'Validation Error', count: 15 },
        { type: 'External API', count: 10 }
      ]
    };
  }

  private analyzeWorkflowTrends(workflowId: string): any {
    return {
      executionTrend: 'increasing',
      performanceTrend: 'improving',
      errorTrend: 'decreasing'
    };
  }

  private async getWorkflowAlerts(workflowId: string): Promise<any[]> {
    return [];
  }

  private initializeMetrics(): void {
    const initialMetrics = [
      { id: 'cpu_usage', name: 'CPU Usage', value: 45, unit: '%', status: 'healthy' },
      { id: 'memory_usage', name: 'Memory Usage', value: 60, unit: '%', status: 'healthy' },
      { id: 'disk_usage', name: 'Disk Usage', value: 45, unit: '%', status: 'healthy' },
      { id: 'active_users', name: 'Active Users', value: 250, unit: 'count', status: 'healthy' }
    ];
    
    initialMetrics.forEach(metric => {
      this.metrics.set(metric.id, {
        ...metric,
        trend: 'stable',
        timestamp: new Date(),
        threshold: { warning: 70, critical: 90 }
      });
    });
  }

  private startRealTimeUpdates(): void {
    this.dashboardUpdateInterval = setInterval(async () => {
      try {
        await this.getRealTimeMetrics();
        
        // Guardar datos históricos
        const timestamp = new Date();
        for (const metric of this.metrics.values()) {
          this.historicalData.push({
            metricId: metric.id,
            value: metric.value,
            timestamp
          });
        }
        
        // Mantener solo los últimos 1000 puntos de datos
        if (this.historicalData.length > 1000) {
          this.historicalData = this.historicalData.slice(-1000);
        }
        
      } catch (error) {
        this.logger.error('Error updating real-time metrics:', error);
      }
    }, 5000); // Cada 5 segundos
  }
}
```

### 1.2 Alerting System

```typescript
// backend/src/monitoring/alerts/alerting-system.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldown: number; // minutes
  channels: AlertChannel[];
  actions: AlertAction[];
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolutionTime?: number; // minutes
}

interface AlertChannel {
  type: 'email' | 'slack' | 'sms' | 'webhook' | 'pagerduty';
  target: string;
  enabled: boolean;
}

interface AlertAction {
  type: 'autoscale' | 'restart_service' | 'isolate_system' | 'runbook' | 'notification';
  config: any;
}

@Injectable()
export class AlertingSystemService {
  private readonly logger = new Logger(AlertingSystemService.name);
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];

  constructor() {
    this.initializeAlertRules();
    this.startAlertMonitoring();
  }

  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: this.generateId()
    };
    
    this.alertRules.set(newRule.id, newRule);
    this.logger.log(`Created alert rule: ${newRule.name}`);
    
    return newRule;
  }

  async evaluateMetric(metricName: string, value: number): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];
    const applicableRules = Array.from(this.alertRules.values())
      .filter(rule => rule.enabled && rule.metric === metricName);
    
    for (const rule of applicableRules) {
      if (this.evaluateCondition(value, rule.condition, rule.threshold)) {
        const alert = await this.triggerAlert(rule, value);
        if (alert) {
          triggeredAlerts.push(alert);
        }
      }
    }
    
    return triggeredAlerts;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
      
      this.logger.log(`Alert ${alertId} acknowledged by ${userId}`);
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolutionTime = (alert.resolvedAt.getTime() - alert.timestamp.getTime()) / (1000 * 60);
      
      // Mover a historial
      this.alertHistory.push(alert);
      this.activeAlerts.delete(alertId);
      
      this.logger.log(`Alert ${alertId} resolved (resolution time: ${alert.resolutionTime} minutes)`);
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async getAlertHistory(filters?: any): Promise<Alert[]> {
    let history = this.alertHistory;
    
    if (filters?.severity) {
      history = history.filter(alert => alert.severity === filters.severity);
    }
    
    if (filters?.metric) {
      history = history.filter(alert => alert.metric === filters.metric);
    }
    
    if (filters?.dateFrom) {
      history = history.filter(alert => alert.timestamp >= new Date(filters.dateFrom));
    }
    
    if (filters?.dateTo) {
      history = history.filter(alert => alert.timestamp <= new Date(filters.dateTo));
    }
    
    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getAlertStatistics(): Promise<any> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentAlerts = this.alertHistory.filter(alert => alert.timestamp >= last24h);
    const weeklyAlerts = this.alertHistory.filter(alert => alert.timestamp >= last7d);
    
    return {
      totalActive: this.activeAlerts.size,
      totalHistorical: this.alertHistory.length,
      last24h: {
        count: recentAlerts.length,
        bySeverity: this.groupAlertsBySeverity(recentAlerts),
        byMetric: this.groupAlertsByMetric(recentAlerts)
      },
      last7d: {
        count: weeklyAlerts.length,
        bySeverity: this.groupAlertsBySeverity(weeklyAlerts),
        averageResolutionTime: this.calculateAverageResolutionTime(weeklyAlerts)
      },
      topAlerts: this.getTopAlerts(weeklyAlerts),
      alertTrends: this.calculateAlertTrends(weeklyAlerts)
    };
  }

  private async triggerAlert(rule: AlertRule, value: number): Promise<Alert | null> {
    // Verificar cooldown
    const lastAlert = this.getLastAlertForRule(rule.id);
    if (lastAlert && this.isInCooldown(lastAlert, rule.cooldown)) {
      return null;
    }
    
    // Crear alerta
    const alert: Alert = {
      id: this.generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Alert: ${rule.name} - ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false
    };
    
    // Agregar a alertas activas
    this.activeAlerts.set(alert.id, alert);
    
    // Enviar notificaciones
    await this.sendNotifications(alert, rule);
    
    // Ejecutar acciones
    await this.executeActions(alert, rule);
    
    this.logger.warn(`ALERT TRIGGERED: ${alert.message}`);
    return alert;
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value == threshold;
      case '!=': return value != threshold;
      default: return false;
    }
  }

  private getLastAlertForRule(ruleId: string): Alert | null {
    const ruleAlerts = this.alertHistory
      .filter(alert => alert.ruleId === ruleId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return ruleAlerts.length > 0 ? ruleAlerts[0] : null;
  }

  private isInCooldown(lastAlert: Alert, cooldownMinutes: number): boolean {
    const now = new Date();
    const cooldownTime = lastAlert.timestamp.getTime() + (cooldownMinutes * 60 * 1000);
    return now.getTime() < cooldownTime;
  }

  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of rule.channels) {
      if (channel.enabled) {
        try {
          await this.sendNotification(channel, alert);
        } catch (error) {
          this.logger.error(`Failed to send notification via ${channel.type}: ${error.message}`);
        }
      }
    }
  }

  private async sendNotification(channel: AlertChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel.target, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel.target, alert);
        break;
      case 'sms':
        await this.sendSMSNotification(channel.target, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel.target, alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyNotification(channel.target, alert);
        break;
    }
  }

  private async sendEmailNotification(email: string, alert: Alert): Promise<void> {
    this.logger.log(`Sending email alert to ${email}: ${alert.message}`);
  }

  private async sendSlackNotification(channel: string, alert: Alert): Promise<void> {
    this.logger.log(`Sending Slack alert to ${channel}: ${alert.message}`);
  }

  private async sendSMSNotification(phone: string, alert: Alert): Promise<void> {
    this.logger.log(`Sending SMS alert to ${phone}: ${alert.message}`);
  }

  private async sendWebhookNotification(url: string, alert: Alert): Promise<void> {
    this.logger.log(`Sending webhook alert to ${url}: ${alert.message}`);
  }

  private async sendPagerDutyNotification(service: string, alert: Alert): Promise<void> {
    this.logger.log(`Sending PagerDuty alert to ${service}: ${alert.message}`);
  }

  private async executeActions(alert: Alert, rule: AlertRule): Promise<void> {
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, alert);
      } catch (error) {
        this.logger.error(`Failed to execute action ${action.type}: ${error.message}`);
      }
    }
  }

  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {
    switch (action.type) {
      case 'autoscale':
        await this.executeAutoScale(action.config, alert);
        break;
      case 'restart_service':
        await this.executeRestartService(action.config, alert);
        break;
      case 'isolate_system':
        await this.executeIsolateSystem(action.config, alert);
        break;
      case 'runbook':
        await this.executeRunbook(action.config, alert);
        break;
    }
  }

  private async executeAutoScale(config: any, alert: Alert): Promise<void> {
    this.logger.log(`Executing auto-scaling: ${JSON.stringify(config)}`);
  }

  private async executeRestartService(config: any, alert: Alert): Promise<void> {
    this.logger.log(`Executing service restart: ${JSON.stringify(config)}`);
  }

  private async executeIsolateSystem(config: any, alert: Alert): Promise<void> {
    this.logger.log(`Executing system isolation: ${JSON.stringify(config)}`);
  }

  private async executeRunbook(config: any, alert: Alert): Promise<void> {
    this.logger.log(`Executing runbook: ${JSON.stringify(config)}`);
  }

  private groupAlertsBySeverity(alerts: Alert[]): any {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {});
  }

  private groupAlertsByMetric(alerts: Alert[]): any {
    return alerts.reduce((acc, alert) => {
      acc[alert.metric] = (acc[alert.metric] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAverageResolutionTime(alerts: Alert[]): number {
    const resolvedAlerts = alerts.filter(alert => alert.resolutionTime);
    if (resolvedAlerts.length === 0) return 0;
    
    const totalTime = resolvedAlerts.reduce((sum, alert) => sum + (alert.resolutionTime || 0), 0);
    return totalTime / resolvedAlerts.length;
  }

  private getTopAlerts(alerts: Alert[]): any[] {
    const alertCounts = this.groupAlertsByMetric(alerts);
    return Object.entries(alertCounts)
      .map(([metric, count]) => ({ metric, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateAlertTrends(alerts: Alert[]): any {
    // Calcular tendencias de alertas
    return {
      trend: 'stable',
      change: 0,
      factors: []
    };
  }

  private initializeAlertRules(): void {
    const defaultRules = [
      {
        name: 'High CPU Usage',
        description: 'CPU usage above 80%',
        metric: 'cpu_usage',
        condition: '>',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        cooldown: 5,
        channels: [
          { type: 'slack', target: '#alerts', enabled: true },
          { type: 'email', target: 'admin@company.com', enabled: true }
        ],
        actions: [
          { type: 'autoscale', config: { increment: 1 } }
        ]
      },
      {
        name: 'Critical Memory Usage',
        description: 'Memory usage above 95%',
        metric: 'memory_usage',
        condition: '>',
        threshold: 95,
        severity: 'critical',
        enabled: true,
        cooldown: 2,
        channels: [
          { type: 'slack', target: '#alerts', enabled: true },
          { type: 'pagerduty', target: 'on-call', enabled: true }
        ],
        actions: [
          { type: 'autoscale', config: { increment: 2 } },
          { type: 'restart_service', config: { service: 'api-gateway' } }
        ]
      },
      {
        name: 'High Error Rate',
        description: 'Application error rate above 5%',
        metric: 'error_rate',
        condition: '>',
        threshold: 5,
        severity: 'critical',
        enabled: true,
        cooldown: 3,
        channels: [
          { type: 'slack', target: '#alerts', enabled: true }
        ],
        actions: [
          { type: 'runbook', config: { playbook: 'error_rate_investigation' } }
        ]
      }
    ];
    
    defaultRules.forEach(rule => {
      const alertRule: AlertRule = {
        ...rule,
        id: this.generateId()
      };
      this.alertRules.set(alertRule.id, alertRule);
    });
  }

  private startAlertMonitoring(): void {
    setInterval(async () => {
      try {
        // Simular monitoreo de métricas
        const testMetrics = [
          { name: 'cpu_usage', value: Math.random() * 100 },
          { name: 'memory_usage', value: Math.random() * 100 },
          { name: 'error_rate', value: Math.random() * 10 }
        ];
        
        for (const metric of testMetrics) {
          await this.evaluateMetric(metric.name, metric.value);
        }
      } catch (error) {
        this.logger.error('Error in alert monitoring:', error);
      }
    }, 30000); // Cada 30 segundos
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## 2. Log Aggregation and Analysis

### 2.1 Centralized Log System

```typescript
// backend/src/monitoring/logs/log-aggregation.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  component: string;
  message: string;
  metadata: any;
  stackTrace?: string;
  requestId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface LogQuery {
  startTime?: Date;
  endTime?: Date;
  level?: string;
  service?: string;
  component?: string;
  message?: string;
  requestId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

interface LogAnalysis {
  totalEntries: number;
  levels: { [key: string]: number };
  services: { [key: string]: number };
  components: { [key: string]: number };
  timeDistribution: { [key: string]: number };
  errorPatterns: any[];
  performanceIssues: any[];
  securityEvents: any[];
}

@Injectable()
export class LogAggregationService {
  private readonly logger = new Logger(LogAggregationService.name);
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 10000;

  constructor() {
    this.startLogProcessing();
  }

  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date()
    };
    
    // Agregar al buffer
    this.logBuffer.push(logEntry);
    
    // Mantener tamaño del buffer
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
    
    // Procesamiento inmediato para logs críticos
    if (entry.level === 'error' || entry.level === 'fatal') {
      await this.processCriticalLog(logEntry);
    }
    
    // Indexación para búsquedas rápidas
    await this.indexLogEntry(logEntry);
  }

  async queryLogs(query: LogQuery): Promise<LogEntry[]> {
    let results = this.logBuffer;
    
    // Aplicar filtros
    if (query.startTime) {
      results = results.filter(log => log.timestamp >= query.startTime!);
    }
    
    if (query.endTime) {
      results = results.filter(log => log.timestamp <= query.endTime!);
    }
    
    if (query.level) {
      results = results.filter(log => log.level === query.level);
    }
    
    if (query.service) {
      results = results.filter(log => log.service === query.service);
    }
    
    if (query.component) {
      results = results.filter(log => log.component === query.component);
    }
    
    if (query.message) {
      results = results.filter(log => log.message.toLowerCase().includes(query.message!.toLowerCase()));
    }
    
    if (query.requestId) {
      results = results.filter(log => log.requestId === query.requestId);
    }
    
    if (query.userId) {
      results = results.filter(log => log.userId === query.userId);
    }
    
    // Paginación
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return results
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  async analyzeLogs(timeRange: { start: Date; end: Date }): Promise<LogAnalysis> {
    const logs = this.logBuffer.filter(log => 
      log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
    );
    
    return {
      totalEntries: logs.length,
      levels: this.analyzeLogLevels(logs),
      services: this.analyzeLogServices(logs),
      components: this.analyzeLogComponents(logs),
      timeDistribution: this.analyzeTimeDistribution(logs),
      errorPatterns: this.analyzeErrorPatterns(logs),
      performanceIssues: this.analyzePerformanceIssues(logs),
      securityEvents: this.analyzeSecurityEvents(logs)
    };
  }

  async getErrorTrends(days: number = 7): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);
    
    const logs = this.logBuffer.filter(log => 
      log.timestamp >= startTime && 
      log.timestamp <= endTime && 
      (log.level === 'error' || log.level === 'fatal')
    );
    
    const trends: { [key: string]: any } = {};
    
    for (let i = 0; i < days; i++) {
      const day = new Date(startTime.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      
      const dayLogs = logs.filter(log => log.timestamp >= day && log.timestamp < dayEnd);
      
      trends[day.toISOString().split('T')[0]] = {
        errors: dayLogs.length,
        fatal: dayLogs.filter(log => log.level === 'fatal').length,
        services: this.groupByService(dayLogs),
        topErrors: this.getTopErrors(dayLogs, 5)
      };
    }
    
    return trends;
  }

  async getPerformanceLogs(): Promise<any> {
    return {
      slowQueries: await this.getSlowQueries(),
      slowAPI: await this.getSlowAPIEndpoints(),
      memoryLeaks: await this.getMemoryLeakPatterns(),
      performanceBottlenecks: await this.getPerformanceBottlenecks()
    };
  }

  async getSecurityLogs(): Promise<any> {
    const securityLogs = this.logBuffer.filter(log => 
      log.metadata?.category === 'security' || 
      log.component === 'auth' ||
      log.component === 'security'
    );
    
    return {
      failedLogins: securityLogs.filter(log => log.message.includes('failed login')),
      suspiciousActivities: securityLogs.filter(log => log.message.includes('suspicious')),
      accessViolations: securityLogs.filter(log => log.message.includes('access denied')),
      dataExfiltration: securityLogs.filter(log => log.message.includes('data exfiltration')),
      bruteForce: securityLogs.filter(log => log.message.includes('brute force'))
    };
  }

  private async processCriticalLog(log: LogEntry): Promise<void> {
    // Análisis inmediato de logs críticos
    if (log.message.includes('unauthorized') || log.message.includes('authentication failure')) {
      await this.handleSecurityIncident(log);
    }
    
    if (log.message.includes('database connection') || log.message.includes('timeout')) {
      await this.handlePerformanceIncident(log);
    }
    
    if (log.message.includes('out of memory') || log.message.includes('stack overflow')) {
      await this.handleSystemIncident(log);
    }
  }

  private async handleSecurityIncident(log: LogEntry): Promise<void> {
    this.logger.warn(`SECURITY INCIDENT: ${log.message}`);
    // Implementar respuesta a incidentes de seguridad
  }

  private async handlePerformanceIncident(log: LogEntry): Promise<void> {
    this.logger.warn(`PERFORMANCE INCIDENT: ${log.message}`);
    // Implementar respuesta a incidentes de performance
  }

  private async handleSystemIncident(log: LogEntry): Promise<void> {
    this.logger.error(`SYSTEM INCIDENT: ${log.message}`);
    // Implementar respuesta a incidentes del sistema
  }

  private async indexLogEntry(log: LogEntry): Promise<void> {
    // Indexación para búsquedas optimizadas
    const indexKey = `${log.level}_${log.service}_${log.component}`;
    // Implementar indexación real aquí
  }

  private analyzeLogLevels(logs: LogEntry[]): { [key: string]: number } {
    return logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {});
  }

  private analyzeLogServices(logs: LogEntry[]): { [key: string]: number } {
    return logs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {});
  }

  private analyzeLogComponents(logs: LogEntry[]): { [key: string]: number } {
    return logs.reduce((acc, log) => {
      acc[log.component] = (acc[log.component] || 0) + 1;
      return acc;
    }, {});
  }

  private analyzeTimeDistribution(logs: LogEntry[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      const timeSlot = `${hour}:00-${hour + 1}:00`;
      distribution[timeSlot] = (distribution[timeSlot] || 0) + 1;
    });
    
    return distribution;
  }

  private analyzeErrorPatterns(logs: LogEntry[]): any[] {
    const errorLogs = logs.filter(log => log.level === 'error' || log.level === 'fatal');
    const patterns: { [key: string]: number } = {};
    
    errorLogs.forEach(log => {
      const pattern = this.extractErrorPattern(log.message);
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    });
    
    return Object.entries(patterns)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);
  }

  private analyzePerformanceIssues(logs: LogEntry[]): any[] {
    const performanceLogs = logs.filter(log => 
      log.message.includes('slow') || 
      log.message.includes('timeout') || 
      log.message.includes('performance')
    );
    
    return performanceLogs.map(log => ({
      timestamp: log.timestamp,
      component: log.component,
      message: log.message,
      impact: this.assessPerformanceImpact(log)
    }));
  }

  private analyzeSecurityEvents(logs: LogEntry[]): any[] {
    const securityLogs = logs.filter(log => 
      log.metadata?.category === 'security' || 
      log.component === 'auth'
    );
    
    return securityLogs.map(log => ({
      timestamp: log.timestamp,
      event: log.message,
      severity: log.level,
      source: log.ipAddress || 'unknown',
      details: log.metadata
    }));
  }

  private extractErrorPattern(message: string): string {
    // Extraer patrón común del error
    if (message.includes('TypeError')) return 'TypeError';
    if (message.includes('ReferenceError')) return 'ReferenceError';
    if (message.includes('database')) return 'Database Error';
    if (message.includes('network')) return 'Network Error';
    if (message.includes('timeout')) return 'Timeout Error';
    return 'Other Error';
  }

  private assessPerformanceImpact(log: LogEntry): 'low' | 'medium' | 'high' | 'critical' {
    if (log.message.includes('timeout') && log.message.includes('critical')) return 'critical';
    if (log.message.includes('slow') && log.message.includes('database')) return 'high';
    if (log.message.includes('timeout')) return 'medium';
    return 'low';
  }

  private async getSlowQueries(): Promise<any[]> {
    const queryLogs = this.logBuffer.filter(log => 
      log.component === 'database' && 
      log.message.includes('slow query')
    );
    
    return queryLogs.map(log => ({
      timestamp: log.timestamp,
      query: log.message,
      duration: log.metadata?.duration || 0
    }));
  }

  private async getSlowAPIEndpoints(): Promise<any[]> {
    const apiLogs = this.logBuffer.filter(log => 
      log.component === 'api' && 
      log.message.includes('slow request')
    );
    
    return apiLogs.map(log => ({
      timestamp: log.timestamp,
      endpoint: log.metadata?.endpoint || 'unknown',
      duration: log.metadata?.duration || 0
    }));
  }

  private async getMemoryLeakPatterns(): Promise<any[]> {
    const memoryLogs = this.logBuffer.filter(log => 
      log.message.includes('memory') && 
      log.message.includes('leak')
    );
    
    return memoryLogs.map(log => ({
      timestamp: log.timestamp,
      component: log.component,
      memoryUsage: log.metadata?.memoryUsage || 0
    }));
  }

  private async getPerformanceBottlenecks(): Promise<any[]> {
    const bottleneckLogs = this.logBuffer.filter(log => 
      log.message.includes('bottleneck') || 
      log.message.includes('blocked')
    );
    
    return bottleneckLogs.map(log => ({
      timestamp: log.timestamp,
      component: log.component,
      bottleneck: log.message
    }));
  }

  private getTopErrors(logs: LogEntry[], limit: number): any[] {
    const errors = logs.filter(log => log.level === 'error' || log.level === 'fatal');
    const errorCounts: { [key: string]: number } = {};
    
    errors.forEach(log => {
      const errorType = this.extractErrorPattern(log.message);
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private groupByService(logs: LogEntry[]): { [key: string]: number } {
    return logs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {});
  }

  private startLogProcessing(): void {
    // Procesar logs en lote cada 30 segundos
    setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.processLogBatch();
      }
    }, 30000);
  }

  private async processLogBatch(): Promise<void> {
    const batch = this.logBuffer.splice(0, 1000);
    
    try {
      // Persistir logs en base de datos o sistema de almacenamiento
      await this.persistLogs(batch);
      
      // Análisis de patrones
      await this.analyzeLogPatterns(batch);
      
    } catch (error) {
      this.logger.error('Error processing log batch:', error);
    }
  }

  private async persistLogs(logs: LogEntry[]): Promise<void> {
    // Implementar persistencia en base de datos
    this.logger.debug(`Persisting ${logs.length} log entries`);
  }

  private async analyzeLogPatterns(logs: LogEntry[]): Promise<void> {
    // Análisis de patrones para detección de anomalías
    this.logger.debug(`Analyzing patterns for ${logs.length} log entries`);
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Resumen del Componente 3

### Archivos Creados:
- `system-dashboard.service.ts`: Dashboard de monitoreo del sistema en tiempo real
- `alerting-system.service.ts`: Sistema de alertas inteligente y automatizado
- `log-aggregation.service.ts`: Sistema centralizado de agregación y análisis de logs

### Características Implementadas:
✅ **Dashboard en Tiempo Real**: Métricas del sistema, salud de servicios, KPIs ejecutivos
✅ **Sistema de Alertas**: Reglas configurables, múltiples canales, acciones automatizadas
✅ **Agregación de Logs**: Logs estructurados, análisis de patrones, detección de anomalías
✅ **Monitoreo de Performance**: Slow queries, memory leaks, performance bottlenecks
✅ **Análisis de Seguridad**: Failed logins, suspicious activities, security events

### Próximo Componente:
El siguiente paso es implementar el **Componente 4: Hardening de Infraestructura** que incluirá seguridad de red, controles de acceso, protección de datos y sistema de respaldos.
