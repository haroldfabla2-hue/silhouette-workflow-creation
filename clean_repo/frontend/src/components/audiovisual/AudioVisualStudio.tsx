'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Download, 
  Upload, 
  Video, 
  Image, 
  Music,
  Wand2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Settings,
  Sparkles
} from 'lucide-react';

interface AudioVisualProject {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio';
  status: 'draft' | 'generating' | 'completed' | 'error';
  progress: number;
  createdAt: Date;
  config: {
    provider: 'runway' | 'pika' | 'luma' | 'unsplash' | 'pexels';
    prompt: string;
    style?: string;
    duration?: number;
    quality?: string;
  };
  result?: {
    url: string;
    thumbnail?: string;
    metadata?: any;
  };
}

interface AudioVisualStudioProps {
  className?: string;
}

export const AudioVisualStudio: React.FC<AudioVisualStudioProps> = ({ 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState('create');
  const [projects, setProjects] = useState<AudioVisualProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingProject, setGeneratingProject] = useState<string | null>(null);
  
  // Configuración para nuevo proyecto
  const [newProject, setNewProject] = useState({
    name: '',
    type: 'video' as AudioVisualProject['type'],
    provider: 'runway' as AudioVisualProject['config']['provider'],
    prompt: '',
    style: '',
    duration: 10,
    quality: 'high'
  });

  // Cargar proyectos existentes
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/framework-v4/audiovisual/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data.map((project: any) => ({
          ...project,
          createdAt: new Date(project.createdAt)
        })));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      // Cargar datos de ejemplo
      setProjects([
        {
          id: '1',
          name: 'Video Promocional',
          type: 'video',
          status: 'completed',
          progress: 100,
          createdAt: new Date(),
          config: {
            provider: 'runway',
            prompt: 'A modern tech startup office with people working on computers',
            style: 'professional',
            duration: 15,
            quality: 'high'
          },
          result: {
            url: '/videos/sample.mp4',
            thumbnail: '/images/sample-thumb.jpg',
            metadata: { resolution: '1920x1080', duration: 15 }
          }
        }
      ]);
    }
  };

  // Crear nuevo proyecto
  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.prompt) return;
    
    setIsLoading(true);
    const project: AudioVisualProject = {
      id: `project-${Date.now()}`,
      name: newProject.name,
      type: newProject.type,
      status: 'generating',
      progress: 0,
      createdAt: new Date(),
      config: {
        provider: newProject.provider,
        prompt: newProject.prompt,
        style: newProject.style,
        duration: newProject.duration,
        quality: newProject.quality
      }
    };
    
    setProjects(prev => [project, ...prev]);
    setGeneratingProject(project.id);
    
    try {
      // Simular generación de contenido
      await simulateGeneration(project.id);
      
      // Actualizar proyecto como completado
      setProjects(prev => prev.map(p => 
        p.id === project.id 
          ? { 
              ...p, 
              status: 'completed', 
              progress: 100,
              result: {
                url: `/generated/${project.id}.${newProject.type === 'video' ? 'mp4' : newProject.type === 'image' ? 'jpg' : 'mp3'}`,
                thumbnail: `/thumbnails/${project.id}.jpg`,
                metadata: { 
                  resolution: newProject.type === 'video' ? '1920x1080' : undefined,
                  duration: newProject.type === 'video' ? newProject.duration : undefined
                }
              }
            }
          : p
      ));
    } catch (error) {
      setProjects(prev => prev.map(p => 
        p.id === project.id 
          ? { ...p, status: 'error' as const }
          : p
      ));
    } finally {
      setIsLoading(false);
      setGeneratingProject(null);
    }
  };

  // Simular generación de contenido
  const simulateGeneration = async (projectId: string) => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setProjects(prev => prev.map(p => 
            p.id === projectId ? { ...p, progress: 100 } : p
          ));
          resolve(true);
        } else {
          setProjects(prev => prev.map(p => 
            p.id === projectId ? { ...p, progress: Math.floor(progress) } : p
          ));
        }
      }, 500);
    });
  };

  // Obtener icono del tipo de proyecto
  const getProjectIcon = (type: AudioVisualProject['type']) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'image': return <Image className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
    }
  };

  // Obtener color del estado
  const getStatusColor = (status: AudioVisualProject['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Audiovisual Studio</CardTitle>
              <p className="text-purple-100">Genera contenido multimedia con IA</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="flex items-center space-x-2">
            <Wand2 className="h-4 w-4" />
            <span>Crear</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center space-x-2">
            <Video className="h-4 w-4" />
            <span>Proyectos</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configuración</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab de Creación */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario de creación */}
            <Card>
              <CardHeader>
                <CardTitle>Nuevo Proyecto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Proyecto</Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Mi video promocional"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Tipo de Contenido</Label>
                  <Select
                    value={newProject.type}
                    onValueChange={(value: AudioVisualProject['type']) => 
                      setNewProject(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center space-x-2">
                          <Video className="h-4 w-4" />
                          <span>Video</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center space-x-2">
                          <Image className="h-4 w-4" />
                          <span>Imagen</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="audio">
                        <div className="flex items-center space-x-2">
                          <Music className="h-4 w-4" />
                          <span>Audio</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="provider">Proveedor de IA</Label>
                  <Select
                    value={newProject.provider}
                    onValueChange={(value: AudioVisualProject['config']['provider']) => 
                      setNewProject(prev => ({ ...prev, provider: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="runway">Runway ML</SelectItem>
                      <SelectItem value="pika">Pika Labs</SelectItem>
                      <SelectItem value="luma">Luma AI</SelectItem>
                      <SelectItem value="unsplash">Unsplash</SelectItem>
                      <SelectItem value="pexels">Pexels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prompt">Descripción del Contenido</Label>
                  <Textarea
                    id="prompt"
                    value={newProject.prompt}
                    onChange={(e) => setNewProject(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Describe el contenido que quieres generar..."
                    rows={3}
                  />
                </div>

                {newProject.type === 'video' && (
                  <>
                    <div>
                      <Label htmlFor="duration">Duración (segundos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="60"
                        value={newProject.duration}
                        onChange={(e) => setNewProject(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="quality">Calidad</Label>
                  <Select
                    value={newProject.quality}
                    onValueChange={(value) => setNewProject(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja (Rápida)</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="ultra">Ultra (Lenta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCreateProject}
                  disabled={!newProject.name || !newProject.prompt || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generar con IA
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview y ayuda */}
            <Card>
              <CardHeader>
                <CardTitle>Preview y Ayuda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Métricas de calidad */}
                <div className="space-y-3">
                  <h4 className="font-medium">Métricas de Calidad</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">96.3%</div>
                      <div className="text-blue-800">Calidad de Video</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">&lt;5min</div>
                      <div className="text-green-800">Tiempo de Producción</div>
                    </div>
                  </div>
                </div>

                {/* Tips de prompt */}
                <div className="space-y-3">
                  <h4 className="font-medium">Tips para Mejores Resultados</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Sé específico en la descripción</li>
                    <li>• Menciona el estilo visual deseado</li>
                    <li>• Incluye detalles de iluminación</li>
                    <li>• Especifica el mood o ambiente</li>
                  </ul>
                </div>

                {/* Proveedores disponibles */}
                <div className="space-y-3">
                  <h4 className="font-medium">Proveedores Disponibles</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Badge variant="outline">Runway</Badge>
                      <span className="text-muted-foreground">Videos de alta calidad</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Badge variant="outline">Pika</Badge>
                      <span className="text-muted-foreground">Videos rápidos</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Badge variant="outline">Luma</Badge>
                      <span className="text-muted-foreground">Imágenes 3D</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Proyectos */}
        <TabsContent value="projects" className="space-y-6">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No hay proyectos</h3>
                  <p className="text-muted-foreground mb-4">
                    Crea tu primer proyecto de contenido multimedia
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Crear Proyecto
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  <div className="relative">
                    {project.result?.thumbnail ? (
                      <img 
                        src={project.result.thumbnail} 
                        alt={project.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        {getProjectIcon(project.type)}
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    
                    {project.status === 'generating' && (
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <Progress value={project.progress} className="w-full" />
                        <p className="text-xs text-white mt-1">
                          {project.progress}% completado
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {project.config.prompt.substring(0, 100)}...
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.createdAt.toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {project.config.provider}
                      </Badge>
                    </div>
                    
                    {project.status === 'completed' && project.result && (
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Download className="h-3 w-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab de Configuración */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Studio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Configuración avanzada del studio en desarrollo
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Configurar proveedores, calidad por defecto, y preferencias
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};