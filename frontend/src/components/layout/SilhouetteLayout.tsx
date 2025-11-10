'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Workflow, 
  Settings, 
  Key, 
  Video,
  Brain,
  Shield,
  BarChart3,
  Menu,
  X,
  Home,
  Zap,
  Users,
  Bell,
  Search,
  Plus,
  CheckCircle
} from 'lucide-react';
import { SilhouetteControlCenter } from '../silhouette/SilhouetteControlCenter';
import { AudioVisualStudio } from '../audiovisual/AudioVisualStudio';
import { SecureCredentialsManager } from '../credentials/SecureCredentialsManager';

interface SilhouetteLayoutProps {
  children?: React.ReactNode;
}

export const SilhouetteLayout: React.FC<SilhouetteLayoutProps> = ({ children }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      description: 'Vista principal',
      component: <SilhouetteControlCenter />
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: Workflow,
      description: 'Gestión de workflows',
      component: (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Workflow className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-medium mb-2">Gestión de Workflows</h3>
              <p className="text-muted-foreground">
                Crea, edita y gestiona workflows con IA avanzada
              </p>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'audiovisual',
      label: 'Audiovisual',
      icon: Video,
      description: 'Studio multimedia',
      component: <AudioVisualStudio />
    },
    {
      id: 'credentials',
      label: 'Credenciales',
      icon: Key,
      description: 'Gestión segura',
      component: <SecureCredentialsManager />
    },
    {
      id: 'modules',
      label: 'Módulos',
      icon: Settings,
      description: 'Módulos reutilizables',
      component: (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h3 className="text-lg font-medium mb-2">Gestión de Módulos</h3>
              <p className="text-muted-foreground">
                Crea y gestiona módulos reutilizables
              </p>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'ai-ml',
      label: 'AI/ML',
      icon: Brain,
      description: 'Machine Learning',
      component: (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">AI/ML Center</h3>
              <p className="text-muted-foreground">
                Entrena modelos y optimiza con inteligencia artificial
              </p>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Métricas y análisis',
      component: (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
              <p className="text-muted-foreground">
                Visualiza métricas y análisis del sistema
              </p>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'team',
      label: 'Equipo',
      icon: Users,
      description: 'Colaboración',
      component: (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-indigo-600" />
              <h3 className="text-lg font-medium mb-2">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Gestiona equipos y colaboración
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }
  ];

  const currentMenuItem = menuItems.find(item => item.id === activeView);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Silhouette</h1>
                <p className="text-xs text-muted-foreground">Enterprise V4.0</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Status del sistema */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">System Status</span>
              <Badge variant="default" className="text-xs">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                Online
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              45+ teams active • 99.99% uptime
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start h-12 px-3 ${
                      isActive ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    onClick={() => {
                      setActiveView(item.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer del sidebar */}
          <div className="p-4 border-t">
            <div className="text-xs text-center text-muted-foreground">
              Silhouette Framework V4.0
              <br />
              © 2025 Enterprise Edition
            </div>
          </div>
        </div>
      </div>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h2 className="text-xl font-semibold">
                  {currentMenuItem?.label || 'Dashboard'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentMenuItem?.description || 'Silhouette Control Center'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {notifications}
                  </Badge>
                )}
              </Button>

              {/* Quick actions */}
              <Button size="sm" className="hidden md:flex">
                <Zap className="h-4 w-4 mr-2" />
                Quick Action
              </Button>

              {/* Profile */}
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">S</span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium">Silhouette User</div>
                  <div className="text-xs text-muted-foreground">Enterprise</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="container mx-auto p-6">
            {currentMenuItem?.component || (
              <SilhouetteControlCenter />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};