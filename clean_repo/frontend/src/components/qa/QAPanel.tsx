'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Brain, 
  Globe, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useQA } from '@/hooks/useQA';
import { useQAStore } from '@/stores/qaStore';
import { QAStatusDisplay } from './QAStatusDisplay';

interface QAPanelProps {
  workflowId?: string;
  className?: string;
}

export const QAPanel: React.FC<QAPanelProps> = ({ workflowId, className }) => {
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { getSystemHealth, getSystemMetrics } = useQA();
  const {
    activeVerifications,
    recentResults,
    systemHealth: storeHealth,
    notifications,
    getAverageConfidence,
    getSuccessRate,
    getVerificationCount
  } = useQAStore();

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [healthData, metricsData] = await Promise.all([
        getSystemHealth(),
        getSystemMetrics()
      ]);
      
      if (healthData) setSystemHealth(healthData);
      if (metricsData) setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to refresh QA data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const activeVerificationList = Array.from(activeVerifications.entries());
  const recentVerificationList = recentResults.slice(0, 10);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* System Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              QA System Status
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getVerificationCount()}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(getSuccessRate() * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(getAverageConfidence() * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthStatusColor(storeHealth?.status || 'unknown')}`}>
                {storeHealth?.status === 'healthy' ? '✓' : 
                 storeHealth?.status === 'degraded' ? '⚠' : '✗'}
              </div>
              <div className="text-sm text-muted-foreground">System</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {notifications.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Verifications */}
        <TabsContent value="active" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Verifications ({activeVerificationList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeVerificationList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active verifications</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {activeVerificationList.map(([id, result]) => (
                      <QAStatusDisplay
                        key={id}
                        result={result}
                        onDismiss={() => {
                          // Handle dismiss
                        }}
                        onDetails={() => {
                          // Handle details view
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Results */}
        <TabsContent value="recent" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Results ({recentVerificationList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentVerificationList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent results</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {recentVerificationList.map((result, index) => (
                      <QAStatusDisplay
                        key={`${result.id}-${index}`}
                        result={result}
                        showActions={false}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health */}
        <TabsContent value="system" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Health Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {systemHealth ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overall Status</span>
                      <div className={`flex items-center gap-1 ${getHealthStatusColor(systemHealth.status)}`}>
                        {getHealthStatusIcon(systemHealth.status)}
                        <span className="font-medium capitalize">{systemHealth.status}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {Object.entries(systemHealth.agents || {}).map(([agentId, agent]: [string, any]) => (
                        <div key={agentId} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{agentId.replace('-', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={agent.status === 'active' ? 'default' : 'destructive'}>
                              {agent.status}
                            </Badge>
                            <span className="text-muted-foreground">
                              {((agent.successRate || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p>Loading system health...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Requests</span>
                      <span className="font-medium">{metrics.performance?.totalRequests || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Success Rate</span>
                      <span className="font-medium text-green-600">
                        {((metrics.performance?.successRate || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Response Time</span>
                      <span className="font-medium">
                        {(metrics.performance?.averageResponseTime || 0).toFixed(0)}ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Throughput</span>
                      <span className="font-medium">
                        {(metrics.performance?.throughput || 0).toFixed(1)}/min
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Precision</span>
                      <span className="font-medium text-blue-600">
                        {((metrics.accuracy?.precision || 0) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p>Loading metrics...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {systemHealth?.recommendations && systemHealth.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {systemHealth.recommendations.map((recommendation: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                QA Notifications ({notifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border ${
                          notification.type === 'error' ? 'border-red-200 bg-red-50' :
                          notification.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          notification.type === 'success' ? 'border-green-200 bg-green-50' :
                          'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={
                                  notification.type === 'error' ? 'destructive' :
                                  notification.type === 'warning' ? 'default' :
                                  notification.type === 'success' ? 'default' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {notification.type}
                              </Badge>
                              {notification.riskLevel && (
                                <Badge variant="outline" className="text-xs">
                                  {notification.riskLevel}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};