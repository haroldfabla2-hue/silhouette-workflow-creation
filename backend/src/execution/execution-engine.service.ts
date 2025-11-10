import { DataSource } from 'typeorm';
import { Server as SocketIOServer } from 'socket.io';
import { Queue, Worker, Job } from 'bull';
import { Workflow } from '../types/workflow.entity';
import { WorkflowExecution, ExecutionStatus } from '../types/workflow-execution.entity';
import { WorkflowNode } from '../types/workflow-node.entity';
import { AuthUser } from '../auth/auth.service';
import { CredentialService } from '../credentials/credential.service';

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  triggeredBy: string;
  inputData: any;
  credentials: Map<string, any>;
  variables: Map<string, any>;
  context: {
    startTime: Date;
    currentNodeId?: string;
    completedNodes: string[];
    failedNodes: string[];
    logs: ExecutionLog[];
  };
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  data?: any;
}

export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  output: any;
  error?: string;
  duration: number;
  logs: ExecutionLog[];
}

export interface WorkflowExecutionPlan {
  executionId: string;
  workflow: Workflow;
  executionOrder: string[];
  parallelGroups: string[][];
  dependencies: Map<string, string[]>;
  estimatedDuration: number;
  resourceRequirements: any;
}

export class ExecutionEngine {
  private readonly dataSource: DataSource;
  private readonly io: SocketIOServer;
  private readonly executionQueue: Queue;
  private readonly nodeQueue: Queue;
  private readonly credentialService: CredentialService;
  private readonly activeExecutions: Map<string, ExecutionContext> = new Map();
  private readonly executionWorkers: Map<string, Worker> = new Map();

  constructor(
    dataSource: DataSource,
    io: SocketIOServer,
    redisUrl: string,
  ) {
    this.dataSource = dataSource;
    this.io = io;
    this.credentialService = new CredentialService(dataSource);
    
    // Configurar colas
    this.executionQueue = new Queue('workflow-execution', { redis: redisUrl });
    this.nodeQueue = new Queue('node-execution', { redis: redisUrl });

    this.setupQueueProcessors();
  }

  /**
   * Inicia la ejecución de un workflow
   */
  async startExecution(
    user: AuthUser,
    workflowId: string,
    inputData: any = {},
    triggerType: 'manual' | 'scheduled' | 'webhook' | 'api' = 'manual',
  ): Promise<string> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:execute')) {
        throw new Error('Sin permisos para ejecutar workflows');
      }

      // Obtener workflow
      const workflow = await this.dataSource.getRepository(Workflow).findOne({
        where: { id: workflowId, orgId: user.orgId },
        relations: ['nodes'],
      });

      if (!workflow) {
        throw new Error('Workflow no encontrado');
      }

      if (workflow.status !== 'active') {
        throw new Error('El workflow no está activo');
      }

      // Crear ejecución
      const execution = this.dataSource.getRepository(WorkflowExecution).create({
        workflowId,
        triggeredBy: user.id,
        status: ExecutionStatus.PENDING,
        inputData,
        metadata: {
          triggerType,
          startedBy: user.id,
          startedAt: new Date().toISOString(),
        },
      });

      const savedExecution = await this.dataSource.getRepository(WorkflowExecution).save(execution);

      // Configurar contexto de ejecución
      const context = this.createExecutionContext(savedExecution, workflow, user, inputData);
      this.activeExecutions.set(savedExecution.id, context);

      // Añadir a cola de ejecución
      await this.executionQueue.add('execute-workflow', {
        executionId: savedExecution.id,
        workflowId,
        inputData,
        context: {
          startTime: new Date(),
          completedNodes: [],
          failedNodes: [],
          logs: [],
        },
      }, {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 1,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      // Notificar inicio de ejecución
      this.io.to(`workflow:${workflowId}`).emit('execution_started', {
        executionId: savedExecution.id,
        workflowId,
        startedBy: user.id,
        startTime: new Date(),
      });

      return savedExecution.id;

    } catch (error) {
      throw new Error(`Error al iniciar ejecución: ${error.message}`);
    }
  }

  /**
   * Detiene una ejecución en curso
   */
  async stopExecution(
    user: AuthUser,
    executionId: string,
    reason: 'user_stopped' | 'timeout' | 'error' | 'system' = 'user_stopped',
  ): Promise<void> {
    try {
      const execution = await this.dataSource.getRepository(WorkflowExecution).findOne({
        where: { id: executionId },
        relations: ['workflow'],
      });

      if (!execution) {
        throw new Error('Ejecución no encontrada');
      }

      // Verificar permisos
      const hasPermission = user.role === 'admin' || 
                           execution.triggeredBy === user.id ||
                           execution.workflow.orgId === user.orgId;
      
      if (!hasPermission) {
        throw new Error('Sin permisos para detener esta ejecución');
      }

      // Actualizar estado
      execution.status = ExecutionStatus.CANCELLED;
      execution.completedAt = new Date();
      execution.errorMessage = `Detenida por: ${reason}`;
      execution.durationMs = Date.now() - execution.createdAt.getTime();

      await this.dataSource.getRepository(WorkflowExecution).save(execution);

      // Liberar contexto
      this.activeExecutions.delete(executionId);

      // Notificar parada
      this.io.to(`workflow:${execution.workflowId}`).emit('execution_stopped', {
        executionId,
        reason,
        stoppedBy: user.id,
        stopTime: new Date(),
      });

    } catch (error) {
      throw new Error(`Error al detener ejecución: ${error.message}`);
    }
  }

  /**
   * Obtiene el estado de una ejecución
   */
  async getExecutionStatus(executionId: string): Promise<{
    execution: WorkflowExecution;
    context?: ExecutionContext;
    progress: number;
    currentNode?: string;
  }> {
    try {
      const execution = await this.dataSource.getRepository(WorkflowExecution).findOne({
        where: { id: executionId },
        relations: ['workflow'],
      });

      if (!execution) {
        throw new Error('Ejecución no encontrada');
      }

      const context = this.activeExecutions.get(executionId);
      const progress = this.calculateProgress(execution, context);

      return {
        execution,
        context,
        progress,
        currentNode: context?.context.currentNodeId,
      };

    } catch (error) {
      throw new Error(`Error al obtener estado: ${error.message}`);
    }
  }

  /**
   * Obtiene el historial de ejecuciones de un workflow
   */
  async getExecutionHistory(
    user: AuthUser,
    workflowId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ executions: WorkflowExecution[]; total: number }> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:read')) {
        throw new Error('Sin permisos para ver historial de ejecuciones');
      }

      const queryBuilder = this.dataSource.getRepository(WorkflowExecution)
        .createQueryBuilder('execution')
        .leftJoinAndSelect('execution.workflow', 'workflow')
        .leftJoinAndSelect('execution.triggerer', 'triggerer')
        .where('execution.workflowId = :workflowId', { workflowId })
        .andWhere('workflow.orgId = :orgId', { orgId: user.orgId });

      // Ordenar por fecha de creación (más recientes primero)
      queryBuilder.orderBy('execution.createdAt', 'DESC');

      // Paginación
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [executions, total] = await queryBuilder.getManyAndCount();

      return {
        executions,
        total,
      };

    } catch (error) {
      throw new Error(`Error al obtener historial: ${error.message}`);
    }
  }

  /**
   * Reprocesa una ejecución fallida
   */
  async retryExecution(
    user: AuthUser,
    executionId: string,
    fromNodeId?: string,
  ): Promise<string> {
    try {
      const originalExecution = await this.dataSource.getRepository(WorkflowExecution).findOne({
        where: { id: executionId },
        relations: ['workflow'],
      });

      if (!originalExecution) {
        throw new Error('Ejecución no encontrada');
      }

      if (originalExecution.status !== ExecutionStatus.FAILED) {
        throw new Error('Solo se pueden reintentar ejecuciones fallidas');
      }

      // Crear nueva ejecución
      const newExecution = this.dataSource.getRepository(WorkflowExecution).create({
        workflowId: originalExecution.workflowId,
        triggeredBy: user.id,
        status: ExecutionStatus.PENDING,
        inputData: originalExecution.inputData,
        metadata: {
          ...originalExecution.metadata,
          isRetry: true,
          originalExecutionId: executionId,
          retryFrom: fromNodeId,
        },
      });

      const savedExecution = await this.dataSource.getRepository(WorkflowExecution).save(newExecution);

      // Reintentar desde el nodo especificado
      await this.executionQueue.add('retry-workflow', {
        executionId: savedExecution.id,
        workflowId: originalExecution.workflowId,
        inputData: originalExecution.inputData,
        fromNodeId,
      });

      return savedExecution.id;

    } catch (error) {
      throw new Error(`Error al reintentar ejecución: ${error.message}`);
    }
  }

  /**
   * Configura los procesadores de cola
   */
  private setupQueueProcessors(): void {
    // Procesador principal de workflows
    const executionWorker = new Worker('workflow-execution', async (job: Job) => {
      const { executionId, workflowId, inputData, context } = job.data;

      try {
        const execution = await this.executeWorkflow(executionId, workflowId, inputData, context);
        return execution;
      } catch (error) {
        console.error('Error en ejecución de workflow:', error);
        throw error;
      }
    }, { concurrency: 5 });

    this.executionWorkers.set('workflow-execution', executionWorker);

    // Procesador de nodos
    const nodeWorker = new Worker('node-execution', async (job: Job) => {
      const { nodeId, inputData, executionId, credentials } = job.data;

      try {
        const result = await this.executeNode(nodeId, inputData, executionId, credentials);
        return result;
      } catch (error) {
        console.error('Error en ejecución de nodo:', error);
        throw error;
      }
    }, { concurrency: 10 });

    this.executionWorkers.set('node-execution', nodeWorker);

    // Eventos de workers
    executionWorker.on('completed', (job, result) => {
      console.log(`Workflow ${job.data.executionId} completado`);
    });

    executionWorker.on('failed', (job, err) => {
      console.error(`Workflow ${job.data.executionId} falló:`, err);
    });
  }

  /**
   * Ejecuta un workflow completo
   */
  private async executeWorkflow(
    executionId: string,
    workflowId: string,
    inputData: any,
    context: any,
  ): Promise<any> {
    const execution = await this.dataSource.getRepository(WorkflowExecution).findOne({
      where: { id: executionId },
      relations: ['workflow', 'workflow.nodes'],
    });

    if (!execution) {
      throw new Error('Ejecución no encontrada');
    }

    // Actualizar estado a running
    execution.status = ExecutionStatus.RUNNING;
    execution.startedAt = new Date();
    await this.dataSource.getRepository(WorkflowExecution).save(execution);

    try {
      // Crear plan de ejecución
      const plan = this.createExecutionPlan(execution.workflow);

      // Ejecutar nodos en orden
      const results: NodeExecutionResult[] = [];
      let currentData = inputData;

      for (const nodeId of plan.executionOrder) {
        // Actualizar contexto
        const executionContext = this.activeExecutions.get(executionId);
        if (executionContext) {
          executionContext.context.currentNodeId = nodeId;
        }

        // Obtener credenciales necesarias
        const credentials = await this.getNodeCredentials(execution.workflow.orgId, nodeId);

        // Ejecutar nodo
        const nodeResult = await this.executeNode(nodeId, currentData, executionId, credentials);
        results.push(nodeResult);

        if (!nodeResult.success) {
          throw new Error(`Nodo ${nodeId} falló: ${nodeResult.error}`);
        }

        currentData = nodeResult.output;

        // Notificar progreso
        this.io.to(`workflow:${workflowId}`).emit('node_completed', {
          executionId,
          nodeId,
          result: nodeResult,
          progress: (results.length / plan.executionOrder.length) * 100,
        });
      }

      // Completar ejecución
      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - execution.startedAt.getTime();
      execution.outputData = currentData;

      await this.dataSource.getRepository(WorkflowExecution).save(execution);

      // Limpiar contexto activo
      this.activeExecutions.delete(executionId);

      // Notificar finalización
      this.io.to(`workflow:${workflowId}`).emit('execution_completed', {
        executionId,
        success: true,
        output: currentData,
        duration: execution.durationMs,
      });

      return {
        success: true,
        output: currentData,
        duration: execution.durationMs,
        nodeResults: results,
      };

    } catch (error) {
      // Marcar como fallida
      execution.status = ExecutionStatus.FAILED;
      execution.completedAt = new Date();
      execution.errorMessage = error.message;
      execution.durationMs = Date.now() - execution.startedAt.getTime();

      await this.dataSource.getRepository(WorkflowExecution).save(execution);

      // Limpiar contexto
      this.activeExecutions.delete(executionId);

      // Notificar error
      this.io.to(`workflow:${workflowId}`).emit('execution_failed', {
        executionId,
        error: error.message,
        duration: execution.durationMs,
      });

      throw error;
    }
  }

  /**
   * Ejecuta un nodo específico
   */
  private async executeNode(
    nodeId: string,
    inputData: any,
    executionId: string,
    credentials: Map<string, any>,
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `Iniciando ejecución de nodo ${nodeId}`,
        nodeId,
      });

      // Obtener nodo
      const node = await this.dataSource.getRepository(WorkflowNode).findOne({
        where: { id: nodeId },
      });

      if (!node) {
        throw new Error(`Nodo ${nodeId} no encontrado`);
      }

      // Ejecutar nodo según su tipo
      let output: any;
      switch (node.type) {
        case 'http-request':
          output = await this.executeHttpRequestNode(node, inputData, credentials, logs);
          break;
        case 'data-transform':
          output = await this.executeDataTransformNode(node, inputData, logs);
          break;
        case 'condition':
          output = await this.executeConditionNode(node, inputData, logs);
          break;
        case 'loop':
          output = await this.executeLoopNode(node, inputData, logs);
          break;
        case 'email':
          output = await this.executeEmailNode(node, inputData, credentials, logs);
          break;
        case 'file-operations':
          output = await this.executeFileOperationNode(node, inputData, logs);
          break;
        case 'api-gateway':
          output = await this.executeApiGatewayNode(node, inputData, credentials, logs);
          break;
        case 'database-query':
          output = await this.executeDatabaseNode(node, inputData, credentials, logs);
          break;
        default:
          output = await this.executeCustomNode(node, inputData, logs);
      }

      logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `Nodo ${nodeId} completado exitosamente`,
        nodeId,
        data: { outputSize: JSON.stringify(output).length },
      });

      return {
        nodeId,
        success: true,
        output,
        duration: Date.now() - startTime,
        logs,
      };

    } catch (error) {
      logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Nodo ${nodeId} falló: ${error.message}`,
        nodeId,
        data: { error: error.message },
      });

      return {
        nodeId,
        success: false,
        output: null,
        error: error.message,
        duration: Date.now() - startTime,
        logs,
      };
    }
  }

  // Métodos auxiliares privados

  private createExecutionContext(
    execution: WorkflowExecution,
    workflow: Workflow,
    user: AuthUser,
    inputData: any,
  ): ExecutionContext {
    return {
      executionId: execution.id,
      workflowId: execution.workflowId,
      triggeredBy: user.id,
      inputData,
      credentials: new Map(),
      variables: new Map(),
      context: {
        startTime: new Date(),
        completedNodes: [],
        failedNodes: [],
        logs: [],
      },
    };
  }

  private createExecutionPlan(workflow: Workflow): WorkflowExecutionPlan {
    const nodes = workflow.nodes || [];
    const executionOrder: string[] = [];
    const dependencies = new Map<string, string[]>();

    // Algoritmo simple de ordenamiento topológico
    // En un caso real, esto sería más sofisticado
    nodes.forEach(node => {
      executionOrder.push(node.id);
      dependencies.set(node.id, []);
    });

    return {
      executionId: '',
      workflow,
      executionOrder,
      parallelGroups: [executionOrder], // Simplificado: todos en paralelo
      dependencies,
      estimatedDuration: executionOrder.length * 5000, // 5s por nodo
      resourceRequirements: {
        memory: '512MB',
        cpu: '0.5',
        timeout: 300000,
      },
    };
  }

  private calculateProgress(execution: WorkflowExecution, context?: ExecutionContext): number {
    if (!context) {
      switch (execution.status) {
        case ExecutionStatus.PENDING: return 0;
        case ExecutionStatus.RUNNING: return 50; // Estimación
        case ExecutionStatus.COMPLETED: return 100;
        case ExecutionStatus.FAILED: return 0;
        default: return 0;
      }
    }

    const totalNodes = context.context.completedNodes.length + context.context.failedNodes.length;
    if (totalNodes === 0) return 0;
    
    return (context.context.completedNodes.length / totalNodes) * 100;
  }

  private async getNodeCredentials(orgId: string, nodeId: string): Promise<Map<string, any>> {
    // Implementar lógica para obtener credenciales específicas del nodo
    return new Map();
  }

  // Implementaciones de nodos (ejemplos)

  private async executeHttpRequestNode(
    node: WorkflowNode,
    inputData: any,
    credentials: Map<string, any>,
    logs: ExecutionLog[],
  ): Promise<any> {
    const config = node.config || {};
    const response = await fetch(config.url, {
      method: config.method || 'GET',
      headers: config.headers || {},
      body: config.body || undefined,
    });

    const data = await response.json();
    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `HTTP Request exitoso: ${config.method} ${config.url}`,
      nodeId: node.id,
      data: { status: response.status },
    });

    return data;
  }

  private async executeDataTransformNode(
    node: WorkflowNode,
    inputData: any,
    logs: ExecutionLog[],
  ): Promise<any> {
    const config = node.config || {};
    let output = inputData;

    // Transformaciones básicas
    if (config.operations) {
      for (const operation of config.operations) {
        switch (operation.type) {
          case 'filter':
            output = output.filter((item: any) => eval(operation.expression));
            break;
          case 'map':
            output = output.map((item: any) => eval(operation.expression));
            break;
          case 'reduce':
            output = output.reduce((acc: any, item: any) => eval(operation.expression), 0);
            break;
        }
      }
    }

    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: 'Transformación de datos completada',
      nodeId: node.id,
    });

    return output;
  }

  private async executeConditionNode(
    node: WorkflowNode,
    inputData: any,
    logs: ExecutionLog[],
  ): Promise<any> {
    const config = node.config || {};
    const condition = eval(config.condition);
    
    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Condición evaluada: ${condition}`,
      nodeId: node.id,
    });

    return {
      condition: condition,
      output: condition ? inputData.true : inputData.false,
    };
  }

  private async executeLoopNode(
    node: WorkflowNode,
    inputData: any,
    logs: ExecutionLog[],
  ): Promise<any> {
    const config = node.config || {};
    const results: any[] = [];

    if (config.type === 'for') {
      for (let i = 0; i < config.count; i++) {
        results.push({ iteration: i, data: inputData });
      }
    } else if (config.type === 'foreach') {
      for (const item of inputData) {
        results.push({ item, data: inputData });
      }
    }

    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Loop completado: ${results.length} iteraciones`,
      nodeId: node.id,
    });

    return results;
  }

  private async executeEmailNode(
    node: WorkflowNode,
    inputData: any,
    credentials: Map<string, any>,
    logs: ExecutionLog[],
  ): Promise<any> {
    // Implementar envío de email
    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: 'Email enviado (simulado)',
      nodeId: node.id,
    });

    return { success: true, messageId: `email-${Date.now()}` };
  }

  private async executeFileOperationNode(
    node: WorkflowNode,
    inputData: any,
    logs: ExecutionLog[],
  ): Promise<any> {
    // Implementar operaciones de archivo
    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: 'Operación de archivo completada (simulada)',
      nodeId: node.id,
    });

    return { success: true, file: 'generated-file.txt' };
  }

  private async executeApiGatewayNode(
    node: WorkflowNode,
    inputData: any,
    credentials: Map<string, any>,
    logs: ExecutionLog[],
  ): Promise<any> {
    const config = node.config || {};
    // Implementar lógica de API Gateway
    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: 'API Gateway procesado (simulado)',
      nodeId: node.id,
    });

    return { success: true, data: inputData };
  }

  private async executeDatabaseNode(
    node: WorkflowNode,
    inputData: any,
    credentials: Map<string, any>,
    logs: ExecutionLog[],
  ): Promise<any> {
    const config = node.config || {};
    // Implementar query de base de datos
    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: 'Query de BD ejecutada (simulada)',
      nodeId: node.id,
    });

    return { success: true, rows: [] };
  }

  private async executeCustomNode(
    node: WorkflowNode,
    inputData: any,
    logs: ExecutionLog[],
  ): Promise<any> {
    const config = node.config || {};
    // Ejecutar código personalizado (evaluación segura)
    const result = eval(config.code || 'inputData');
    
    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: 'Nodo personalizado ejecutado',
      nodeId: node.id,
    });

    return result;
  }

  /**
   * Limpia recursos al cerrar
   */
  async shutdown(): Promise<void> {
    // Limpiar colas y workers
    await this.executionQueue.close();
    await this.nodeQueue.close();
    
    for (const worker of this.executionWorkers.values()) {
      await worker.close();
    }

    this.executionWorkers.clear();
    this.activeExecutions.clear();
  }
}