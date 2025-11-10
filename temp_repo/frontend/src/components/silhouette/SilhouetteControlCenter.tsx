'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Workflow, 
  Settings, 
  Key, 
  Zap, 
  Brain,
  Play,
  Pause,
  RefreshCw,
  Shield,
  Cpu,
  Database,
  Cloud,
  BarChart3
} from 'lucide-react';
import { SilhouetteChat } from './SilhouetteChat';

interface SystemMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  performance: {
    cpu: number;
    memory: number;
    throughput: number;
  };
  framework: {
    version: string;
    activeTeams: number;
    totalTasks: number;
    successRate: number;
  };
}

interface SilhouetteControlCenterProps {
  className?: string;
}

export const SilhouetteControlCenter: React.FC<SilhouetteControlCenterProps> = ({ 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frameworkStatus, setFrameworkStatus] = useState<any>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  
  // Cargar datos del sistema
  useEffect(() => {
    loadSystemData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    setIsLoading(true);
    try {
      // Cargar métricas del sistema
      const [healthResponse, frameworkResponse, tasksResponse] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/framework-v4/status'),
        fetch('/api/framework-v4/tasks?limit=10')
      ]);

      const healthData = await healthResponse.json();
      const frameworkData = await frameworkResponse.json();
      const tasksData = await tasksResponse.json();

      if (healthData.success) {
        setSystemMetrics(healthData.data);
      }

      if (frameworkData.success) {
        setFrameworkStatus(frameworkData.data);
      }

      if (tasksData.success) {
        setRecentTasks(tasksData.data);
      }
    } catch (error) {
      console.error('Error loading system data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ejecutar acción con Silhouette
  const executeSilhouetteAction = async (action: string, data?: any) => {
    try {
      const response = await fetch('/api/framework-v4/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: action,
          data: data || {},
          priority: 'high'
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('Silhouette action executed:', result.data);
        // Actualizar datos
        setTimeout(loadSystemData, 2000);
      }
    } catch (error) {
      console.error('Error executing Silhouette action:', error);
    }
  };

  // Crear nuevo workflow
  const handleCreateWorkflow = async () => {
    await executeSilhouetteAction('create-workflow', {
      template: 'advanced-ai',
      autoOptimize: true
    });
  };

  // Optimizar sistema
  const handleOptimizeSystem = async () => {
    await executeSilhouetteAction('optimize-system', {
      target: 'performance',
      aggressive: true
    });
  };

  // Iniciar entrenamiento ML
  const handleStartMLTraining = async () => {
    await executeSilhouetteAction('ml-training', {
      model: 'workflow-optimizer',
      dataset: 'user-workflows'
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bot className="h-8 w-8 mx-auto mb-2 text-blue-600 animate-pulse" />
            <p className="text-muted-foreground">Iniciando Silhouette...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header del Centro de Control */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Silhouette Control Center</CardTitle>
                <p className="text-blue-100">Centro de control integral de la plataforma</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                V4.0 Enterprise
              </Badge>
              {frameworkStatus && (
                <Badge variant={frameworkStatus.status === 'healthy' ? 'default' : 'destructive'}>
                  {frameworkStatus.status}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">CPU</p>
                <p className="text-xl font-bold">
                  {systemMetrics?.performance.cpu || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Memory</p>
                <p className="text-xl font-bold">
                  {systemMetrics?.performance.memory || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Throughput</p>
                <p className="text-xl font-bold">
                  {systemMetrics?.performance.throughput || 0}/min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-xl font-bold">
                  {frameworkStatus?.successRate || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel principal de control */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center space-x-2">
            <Workflow className="h-4 w-4" />
            <span>Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI/ML</span>
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>Credenciales</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center space-x-2">
            <Bot className="h-4 w-4" />
            <span>Chat</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Framework Status */}
            <Card>
              <CardHeader>
                <CardTitle>Framework V4.0 Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Versión</span>
                  <Badge>{frameworkStatus?.version || '4.0.0'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Equipos Activos</span>
                  <Badge variant="secondary">
                    {frameworkStatus?.activeTeams || 0}/45
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tareas Totales</span>
                  <Badge variant="outline">
                    {frameworkStatus?.totalTasks || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Uptime</span>
                  <Badge className="bg-green-100 text-green-800">
                    {Math.floor((systemMetrics?.uptime || 0) / 3600)}h
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Acciones Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleCreateWorkflow}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Workflow className="h-4 w-4 mr-2" />
                  Crear Workflow Avanzado
                </Button>
                <Button 
                  onClick={handleOptimizeSystem}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Optimizar Sistema
                </Button>
                <Button 
                  onClick={handleStartMLTraining}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Entrenar Modelo ML
                </Button>
                <Button 
                  onClick={loadSystemData}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar Estado
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tareas Recientes */}
          <Card>
            <CardHeader>
              <CardTitle>Tareas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay tareas recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{task.name}</h4>
                        <p className="text-sm text-muted-foreground">{task.type}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                          {task.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Gestión de Workflows</CardTitle>
                    <Button onClick={handleCreateWorkflow}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Workflow
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-2">Workflow Creator</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Crea workflows con IA y templates avanzados
                        </p>
                        <Button size="sm" onClick={handleCreateWorkflow}>
                          Crear con IA
                        </Button>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-2">Workflow Optimizer</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Optimiza workflows existentes con ML
                        </p>
                        <Button size="sm" variant="outline">
                          Optimizar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Capacidades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">DAG Workflows</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Ejecución Paralela</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Condicionales</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Auto-Recovery</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">ML Optimization</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Módulos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Panel de gestión de módulos en desarrollo</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Crear, configurar y gestionar módulos reutilizables
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI/ML Tab */}
        <TabsContent value="ai" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Modelos ML</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleStartMLTraining}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Entrenar Modelo Personalizado
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Optimizar Workflows
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Métricas
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capacidades AI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Custom Model Training</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Auto Scaling Intelligence</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Smart Recommendations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Performance Optimization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Audiovisual Generation</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Key className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-medium mb-2">Gestión Segura de Credenciales</h3>
                <p className="text-muted-foreground mb-4">
                  Agrega y gestiona tus API keys de forma segura
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Credencial
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <SilhouetteChat isDocked={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chat flotante siempre visible */}
      <SilhouetteChat isDocked={false} className="absolute bottom-0 right-0" />
    </div>
  );
};