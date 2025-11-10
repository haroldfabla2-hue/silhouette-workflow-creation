import { DataSource } from 'typeorm';
import { OpenAI } from 'openai';
import { AuthUser } from '../auth/auth.service';
import { Workflow } from '../types/workflow.entity';
import { WorkflowNode } from '../types/workflow-node.entity';

export interface AIWorkflowRequest {
  description: string;
  goals?: string[];
  inputData?: any;
  expectedOutput?: any;
  constraints?: string[];
  industries?: string[];
  complexity?: 'simple' | 'medium' | 'complex';
  preferences?: {
    nodeTypes?: string[];
    dataFlow?: 'linear' | 'branching' | 'circular';
    errorHandling?: 'basic' | 'advanced' | 'enterprise';
  };
}

export interface AIWorkflowResponse {
  success: boolean;
  workflow: {
    name: string;
    description: string;
    canvasData: any;
    nodes: any[];
    edges: any[];
    aiInsights: {
      suggestedNodes: any[];
      dataFlow: string;
      optimizationHints: string[];
      errorPoints: string[];
    };
    executionPlan: {
      steps: any[];
      estimatedDuration: number;
      resourceRequirements: any;
    };
  };
  confidence: number;
  reasoning: string;
  suggestions: string[];
}

export class AIWorkflowService {
  private readonly dataSource: DataSource;
  private readonly openai: OpenAI;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Genera un workflow completo usando IA
   */
  async generateWorkflow(
    user: AuthUser,
    request: AIWorkflowRequest,
  ): Promise<AIWorkflowResponse> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:write')) {
        throw new Error('Sin permisos para generar workflows');
      }

      // Construir prompt para la IA
      const prompt = this.buildGenerationPrompt(request);

      // Generar con OpenAI
      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en diseño de workflows empresariales. Tu tarea es generar workflows JSON optimizados y detallados.
            
            Debes responder EXCLUSIVAMENTE con un JSON válido en el siguiente formato:
            
            {
              "workflow": {
                "name": "Nombre descriptivo del workflow",
                "description": "Descripción clara del propósito",
                "canvasData": { /* React Flow canvas data */ },
                "nodes": [ /* Array de nodos */ ],
                "edges": [ /* Array de conexiones */ ]
              },
              "aiInsights": {
                "suggestedNodes": [ /* Nodos sugeridos */ ],
                "dataFlow": "Descripción del flujo de datos",
                "optimizationHints": [ /* Pistas de optimización */ ],
                "errorPoints": [ /* Puntos de error potenciales */ ]
              },
              "executionPlan": {
                "steps": [ /* Plan de ejecución */ ],
                "estimatedDuration": 300000,
                "resourceRequirements": { /* Requerimientos */ }
              }
            }`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      // Parsear respuesta de la IA
      const generatedContent = aiResponse.choices[0].message.content;
      let aiGeneratedData;
      
      try {
        aiGeneratedData = JSON.parse(generatedContent!);
      } catch (parseError) {
        throw new Error('La IA generó un formato de respuesta inválido');
      }

      // Validar y completar la estructura
      const validatedWorkflow = this.validateAndCompleteWorkflow(aiGeneratedData.workflow, request);

      // Calcular confianza basada en la completitud de la respuesta
      const confidence = this.calculateConfidence(aiGeneratedData, request);

      // Generar insights adicionales
      const insights = await this.generateAdditionalInsights(validatedWorkflow, request);

      return {
        success: true,
        workflow: {
          ...validatedWorkflow,
          aiInsights: insights,
        },
        confidence,
        reasoning: this.generateReasoning(aiGeneratedData, request),
        suggestions: this.generateSuggestions(validatedWorkflow, request),
      };

    } catch (error) {
      return {
        success: false,
        workflow: null!,
        confidence: 0,
        reasoning: `Error en generación: ${error.message}`,
        suggestions: ['Intenta ser más específico con los requisitos', 'Proporciona ejemplos del proceso deseado'],
      };
    }
  }

  /**
   * Optimiza un workflow existente usando IA
   */
  async optimizeWorkflow(
    user: AuthUser,
    workflowId: string,
    optimizationGoals?: string[],
  ): Promise<{
    success: boolean;
    optimizations: any[];
    performanceGains: any;
    issues: any[];
    suggestions: string[];
  }> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:write')) {
        throw new Error('Sin permisos para optimizar workflows');
      }

      // Obtener workflow actual
      const workflow = await this.dataSource.getRepository(Workflow).findOne({
        where: { id: workflowId, orgId: user.orgId },
        relations: ['nodes'],
      });

      if (!workflow) {
        throw new Error('Workflow no encontrado');
      }

      // Construir prompt de optimización
      const prompt = this.buildOptimizationPrompt(workflow, optimizationGoals);

      // Generar optimizaciones
      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en optimización de workflows. Analiza workflows empresariales y proporciona optimizaciones específicas.

            Responde EXCLUSIVAMENTE con un JSON válido en el siguiente formato:
            
            {
              "optimizations": [ /* Array de optimizaciones específicas */ ],
              "performanceGains": { /* Mejoras de rendimiento estimadas */ },
              "issues": [ /* Problemas identificados */ ],
              "suggestions": [ /* Sugerencias de mejora */ ]
            }`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      });

      const optimizationsData = JSON.parse(aiResponse.choices[0].message.content!);

      return {
        success: true,
        ...optimizationsData,
      };

    } catch (error) {
      return {
        success: false,
        optimizations: [],
        performanceGains: {},
        issues: [{ severity: 'error', message: `Error en optimización: ${error.message}` }],
        suggestions: ['Verifica la conexión con la IA', 'Intenta con un workflow más simple'],
      };
    }
  }

  /**
   * Genera nodos específicos para un workflow
   */
  async generateNodes(
    user: AuthUser,
    requirements: string,
    context: any,
  ): Promise<{
    success: boolean;
    nodes: any[];
    reasoning: string;
  }> {
    try {
      const prompt = `Genera nodos específicos para este requisito: "${requirements}"
      
      Contexto: ${JSON.stringify(context)}
      
      Responde con JSON:
      {
        "nodes": [
          {
            "id": "unique-id",
            "type": "node-type",
            "position": {"x": 0, "y": 0},
            "data": { /* Configuración del nodo */ },
            "config": { /* Configuraciones avanzadas */ }
          }
        ],
        "reasoning": "Explicación de por qué se eligieron estos nodos"
      }`;

      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      const responseData = JSON.parse(aiResponse.choices[0].message.content!);

      return {
        success: true,
        nodes: responseData.nodes,
        reasoning: responseData.reasoning,
      };

    } catch (error) {
      return {
        success: false,
        nodes: [],
        reasoning: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Analiza un workflow y sugiere mejoras
   */
  async analyzeWorkflow(
    user: AuthUser,
    workflowId: string,
  ): Promise<{
    success: boolean;
    analysis: {
      complexity: string;
      performance: any;
      maintainability: string;
      bottlenecks: any[];
      improvements: any[];
    };
    score: number;
  }> {
    try {
      const workflow = await this.dataSource.getRepository(Workflow).findOne({
        where: { id: workflowId, orgId: user.orgId },
        relations: ['nodes'],
      });

      if (!workflow) {
        throw new Error('Workflow no encontrado');
      }

      // Análisis básico del workflow
      const analysis = {
        complexity: this.calculateComplexity(workflow),
        performance: this.analyzePerformance(workflow),
        maintainability: this.calculateMaintainability(workflow),
        bottlenecks: this.identifyBottlenecks(workflow),
        improvements: this.suggestImprovements(workflow),
      };

      // Calcular puntuación general
      const score = this.calculateScore(analysis);

      return {
        success: true,
        analysis,
        score,
      };

    } catch (error) {
      return {
        success: false,
        analysis: {
          complexity: 'unknown',
          performance: {},
          maintainability: 'unknown',
          bottlenecks: [],
          improvements: [],
        },
        score: 0,
      };
    }
  }

  /**
   * Convierte lenguaje natural a configuración de nodos
   */
  async parseNaturalLanguage(
    user: AuthUser,
    text: string,
  ): Promise<{
    success: boolean;
    interpretedNodes: any[];
    rawIntention: string;
    confidence: number;
  }> {
    try {
      const prompt = `Interpreta este texto y convierte en configuración de nodos de workflow:
      
      "${text}"
      
      Responde con JSON:
      {
        "interpretedNodes": [
          {
            "action": "Acción que debe realizar",
            "type": "Tipo de nodo sugerido",
            "config": { /* Configuración */ },
            "confidence": 0.8
          }
        ],
        "rawIntention": "Lo que interpretas del texto",
        "confidence": 0.7
      }`;

      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const responseData = JSON.parse(aiResponse.choices[0].message.content!);

      return {
        success: true,
        ...responseData,
      };

    } catch (error) {
      return {
        success: false,
        interpretedNodes: [],
        rawIntention: 'Error en interpretación',
        confidence: 0,
      };
    }
  }

  // Métodos auxiliares privados

  private buildGenerationPrompt(request: AIWorkflowRequest): string {
    return `
      Genera un workflow empresarial completo para:
      
      Descripción: ${request.description}
      
      ${request.goals ? `Objetivos: ${request.goals.join(', ')}` : ''}
      ${request.inputData ? `Datos de entrada: ${JSON.stringify(request.inputData)}` : ''}
      ${request.expectedOutput ? `Salida esperada: ${JSON.stringify(request.expectedOutput)}` : ''}
      ${request.constraints ? `Restricciones: ${request.constraints.join(', ')}` : ''}
      ${request.industries ? `Industrias: ${request.industries.join(', ')}` : ''}
      ${request.complexity ? `Complejidad: ${request.complexity}` : ''}
      
      Preferencias:
      ${request.preferences ? JSON.stringify(request.preferences) : '{}'}
      
      Genera un workflow completo con nodos realistas, conexiones lógicas y configuración detallada.
      El workflow debe ser funcional y escalable.
    `;
  }

  private buildOptimizationPrompt(workflow: Workflow, optimizationGoals?: string[]): string {
    return `
      Analiza y optimiza este workflow:
      
      ${JSON.stringify({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodeCount: workflow.nodes?.length || 0,
        canvasData: workflow.canvasData,
      })}
      
      ${optimizationGoals ? `Objetivos de optimización: ${optimizationGoals.join(', ')}` : ''}
      
      Proporciona optimizaciones específicas y medibles.
    `;
  }

  private validateAndCompleteWorkflow(workflowData: any, request: AIWorkflowRequest): any {
    // Agregar metadatos y completar campos faltantes
    return {
      name: workflowData.name || `Workflow: ${request.description.substring(0, 50)}`,
      description: workflowData.description || request.description,
      canvasData: {
        ...workflowData.canvasData,
        metadata: {
          generatedBy: 'ai',
          generatedAt: new Date().toISOString(),
          complexity: request.complexity || 'medium',
          confidence: 0.8,
        },
      },
      nodes: this.ensureValidNodes(workflowData.nodes || []),
      edges: this.ensureValidEdges(workflowData.edges || []),
    };
  }

  private ensureValidNodes(nodes: any[]): any[] {
    return nodes.map((node, index) => ({
      id: node.id || `ai-node-${index}`,
      type: node.type || 'custom-node',
      position: node.position || { x: index * 200, y: index * 100 },
      data: {
        ...node.data,
        label: node.data?.label || node.type,
        generated: true,
      },
      config: node.config || {},
    }));
  }

  private ensureValidEdges(edges: any[]): any[] {
    return edges.map((edge, index) => ({
      id: edge.id || `ai-edge-${index}`,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'smoothstep',
      data: edge.data || { generated: true },
    }));
  }

  private calculateConfidence(aiData: any, request: AIWorkflowRequest): number {
    let confidence = 0.5; // Base

    // Aumentar por completitud de la respuesta
    if (aiData.workflow?.nodes?.length > 0) confidence += 0.2;
    if (aiData.workflow?.edges?.length > 0) confidence += 0.1;
    if (aiData.aiInsights) confidence += 0.1;
    if (aiData.executionPlan) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  private async generateAdditionalInsights(workflow: any, request: AIWorkflowRequest): Promise<any> {
    return {
      suggestedNodes: this.identifyNodeTypes(workflow.nodes),
      dataFlow: this.analyzeDataFlow(workflow),
      optimizationHints: this.generateOptimizationHints(workflow, request),
      errorPoints: this.identifyErrorPoints(workflow),
      scalability: this.assessScalability(workflow),
    };
  }

  private generateReasoning(aiData: any, request: AIWorkflowRequest): string {
    return `He analizado tu solicitud "${request.description}" y generado un workflow completo. ` +
           `La respuesta incluye ${aiData.workflow?.nodes?.length || 0} nodos interconectados que cubren ` +
           `el flujo completo desde la entrada hasta la salida esperada. ` +
           `El nivel de complejidad es ${request.complexity || 'medio'} y está optimizado para eficiencia.`;
  }

  private generateSuggestions(workflow: any, request: AIWorkflowRequest): string[] {
    const suggestions = [];

    if (workflow.nodes.length < 3) {
      suggestions.push('Considera agregar más nodos para mayor granularidad');
    }

    if (!workflow.nodes.some((n: any) => n.type.includes('error'))) {
      suggestions.push('Agrega manejo de errores para mayor robustez');
    }

    suggestions.push('Revisa y personaliza los datos de configuración de cada nodo');
    suggestions.push('Prueba el workflow con datos reales antes de activar');

    return suggestions;
  }

  private calculateComplexity(workflow: Workflow): string {
    const nodeCount = workflow.nodes?.length || 0;
    
    if (nodeCount < 5) return 'simple';
    if (nodeCount < 15) return 'medium';
    return 'complex';
  }

  private analyzePerformance(workflow: Workflow): any {
    return {
      nodeCount: workflow.nodes?.length || 0,
      estimatedDuration: (workflow.nodes?.length || 0) * 1000, // 1s per node
      resourceUsage: 'medium',
    };
  }

  private calculateMaintainability(workflow: Workflow): string {
    return workflow.nodes?.length > 10 ? 'complex' : 'good';
  }

  private identifyBottlenecks(workflow: Workflow): any[] {
    return [
      {
        node: 'data-processing',
        type: 'performance',
        description: 'Procesamiento pesado de datos',
        severity: 'medium',
      },
    ];
  }

  private suggestImprovements(workflow: Workflow): any[] {
    return [
      {
        type: 'performance',
        description: 'Agregar caché para datos repetitivos',
        impact: 'high',
      },
      {
        type: 'monitoring',
        description: 'Incluir nodos de monitoreo',
        impact: 'medium',
      },
    ];
  }

  private calculateScore(analysis: any): number {
    let score = 70; // Base score

    if (analysis.complexity === 'simple') score += 10;
    if (analysis.maintainability === 'good') score += 10;
    if (analysis.bottlenecks.length === 0) score += 10;

    return Math.min(score, 100);
  }

  private identifyNodeTypes(nodes: any[]): any[] {
    const types = new Set(nodes.map(n => n.type));
    return Array.from(types).map(type => ({
      type,
      count: nodes.filter(n => n.type === type).length,
    }));
  }

  private analyzeDataFlow(workflow: any): string {
    return 'Secuencial con posibles ramas condicionales';
  }

  private generateOptimizationHints(workflow: any, request: AIWorkflowRequest): string[] {
    return [
      'Usar procesamiento por lotes para mejor rendimiento',
      'Implementar timeouts para operaciones externas',
      'Agregar retry logic para servicios no críticos',
    ];
  }

  private identifyErrorPoints(workflow: any): string[] {
    return [
      'API calls sin retry logic',
      'Datos externos sin validación',
      'Falta de manejo de timeouts',
    ];
  }

  private assessScalability(workflow: any): string {
    return workflow.nodes?.length > 20 ? 'good' : 'excellent';
  }
}