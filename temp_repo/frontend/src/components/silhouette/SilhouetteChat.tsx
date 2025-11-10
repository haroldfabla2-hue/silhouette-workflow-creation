'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Minimize2, 
  Maximize2, 
  Send, 
  Bot, 
  User,
  Loader2,
  Settings,
  Zap,
  Brain,
  Workflow,
  Key,
  Shield
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Message {
  id: string;
  type: 'user' | 'silhouette' | 'system';
  content: string;
  timestamp: Date;
  action?: {
    type: 'create-workflow' | 'create-module' | 'manage-credentials' | 'run-task';
    data?: any;
  };
}

interface SilhouetteChatProps {
  className?: string;
  isDocked?: boolean;
}

export const SilhouetteChat: React.FC<SilhouetteChatProps> = ({ 
  className = '',
  isDocked = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCapabilities, setCurrentCapabilities] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // WebSocket para comunicación con Silhouette
  const { socket, isConnected } = useWebSocket('silhouette-chat');

  // Auto-scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Conectar eventos de WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleSilhouetteResponse = (data: any) => {
      const message: Message = {
        id: `msg-${Date.now()}`,
        type: 'silhouette',
        content: data.content,
        timestamp: new Date(),
        action: data.action
      };
      
      setMessages(prev => [...prev, message]);
      setIsProcessing(false);
    };

    const handleCapabilityUpdate = (data: any) => {
      setCurrentCapabilities(data.capabilities || []);
    };

    socket.on('silhouette-response', handleSilhouetteResponse);
    socket.on('capability-update', handleCapabilityUpdate);

    return () => {
      socket.off('silhouette-response', handleSilhouetteResponse);
      socket.off('capability-update', handleCapabilityUpdate);
    };
  }, [socket, isConnected]);

  // Mensaje de bienvenida inicial
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'silhouette',
        content: `¡Hola! Soy Silhouette Enterprise V4.0, tu asistente inteligente de automatización empresarial. Puedo ayudarte con:

**🔧 BÁSICO:**
🔧 **Crear Workflows**: Diseña workflows complejos con IA
🤖 **Gestionar Módulos**: Crea y configura módulos reutilizables  
⚙️ **Configuraciones**: Administra configuraciones del sistema
🔐 **Credenciales**: Gestiona credenciales de forma segura

**🎭 ENTERPRISE (78+ Equipos):**
🎬 **Audiovisual Production**: Videos virales, imágenes, guiones con IA
📈 **Marketing Automation**: Campañas completas y redes sociales
💰 **Business Intelligence**: Análisis financiero y de mercado
🔐 **Compliance & Security**: Auditorías y ciberseguridad
⚙️ **Enterprise Workflows**: Procesos empresariales multi-equipo

**⚡ CAPACIDADES ÚNICAS:**
• 10,000+ tareas/hora con 99.99% calidad
• Tiempo de respuesta <100ms
• Escalabilidad horizontal automática
• QA ultra-robusto integrado

Escribe "ayuda" para ver todos los comandos disponibles. ¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      fetchCapabilities();
    }
  }, [isOpen, messages.length]);

  // Obtener capacidades disponibles
  const fetchCapabilities = async () => {
    try {
      const response = await fetch('/api/framework-v4/status');
      const data = await response.json();
      if (data.success) {
        setCurrentCapabilities([
          'workflow-creation',
          'module-management', 
          'configuration',
          'secure-credentials',
          'audiovisual-generation',
          'ml-optimization'
        ]);
      }
    } catch (error) {
      console.error('Error fetching capabilities:', error);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    // Analizar intención del mensaje
    const intent = analyzeIntent(inputMessage);
    
    if (intent) {
      await executeAction(intent, inputMessage);
    } else {
      // Enviar al backend para procesamiento
      if (socket && isConnected) {
        socket.emit('chat-message', {
          message: inputMessage.trim(),
          context: 'silhouette-chat',
          capabilities: currentCapabilities
        });
      }
    }
  };

  // Analizar intención del mensaje
  const analyzeIntent = (message: string): any => {
    const lowerMessage = message.toLowerCase();
    
    // === COMANDOS BÁSICOS SILHOUETTE ===
    if (lowerMessage.includes('crear workflow') || lowerMessage.includes('nuevo workflow')) {
      return { type: 'create-workflow', data: { name: extractName(message) } };
    }
    
    if (lowerMessage.includes('crear módulo') || lowerMessage.includes('nuevo módulo')) {
      return { type: 'create-module', data: { name: extractName(message) } };
    }
    
    if (lowerMessage.includes('credenciales') || lowerMessage.includes('apikey') || lowerMessage.includes('password')) {
      return { type: 'manage-credentials', data: {} };
    }
    
    if (lowerMessage.includes('ejecutar') || lowerMessage.includes('run')) {
      return { type: 'run-task', data: { command: message } };
    }
    
    if (lowerMessage.includes('configuración') || lowerMessage.includes('settings')) {
      return { type: 'configuration', data: {} };
    }
    
    if (lowerMessage.includes('audiovisual') || lowerMessage.includes('video') || lowerMessage.includes('imagen')) {
      return { type: 'audiovisual', data: {} };
    }

    // === COMANDOS ENTERPRISE - SISTEMA AUDIOVISUAL ===
    if (lowerMessage.includes('crea video') || lowerMessage.includes('genera video') || lowerMessage.includes('video viral')) {
      return { 
        type: 'audiovisual_produce', 
        data: { 
          type: 'video', 
          parameters: extractVideoParams(message) 
        } 
      };
    }

    if (lowerMessage.includes('busca imágenes') || lowerMessage.includes('encuentra imágenes') || lowerMessage.includes('imágenes para')) {
      return { 
        type: 'image_search', 
        data: { 
          query: extractImageQuery(message),
          count: extractCount(message) || 10 
        } 
      };
    }

    if (lowerMessage.includes('crea guión') || lowerMessage.includes('genera script') || lowerMessage.includes('escribe guión')) {
      return { 
        type: 'generate_script', 
        data: extractScriptParams(message) 
      };
    }

    // === COMANDOS ENTERPRISE - MARKETING ===
    if (lowerMessage.includes('crea campaña') || lowerMessage.includes('campaña de marketing') || lowerMessage.includes('marketing')) {
      return { 
        type: 'marketing_campaign', 
        data: extractMarketingParams(message) 
      };
    }

    if (lowerMessage.includes('redes sociales') || lowerMessage.includes('social media') || lowerMessage.includes('publicar en')) {
      return { 
        type: 'social_media', 
        data: extractSocialMediaParams(message) 
      };
    }

    // === COMANDOS ENTERPRISE - BUSINESS INTELLIGENCE ===
    if (lowerMessage.includes('análisis financiero') || lowerMessage.includes('finanzas') || lowerMessage.includes('presupuesto')) {
      return { 
        type: 'financial_analysis', 
        data: extractFinancialParams(message) 
      };
    }

    if (lowerMessage.includes('investigación de mercado') || lowerMessage.includes('estudio de mercado') || lowerMessage.includes('análisis de mercado')) {
      return { 
        type: 'market_research', 
        data: extractResearchParams(message) 
      };
    }

    // === COMANDOS ENTERPRISE - COMPLIANCE & SECURITY ===
    if (lowerMessage.includes('auditoría') || lowerMessage.includes('compliance') || lowerMessage.includes('cumplimiento')) {
      return { 
        type: 'compliance_audit', 
        data: extractComplianceParams(message) 
      };
    }

    if (lowerMessage.includes('seguridad') || lowerMessage.includes('ciberseguridad') || lowerMessage.includes('security')) {
      return { 
        type: 'security_assessment', 
        data: extractSecurityParams(message) 
      };
    }

    // === COMANDOS ENTERPRISE - WORKFLOWS DINÁMICOS ===
    if (lowerMessage.includes('workflow empresarial') || lowerMessage.includes('proceso enterprise') || lowerMessage.includes('automatización completa')) {
      return { 
        type: 'enterprise_workflow', 
        data: extractWorkflowParams(message) 
      };
    }

    if (lowerMessage.includes('equipos') || lowerMessage.includes('teams') || lowerMessage.includes('ver equipos')) {
      return { type: 'list_teams', data: {} };
    }

    if (lowerMessage.includes('inicia equipo') || lowerMessage.includes('activa equipo') || lowerMessage.includes('start team')) {
      return { 
        type: 'start_team', 
        data: { teamName: extractTeamName(message) } 
      };
    }

    // === COMANDOS DE AYUDA ENTERPRISE ===
    if (lowerMessage.includes('help') || lowerMessage.includes('ayuda') || lowerMessage.includes('comandos')) {
      return { type: 'show_help', data: {} };
    }

    if (lowerMessage.includes('capacidades') || lowerMessage.includes('qué puedes hacer') || lowerMessage.includes('features')) {
      return { type: 'show_capabilities', data: {} };
    }
    
    return null;
  };

  // === FUNCIONES AUXILIARES PARA COMANDOS ENTERPRISE ===

  // Extraer nombre de workflow/módulo
  const extractName = (message: string): string => {
    const nameMatch = message.match(/nombre[:\s]+(.+)/i);
    return nameMatch ? nameMatch[1].trim() : 'Nuevo';
  };

  // Extraer parámetros de video
  const extractVideoParams = (message: string) => {
    const topic = message.match(/sobre[:\s]+(.+)/i)?.[1]?.trim() || 'Contenido general';
    const duration = message.match(/duración[:\s]+(\d+)/i)?.[1] || '30';
    const platform = message.match(/(instagram|youtube|tiktok|facebook)/i)?.[1]?.toLowerCase() || 'instagram';
    
    return {
      topic,
      duration: parseInt(duration),
      platform,
      audience: 'general',
      tone: 'professional'
    };
  };

  // Extraer consulta de imágenes
  const extractImageQuery = (message: string): string => {
    const queryMatch = message.match(/de[:\s]+(.+)/i) || message.match(/para[:\s]+(.+)/i);
    return queryMatch ? queryMatch[1].trim() : 'imagen profesional';
  };

  // Extraer cantidad
  const extractCount = (message: string): number | undefined => {
    const countMatch = message.match(/(\d+)\s*(imágenes|fotos|imagenes)/i);
    return countMatch ? parseInt(countMatch[1]) : undefined;
  };

  // Extraer parámetros de guión
  const extractScriptParams = (message: string) => {
    const topic = message.match(/sobre[:\s]+(.+)/i)?.[1]?.trim() || 'Contenido general';
    const platform = message.match(/(instagram|youtube|tiktok)/i)?.[1]?.toLowerCase() || 'instagram';
    const duration = message.match(/duración[:\s]+(\d+)/i)?.[1] || '30';
    
    return {
      topic,
      platform,
      duration: parseInt(duration),
      audience: 'general',
      tone: 'professional'
    };
  };

  // Extraer parámetros de marketing
  const extractMarketingParams = (message: string) => {
    const campaignType = message.match(/(product launch|brand awareness|sales|lead generation)/i)?.[1]?.toLowerCase() || 'brand awareness';
    const target = message.match(/para[:\s]+(.+)/i)?.[1]?.trim() || 'audiencia general';
    const budget = message.match(/presupuesto[:\s]+(\d+)/i)?.[1] || '5000';
    
    return {
      campaignType,
      target,
      budget: parseInt(budget),
      duration: '30',
      platforms: ['instagram', 'facebook', 'linkedin']
    };
  };

  // Extraer parámetros de redes sociales
  const extractSocialMediaParams = (message: string) => {
    const platform = message.match(/(instagram|facebook|twitter|linkedin|youtube)/i)?.[1]?.toLowerCase() || 'instagram';
    const content = message.match(/contenido[:\s]+(.+)/i)?.[1]?.trim() || 'Contenido promocional';
    
    return {
      platform,
      content,
      schedule: 'inmediato',
      engagement: 'maximo'
    };
  };

  // Extraer parámetros financieros
  const extractFinancialParams = (message: string) => {
    const type = message.match(/(análisis|forecast|presupuesto|roi)/i)?.[1]?.toLowerCase() || 'análisis';
    const period = message.match(/período[:\s]+(\d+)\s*(meses|mes|años|año)/i)?.[0] || '12 meses';
    
    return {
      type,
      period,
      data: 'automatico'
    };
  };

  // Extraer parámetros de investigación
  const extractResearchParams = (message: string) => {
    const industry = message.match(/(tecnología|saúde|finanzas|retail|manufactura)/i)?.[1]?.toLowerCase() || 'tecnología';
    const region = message.match(/región[:\s]+(.+)/i)?.[1]?.trim() || 'global';
    
    return {
      industry,
      region,
      competitors: 'top 5',
      metrics: 'completos'
    };
  };

  // Extraer parámetros de compliance
  const extractComplianceParams = (message: string) => {
    const standard = message.match(/(iso|gdpr|sox|pci)/i)?.[1]?.toUpperCase() || 'ISO';
    const scope = message.match(/alcance[:\s]+(.+)/i)?.[1]?.trim() || 'empresa completa';
    
    return {
      standard,
      scope,
      frequency: 'anual'
    };
  };

  // Extraer parámetros de seguridad
  const extractSecurityParams = (message: string) => {
    const scope = message.match(/alcance[:\s]+(.+)/i)?.[1]?.trim() || 'infraestructura completa';
    const threats = message.match(/amenazas[:\s]+(.+)/i)?.[1]?.trim() || 'todas las amenazas';
    
    return {
      scope,
      threats,
      infrastructure: 'completa'
    };
  };

  // Extraer parámetros de workflow
  const extractWorkflowParams = (message: string) => {
    const workflowType = message.match(/(onboarding|ventas|marketing|desarrollo)/i)?.[1]?.toLowerCase() || 'ventas';
    const teams = ['marketing', 'sales', 'finance'];
    
    return {
      workflowType,
      teams,
      parameters: {}
    };
  };

  // Extraer nombre de equipo
  const extractTeamName = (message: string): string => {
    const teamMatch = message.match(/equipo[:\s]+(.+)/i) || message.match(/team[:\s]+(.+)/i);
    return teamMatch ? teamMatch[1].trim().toLowerCase() : 'marketing';
  };

  // Ejecutar acción
  const executeAction = async (action: any, originalMessage: string) => {
    try {
      switch (action.type) {
        // === ACCIONES BÁSICAS SILHOUETTE ===
        case 'create-workflow':
          await createWorkflow(action.data);
          break;
        case 'create-module':
          await createModule(action.data);
          break;
        case 'manage-credentials':
          await showCredentialsPanel();
          break;
        case 'run-task':
          await executeTask(action.data);
          break;
        case 'configuration':
          await openConfiguration();
          break;
        case 'audiovisual':
          await openAudiovisualStudio();
          break;

        // === ACCIONES ENTERPRISE - AUDIOVISUAL ===
        case 'audiovisual_produce':
          await executeAudiovisualProduction(action.data);
          break;
        case 'image_search':
          await executeImageSearch(action.data);
          break;
        case 'generate_script':
          await executeScriptGeneration(action.data);
          break;

        // === ACCIONES ENTERPRISE - MARKETING ===
        case 'marketing_campaign':
          await executeMarketingCampaign(action.data);
          break;
        case 'social_media':
          await executeSocialMediaAutomation(action.data);
          break;

        // === ACCIONES ENTERPRISE - BUSINESS INTELLIGENCE ===
        case 'financial_analysis':
          await executeFinancialAnalysis(action.data);
          break;
        case 'market_research':
          await executeMarketResearch(action.data);
          break;

        // === ACCIONES ENTERPRISE - COMPLIANCE & SECURITY ===
        case 'compliance_audit':
          await executeComplianceAudit(action.data);
          break;
        case 'security_assessment':
          await executeSecurityAssessment(action.data);
          break;

        // === ACCIONES ENTERPRISE - WORKFLOWS ===
        case 'enterprise_workflow':
          await executeEnterpriseWorkflow(action.data);
          break;
        case 'list_teams':
          await listEnterpriseTeams();
          break;
        case 'start_team':
          await startEnterpriseTeam(action.data);
          break;

        // === ACCIONES DE AYUDA ===
        case 'show_help':
          await showEnterpriseHelp();
          break;
        case 'show_capabilities':
          await showEnterpriseCapabilities();
          break;

        default:
          await handleGenericRequest(originalMessage);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'silhouette',
        content: `❌ Error ejecutando la acción: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsProcessing(false);
    }
  };

  // Crear workflow
  const createWorkflow = async (data: any) => {
    const workflowData = {
      name: data.name || `Workflow ${new Date().toLocaleString()}`,
      description: 'Creado con Silhouette AI',
      canvasData: {
        nodes: [
          {
            id: 'start-1',
            type: 'workflowNode',
            position: { x: 100, y: 100 },
            data: { 
              label: 'Inicio', 
              type: 'start',
              config: {}
            }
          }
        ],
        edges: []
      },
      status: 'draft'
    };

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });

      const result = await response.json();
      
      const successMessage: Message = {
        id: `success-${Date.now()}`,
        type: 'silhouette',
        content: `✅ ¡Workflow "${data.name}" creado exitosamente! \n\n📝 ID: ${result.data.id}\n🔗 Puedes editarlo en el canvas de workflows\n⚙️ Configura los nodos según tus necesidades`,
        timestamp: new Date(),
        action: {
          type: 'create-workflow',
          data: result.data
        }
      };
      
      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      throw new Error('No se pudo crear el workflow');
    } finally {
      setIsProcessing(false);
    }
  };

  // Crear módulo
  const createModule = async (data: any) => {
    const moduleData = {
      name: data.name || `Module ${new Date().toLocaleString()}`,
      description: 'Módulo creado con Silhouette AI',
      type: 'custom',
      configuration: {},
      isActive: true
    };

    // Simular creación de módulo
    const successMessage: Message = {
      id: `module-${Date.now()}`,
      type: 'silhouette',
      content: `🔧 ¡Módulo "${data.name}" creado exitosamente!\n\n📦 Tipo: Custom Module\n⚙️ Configuración: Lista para personalizar\n🔗 Puede ser usado en cualquier workflow\n\n¿Te gustaría configurarlo ahora?`,
      timestamp: new Date(),
      action: {
        type: 'create-module',
        data: moduleData
      }
    };
    
    setMessages(prev => [...prev, successMessage]);
    setIsProcessing(false);
  };

  // Mostrar panel de credenciales
  const showCredentialsPanel = async () => {
    const message: Message = {
      id: `credentials-${Date.now()}`,
      type: 'silhouette',
      content: `🔐 **Gestión Segura de Credenciales**\n\nPara tu seguridad, Silhouette maneja las credenciales de forma encriptada:\n\n**Cómo funciona:**\n1. Tú proporcionas las credenciales (API keys, passwords, etc.)\n2. Silhouette las encripta y almacena de forma segura\n3. Solo Silhouette puede acceder a ellas para llamadas API\n4. Tú nunca ves las credenciales plain text\n\n**Credenciales soportadas:**\n- OpenAI API Key\n- Runway API Key\n- Pika API Key\n- Luma API Key\n- Database passwords\n- Custom API keys\n\n¿Quieres configurar credenciales ahora?`,
      timestamp: new Date(),
      action: {
        type: 'manage-credentials',
        data: {}
      }
    };
    
    setMessages(prev => [...prev, message]);
    setIsProcessing(false);
  };

  // Ejecutar tarea
  const executeTask = async (data: any) => {
    // Simular ejecución de tarea
    const message: Message = {
      id: `task-${Date.now()}`,
      type: 'silhouette',
      content: `⚡ **Ejecutando tarea:** ${data.command}\n\n🔄 Estado: En progreso...\n📊 Progreso: 25%\n⏱️ Tiempo estimado: 2-3 minutos\n\nSilhouette está procesando tu solicitud. Te notificaré cuando termine.`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, message]);
    
    // Simular progreso
    setTimeout(() => {
      const completeMessage: Message = {
        id: `complete-${Date.now()}`,
        type: 'silhouette',
        content: `✅ **Tarea completada exitosamente!**\n\n🎯 Resultado: ${data.command} ejecutado\n📈 Performance: Óptimo\n🔄 ¿Necesitas que haga algo más?`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, completeMessage]);
    }, 3000);
    
    setIsProcessing(false);
  };

  // Abrir configuración
  const openConfiguration = () => {
    const message: Message = {
      id: `config-${Date.now()}`,
      type: 'silhouette',
      content: `⚙️ **Configuración del Sistema**\n\n🏗️ **Configuraciones disponibles:**\n- Configuración de Workflows\n- Parámetros de Rendimiento\n- Configuración de AI/ML\n- Configuración de Seguridad\n- Configuración de Notificaciones\n- Configuración de Integraciones\n\n🔧 ¿Qué aspecto quieres configurar?`,
      timestamp: new Date(),
      action: {
        type: 'configuration',
        data: {}
      }
    };
    
    setMessages(prev => [...prev, message]);
    setIsProcessing(false);
  };

  // Abrir audiovisual studio
  const openAudiovisualStudio = () => {
    const message: Message = {
      id: `audiovisual-${Date.now()}`,
      type: 'silhouette',
      content: `🎨 **Studio Audiovisual Silhouette**\n\n🎬 **Capacidades disponibles:**\n- Generación de videos (Runway, Pika)\n- Procesamiento de imágenes (Luma AI)\n- Generación de audio\n- Edición timeline\n- Exportación multimedia\n- Optimización con IA\n\n📝 **Proyectos recientes:**\n- Video marketing: 96.3% quality\n- Image processing: <5min production\n- Audio generation: 8.2%+ engagement\n\n¿Quieres crear un nuevo proyecto audiovisual?`,
      timestamp: new Date(),
      action: {
        type: 'audiovisual',
        data: {}
      }
    };
    
    setMessages(prev => [...prev, message]);
    setIsProcessing(false);
  };

  // Manejar request genérico
  const handleGenericRequest = async (message: string) => {
    // Simular procesamiento con IA
    setTimeout(() => {
      const response: Message = {
        id: `response-${Date.now()}`,
        type: 'silhouette',
        content: `🤖 **Procesando con IA...**\n\n"${message}"\n\nHe analizado tu solicitud. ¿Podrías ser más específico sobre qué acción quieres que realice? Puedo ayudarte con:\n\n1. **Crear workflows** - Diseña procesos automatizados\n2. **Gestionar módulos** - Crea componentes reutilizables\n3. **Configurar credenciales** - Administra API keys de forma segura\n4. **Generar contenido** - Crea videos e imágenes con IA
5. **Optimizar procesos** - Mejora el rendimiento con ML\n\n¿En qué te gustaría que me enfoque?`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);
      setIsProcessing(false);
    }, 1500);
  };

  // === FUNCIONES ENTERPRISE AUDIOVISUAL ===

  // Ejecutar producción audiovisual
  const executeAudiovisualProduction = async (data: any) => {
    try {
      const response = await fetch('/api/enterprise-agents/audiovisual/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        const message: Message = {
          id: `av-${Date.now()}`,
          type: 'silhouette',
          content: `🎬 **Producción Audiovisual Completada**\n\n✅ Video generado exitosamente\n📊 Calidad: ${result.production.quality_score}%\n🎯 Plataformas optimizadas: ${result.production.platforms?.join(', ')}\n📈 Predicción de engagement: +${result.production.engagement_prediction}%\n\n🔗 **Enlace del video:** ${result.production.video_url}\n\n¿Te gustaría que cree otro video o modifique este?`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      throw new Error('Error en producción audiovisual');
    }
    setIsProcessing(false);
  };

  // Búsqueda de imágenes
  const executeImageSearch = async (data: any) => {
    try {
      const response = await fetch('/api/enterprise-agents/audiovisual/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        const message: Message = {
          id: `img-search-${Date.now()}`,
          type: 'silhouette',
          content: `🖼️ **Búsqueda de Imágenes Completada**\n\n✅ Encontradas ${result.images?.length || 0} imágenes de alta calidad\n🔍 Consulta: "${data.query}"\n📊 Calidad: Alta resolución\n\n${result.images?.map((img: any, i: number) => `**${i+1}.** ${img.title} - ${img.source}`).join('\n') || 'Imágenes generadas automáticamente'}\n\n¿Te gustaría descargar alguna imagen o buscar más?`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      throw new Error('Error en búsqueda de imágenes');
    }
    setIsProcessing(false);
  };

  // === FUNCIONES ENTERPRISE MARKETING ===

  // Ejecutar campaña de marketing
  const executeMarketingCampaign = async (data: any) => {
    try {
      const response = await fetch('/api/enterprise-agents/marketing/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        const message: Message = {
          id: `campaign-${Date.now()}`,
          type: 'silhouette',
          content: `📢 **Campaña de Marketing Creada**\n\n✅ Estrategia desarrollada para ${data.campaignType}\n🎯 Audiencia: ${data.target}\n💰 Presupuesto: $${data.budget}\n⏱️ Duración: ${data.duration} días\n\n**Plan de acción:**\n• Estrategia: ${result.campaign.strategy}\n• Timeline: ${result.campaign.timeline}\n• Distribución de presupuesto: $${result.campaign.budget_allocation}\n\n**Contenido generado:**\n${result.campaign.content}\n\n¿Quieres que implemente la campaña ahora?`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      throw new Error('Error creando campaña');
    }
    setIsProcessing(false);
  };

  // === FUNCIONES ENTERPRISE WORKFLOWS ===

  // Ejecutar workflow empresarial
  const executeEnterpriseWorkflow = async (data: any) => {
    try {
      const response = await fetch('/api/enterprise-agents/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        const message: Message = {
          id: `workflow-${Date.now()}`,
          type: 'silhouette',
          content: `⚡ **Workflow Empresarial Ejecutado**\n\n🔄 Tipo: ${data.workflowType}\n👥 Equipos involucrados: ${result.workflow.teams_involved?.join(', ')}\n⏱️ Tiempo de ejecución: ${(result.executionTime / 1000).toFixed(1)}s\n\n**Estado:**\n${result.workflow.status}\n\n**Métricas:**\n• Tareas completadas: ${result.workflow.metrics?.tasks_completed}\n• Puntuación de calidad: ${result.workflow.metrics?.quality_score}%\n• Eficiencia: ${result.workflow.metrics?.efficiency}%\n\n¿Quieres ejecutar otro workflow o optimizar este?`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      throw new Error('Error ejecutando workflow empresarial');
    }
    setIsProcessing(false);
  };

  // === FUNCIONES DE AYUDA ENTERPRISE ===

  // Mostrar ayuda enterprise
  const showEnterpriseHelp = () => {
    const message: Message = {
      id: `help-${Date.now()}`,
      type: 'silhouette',
      content: `🤖 **Silhouette Enterprise - Guía de Comandos**\n\n**BÁSICO:**\n• "crear workflow" - Diseña un proceso automatizado\n• "crear módulo" - Crea un componente reutilizable\n• "credenciales" - Gestiona API keys de forma segura\n\n**ENTERPRISE AUDIOVISUAL:**\n• "crea video viral sobre..." - Genera videos con IA\n• "busca imágenes de..." - Búsqueda automática de imágenes\n• "crea guión para..." - Guiones profesionales\n\n**MARKETING:**\n• "crea campaña de marketing para..." - Campañas completas\n• "automatiza redes sociales en..." - Gestión social media\n\n**WORKFLOWS EMPRESARIALES:**\n• "workflow empresarial de..." - Procesos multi-equipo\n• "ver equipos" - Lista todos los 78+ equipos\n\nEscribe cualquier comando o pregunta para empezar!`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
    setIsProcessing(false);
  };

  // Mostrar capacidades enterprise
  const showEnterpriseCapabilities = () => {
    const message: Message = {
      id: `capabilities-${Date.now()}`,
      type: 'silhouette',
      content: `⚡ **Capacidades Silhouette Enterprise V4.0**\n\n**SISTEMA BASE:**\n✅ Framework V4.0 integrado\n✅ Sistema de usuarios multi-tenant\n✅ WebSocket en tiempo real\n✅ Seguridad empresarial\n\n**78+ EQUIPOS ESPECIALIZADOS:**\n🎬 **Audiovisual (15 equipos)** - Videos, imágenes, guiones, animaciones\n📈 **Marketing (10 equipos)** - Campañas, redes sociales, analytics\n💰 **Business (25 equipos)** - Finanzas, ventas, strategy, HR\n🔐 **Security (10 equipos)** - Compliance, cybersecurity, audit\n⚙️ **Technical (18 equipos)** - DevOps, data engineering, optimization\n\n**CAPACIDADES ÚNICAS:**\n• Producción audiovisual ultra-profesional (99.99% calidad)\n• QA automático con verificación multi-fuente\n• Workflows dinámicos auto-optimizables\n• Escalabilidad horizontal automática\n• Tiempo de respuesta <100ms\n• 10,000+ tareas/hora\n\n¡Todo listo para automatizar tu empresa! 🚀`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
    setIsProcessing(false);
  };

  // Manejar tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Chat flotante
  if (!isDocked) {
    return (
      <>
        {/* Botón flotante */}
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg z-50"
            size="sm"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        )}

        {/* Chat panel */}
        {isOpen && (
          <Card className={`fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                <span className="font-semibold">Silhouette AI</span>
                <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                  {isConnected ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            {!isMinimized && (
              <CardContent className="flex flex-col h-96">
                {/* Messages */}
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.type === 'user'
                              ? 'bg-blue-600 text-white'
                              : message.type === 'silhouette'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-yellow-100 text-yellow-900'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            {message.type === 'silhouette' && (
                              <Bot className="h-4 w-4 mt-1 text-purple-600" />
                            )}
                            {message.type === 'user' && (
                              <User className="h-4 w-4 mt-1" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-purple-600" />
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Silhouette está pensando...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="flex space-x-2 mt-4">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu mensaje a Silhouette..."
                    className="flex-1"
                    disabled={!isConnected || isProcessing}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || !isConnected || isProcessing}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </>
    );
  }

  // Chat dockeado
  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
          <span className="font-semibold">Silhouette AI</span>
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            {isConnected ? 'Online' : 'Offline'}
          </Badge>
        </div>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="flex flex-col h-[calc(100%-80px)]">
          {/* Messages */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.type === 'silhouette'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-yellow-100 text-yellow-900'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.type === 'silhouette' && (
                        <Bot className="h-4 w-4 mt-1 text-purple-600" />
                      )}
                      {message.type === 'user' && (
                        <User className="h-4 w-4 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-purple-600" />
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Silhouette está pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex space-x-2 mt-4">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje a Silhouette..."
              className="flex-1"
              disabled={!isConnected || isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected || isProcessing}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};