/**
 * Framework Silhouette Enterprise V4.0 - Workflow Engine
 * 
 * Motor de workflows dinámicos con soporte para DAG, optimización automática,
 * ejecución paralela y rollback automático. Mantiene compatibilidad con el sistema actual.
 * 
 * Autor: Silhouette Anonimo
 * Versión: 4.0.0
 * Fecha: 2025-11-09
 */

import { WorkflowV4, WorkflowStepV4, TaskV4, EventTypeV4, FrameworkEventV4 } from '../types';
import { getCoordinator } from '../coordinator';
import { CompatibilityUtils } from '../adapters/compatibility';
import { getFrameworkConfig } from '../config';

interface WorkflowExecutionContext {
  workflowId: string;
  startTime: Date;
  stepResults: Map<string, any>;
  errorSteps: Set<string>;
  parallelGroups: any[][];
  rollbackStack: Array<{ stepId: string; action: string; data: any }>;
}

interface WorkflowMetrics {
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageDuration: number;
  successRate: number;
  stepMetrics: Map<string, {
    total: number;
    completed: number;
    failed: number;
    averageTime: number;
  }>;
}

export class WorkflowEngineV4 {
  private config = getFrameworkConfig();
  private workflows: Map<string, WorkflowV4> = new Map();
  private executions: Map<string, WorkflowExecutionContext> = new Map();
  private metrics: WorkflowMetrics = {
    totalWorkflows: 0,
    activeWorkflows: 0,
    completedWorkflows: 0,
    failedWorkflows: 0,
    averageDuration: 0,
    successRate: 0,
    stepMetrics: new Map(),
  };
  private coordinator = getCoordinator();

  constructor() {
    console.log('🔄 Workflow Engine V4.0 initialized');
  }

  /**
   * Crea un nuevo workflow
   */
  async createWorkflow(workflowData: any): Promise<WorkflowV4> {
    try {
      // Adaptar workflow legacy a V4.0
      const legacyWorkflow = CompatibilityUtils.adaptRequest(workflowData, 'workflow');
      
      const workflow: WorkflowV4 = {
        id: this.generateWorkflowId(),
        name: legacyWorkflow.name || 'Untitled Workflow',
        type: legacyWorkflow.type || 'sequential',
        steps: this.validateAndNormalizeSteps(legacyWorkflow.steps || []),
        status: 'draft',
        createdAt: new Date(),
        configuration: {
          autoOptimization: legacyWorkflow.configuration?.autoOptimization ?? true,
          parallelExecution: legacyWorkflow.configuration?.parallelExecution ?? false,
          maxRetries: legacyWorkflow.configuration?.maxRetries ?? 3,
          timeout: legacyWorkflow.configuration?.timeout ?? 300000,
        },
        metrics: {
          totalSteps: 0,
          completedSteps: 0,
          failedSteps: 0,
          averageStepTime: 0,
        },
      };

      // Validar workflow
      const validation = this.validateWorkflow(workflow);
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      workflow.metrics.totalSteps = workflow.steps.length;
      this.workflows.set(workflow.id, workflow);
      this.metrics.totalWorkflows++;

      console.log(`📋 Workflow created: ${workflow.id} (${workflow.type}, ${workflow.steps.length} steps)`);
      return workflow;
    } catch (error) {
      console.error('❌ Failed to create workflow:', error);
      throw new Error(`Workflow creation failed: ${error.message}`);
    }
  }

  /**
   * Ejecuta un workflow
   */
  async executeWorkflow(workflowId: string): Promise<WorkflowV4> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'draft' && workflow.status !== 'paused') {
      throw new Error(`Cannot execute workflow with status: ${workflow.status}`);
    }

    console.log(`🚀 Starting workflow execution: ${workflow.id}`);

    const context: WorkflowExecutionContext = {
      workflowId,
      startTime: new Date(),
      stepResults: new Map(),
      errorSteps: new Set(),
      parallelGroups: [],
      rollbackStack: [],
    };

    this.executions.set(workflowId, context);
    workflow.status = 'active';
    workflow.startedAt = new Date();

    try {
      // Ejecutar workflow basado en su tipo
      switch (workflow.type) {
        case 'sequential':
          await this.executeSequentialWorkflow(workflow, context);
          break;
        case 'parallel':
          await this.executeParallelWorkflow(workflow, context);
          break;
        case 'dag':
          await this.executeDAGWorkflow(workflow, context);
          break;
        case 'conditional':
          await this.executeConditionalWorkflow(workflow, context);
          break;
        default:
          throw new Error(`Unsupported workflow type: ${workflow.type}`);
      }

      // Marcar como completado
      workflow.status = 'completed';
      workflow.completedAt = new Date();
      this.metrics.activeWorkflows--;
      this.metrics.completedWorkflows++;
      
      // Actualizar métricas
      this.updateWorkflowMetrics(workflow, context);

      console.log(`✅ Workflow completed: ${workflow.id} in ${Date.now() - context.startTime.getTime()}ms`);
      return workflow;

    } catch (error) {
      // En caso de error, intentar rollback
      console.error(`❌ Workflow failed: ${workflow.id}`, error);
      
      await this.performRollback(workflow, context);
      
      workflow.status = 'failed';
      workflow.completedAt = new Date();
      this.metrics.activeWorkflows--;
      this.metrics.failedWorkflows++;
      
      throw error;
    }
  }

  /**
   * Ejecuta workflow secuencial
   */
  private async executeSequentialWorkflow(workflow: WorkflowV4, context: WorkflowExecutionContext): Promise<void> {
    for (const step of workflow.steps) {
      await this.executeStep(step, context, workflow);
    }
  }

  /**
   * Ejecuta workflow paralelo
   */
  private async executeParallelWorkflow(workflow: WorkflowV4, context: WorkflowExecutionContext): Promise<void> {
    const parallelStepGroups = this.groupParallelSteps(workflow.steps);
    
    for (const group of parallelStepGroups) {
      await this.executeParallelGroup(group, context, workflow);
    }
  }

  /**
   * Ejecuta workflow DAG
   */
  private async executeDAGWorkflow(workflow: WorkflowV4, context: WorkflowExecutionContext): Promise<void> {
    const executionOrder = this.calculateDAGExecutionOrder(workflow.steps);
    
    for (const stepId of executionOrder) {
      const step = workflow.steps.find(s => s.id === stepId);
      if (step) {
        await this.executeStep(step, context, workflow);
      }
    }
  }

  /**
   * Ejecuta workflow condicional
   */
  private async executeConditionalWorkflow(workflow: WorkflowV4, context: WorkflowExecutionContext): Promise<void> {
    for (const step of workflow.steps) {
      if (step.type === 'condition') {
        const conditionResult = await this.evaluateCondition(step, context);
        if (conditionResult) {
          await this.executeStep(step, context, workflow);
        } else {
          // Skip this step
          step.status = 'skipped';
        }
      } else {
        await this.executeStep(step, context, workflow);
      }
    }
  }

  /**
   * Ejecuta un paso individual
   */
  private async executeStep(step: WorkflowStepV4, context: WorkflowExecutionContext, workflow: WorkflowV4): Promise<void> {
    console.log(`📍 Executing step: ${step.name} (${step.type})`);

    try {
      step.status = 'in-progress';
      const startTime = Date.now();

      // Ejecutar el paso según su tipo
      let result: any;
      switch (step.type) {
        case 'task':
          result = await this.executeTaskStep(step, context);
          break;
        case 'condition':
          result = await this.executeConditionStep(step, context);
          break;
        case 'parallel':
          result = await this.executeParallelStep(step, context);
          break;
        case 'delay':
          result = await this.executeDelayStep(step, context);
          break;
        case 'notification':
          result = await this.executeNotificationStep(step, context);
          break;
        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      step.status = 'completed';
      step.result = result;
      step.completedAt = new Date();
      const duration = Date.now() - startTime;

      // Actualizar métricas del paso
      this.updateStepMetrics(step, duration, true);

      // Agregar al contexto
      context.stepResults.set(step.id, result);
      workflow.metrics.completedSteps++;
      workflow.metrics.averageStepTime = (workflow.metrics.averageStepTime + duration) / 2;

      console.log(`✅ Step completed: ${step.name} in ${duration}ms`);

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.completedAt = new Date();
      context.errorSteps.add(step.id);
      workflow.metrics.failedSteps++;

      this.updateStepMetrics(step, 0, false);
      
      // Intentar reintentos si están configurados
      if (context.errorSteps.size < step.retryPolicy.maxRetries) {
        console.log(`🔄 Retrying step: ${step.name} (attempt ${context.errorSteps.size + 1})`);
        await new Promise(resolve => setTimeout(resolve, step.retryPolicy.initialDelay));
        await this.executeStep(step, context, workflow);
      } else {
        throw new Error(`Step ${step.name} failed after ${context.errorSteps.size} retries: ${error.message}`);
      }
    }
  }

  /**
   * Ejecuta un paso de tarea
   */
  private async executeTaskStep(step: WorkflowStepV4, context: WorkflowExecutionContext): Promise<any> {
    const taskData = {
      type: step.taskType,
      configuration: step.configuration,
      workflowId: context.workflowId,
      stepId: step.id,
    };

    // Crear tarea usando el coordinador
    const task = await this.coordinator.createTask(taskData);
    
    // Simular espera a que se complete la tarea
    let attempts = 0;
    const maxAttempts = 60; // 30 segundos máximo
    while (task.status !== 'completed' && task.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (task.status === 'completed') {
      return {
        taskId: task.id,
        result: task.data,
        status: 'success',
      };
    } else {
      throw new Error(`Task execution failed: ${task.status}`);
    }
  }

  /**
   * Ejecuta un paso condicional
   */
  private async executeConditionStep(step: WorkflowStepV4, context: WorkflowExecutionContext): Promise<boolean> {
    const condition = step.configuration.condition;
    
    if (typeof condition === 'function') {
      return await condition(context.stepResults);
    } else if (typeof condition === 'object') {
      return this.evaluateConditionObject(condition, context);
    } else {
      return Boolean(condition);
    }
  }

  /**
   * Ejecuta un grupo de pasos paralelos
   */
  private async executeParallelGroup(steps: WorkflowStepV4[], context: WorkflowExecutionContext, workflow: WorkflowV4): Promise<void> {
    const promises = steps.map(step => this.executeStep(step, context, workflow));
    await Promise.allSettled(promises);
  }

  /**
   * Ejecuta un paso de delay
   */
  private async executeDelayStep(step: WorkflowStepV4, context: WorkflowExecutionContext): Promise<any> {
    const delay = step.configuration.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      delayDuration: delay,
      status: 'completed',
    };
  }

  /**
   * Ejecuta un paso de notificación
   */
  private async executeNotificationStep(step: WorkflowStepV4, context: WorkflowExecutionContext): Promise<any> {
    const notification = step.configuration;
    
    console.log(`📢 Notification: ${notification.message || 'Step completed'}`);
    
    // Aquí se implementaría el envío real de notificaciones
    return {
      notificationSent: true,
      message: notification.message,
      timestamp: new Date(),
    };
  }

  /**
   * Agrupa pasos paralelos
   */
  private groupParallelSteps(steps: WorkflowStepV4[]): WorkflowStepV4[][] {
    const groups: WorkflowStepV4[][] = [];
    let currentGroup: WorkflowStepV4[] = [];
    
    for (const step of steps) {
      if (step.type === 'parallel') {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
        }
        groups.push([step]);
      } else {
        currentGroup.push(step);
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Calcula el orden de ejecución para un DAG
   */
  private calculateDAGExecutionOrder(steps: WorkflowStepV4[]): string[] {
    const dependencyGraph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Construir gráfico de dependencias
    for (const step of steps) {
      inDegree.set(step.id, 0);
      dependencyGraph.set(step.id, []);
      
      for (const depId of step.dependencies) {
        dependencyGraph.get(step.id)!.push(depId);
        inDegree.set(step.id, (inDegree.get(step.id) || 0) + 1);
      }
    }
    
    // Topological sort
    const queue: string[] = [];
    const result: string[] = [];
    
    // Agregar nodos con grado de entrada 0
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      // Reducir grado de entrada de nodos dependientes
      for (const neighbor of dependencyGraph.get(current) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    return result;
  }

  /**
   * Evalúa una condición
   */
  private async evaluateCondition(step: WorkflowStepV4, context: WorkflowExecutionContext): Promise<boolean> {
    const condition = step.configuration.condition;
    
    if (typeof condition === 'function') {
      return await condition(context.stepResults);
    } else if (typeof condition === 'object') {
      return this.evaluateConditionObject(condition, context);
    } else {
      return Boolean(condition);
    }
  }

  /**
   * Evalúa un objeto de condición
   */
  private evaluateConditionObject(condition: any, context: WorkflowExecutionContext): boolean {
    // Implementar evaluación de condiciones complejas
    if (condition.all) {
      return condition.all.every((c: any) => this.evaluateConditionObject(c, context));
    } else if (condition.any) {
      return condition.any.some((c: any) => this.evaluateConditionObject(c, context));
    } else if (condition.not) {
      return !this.evaluateConditionObject(condition.not, context);
    } else if (condition.equals) {
      return context.stepResults.get(condition.equals.key) === condition.equals.value;
    } else if (condition.greaterThan) {
      return context.stepResults.get(condition.greaterThan.key) > condition.greaterThan.value;
    }
    
    return false;
  }

  /**
   * Realiza rollback del workflow
   */
  private async performRollback(workflow: WorkflowV4, context: WorkflowExecutionContext): Promise<void> {
    console.log(`🔄 Performing rollback for workflow: ${workflow.id}`);
    
    // Ejecutar acciones de rollback en orden inverso
    for (let i = context.rollbackStack.length - 1; i >= 0; i--) {
      const rollbackAction = context.rollbackStack[i];
      
      try {
        // Ejecutar acción de rollback
        console.log(`🔙 Rolling back: ${rollbackAction.action} for step ${rollbackAction.stepId}`);
        await this.executeRollbackAction(rollbackAction);
      } catch (error) {
        console.error(`❌ Rollback failed for ${rollbackAction.stepId}:`, error);
      }
    }
  }

  /**
   * Ejecuta una acción de rollback
   */
  private async executeRollbackAction(action: any): Promise<void> {
    switch (action.action) {
      case 'delete_resource':
        // Implementar eliminación de recursos
        break;
      case 'revert_state':
        // Implementar reversión de estado
        break;
      case 'notify_rollback':
        // Implementar notificación de rollback
        break;
      default:
        console.warn(`Unknown rollback action: ${action.action}`);
    }
  }

  /**
   * Valida un workflow
   */
  private validateWorkflow(workflow: WorkflowV4): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validar estructura básica
    if (!workflow.id || !workflow.name) {
      errors.push('Workflow must have id and name');
    }
    
    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }
    
    // Validar pasos
    const stepIds = new Set<string>();
    for (const step of workflow.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step id: ${step.id}`);
      }
      stepIds.add(step.id);
      
      if (!step.name) {
        errors.push(`Step ${step.id} must have a name`);
      }
      
      if (!['task', 'condition', 'parallel', 'delay', 'notification'].includes(step.type)) {
        errors.push(`Invalid step type: ${step.type}`);
      }
    }
    
    // Validar dependencias DAG
    if (workflow.type === 'dag') {
      const stepMap = new Map(workflow.steps.map(s => [s.id, s]));
      for (const step of workflow.steps) {
        for (const depId of step.dependencies) {
          if (!stepMap.has(depId)) {
            errors.push(`Step ${step.id} depends on non-existent step: ${depId}`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida y normaliza pasos de workflow
   */
  private validateAndNormalizeSteps(steps: any[]): WorkflowStepV4[] {
    return steps.map((step, index) => ({
      id: step.id || this.generateStepId(),
      name: step.name || step.title || `Step ${index + 1}`,
      type: step.type || 'task',
      taskType: step.taskType || step.type || 'generic',
      configuration: step.configuration || step.config || {},
      dependencies: step.dependencies || [],
      timeout: step.timeout || 300000,
      retryPolicy: {
        maxRetries: step.retryPolicy?.maxRetries || 3,
        backoffMultiplier: step.retryPolicy?.backoffMultiplier || 2,
        initialDelay: step.retryPolicy?.initialDelay || 1000,
      },
      status: 'pending',
    }));
  }

  /**
   * Actualiza métricas de workflow
   */
  private updateWorkflowMetrics(workflow: WorkflowV4, context: WorkflowExecutionContext): void {
    if (workflow.completedAt) {
      const duration = workflow.completedAt.getTime() - context.startTime.getTime();
      this.metrics.averageDuration = (this.metrics.averageDuration + duration) / 2;
    }
    
    this.metrics.successRate = this.metrics.completedWorkflows / this.metrics.totalWorkflows;
  }

  /**
   * Actualiza métricas de paso
   */
  private updateStepMetrics(step: WorkflowStepV4, duration: number, success: boolean): void {
    if (!this.metrics.stepMetrics.has(step.id)) {
      this.metrics.stepMetrics.set(step.id, {
        total: 0,
        completed: 0,
        failed: 0,
        averageTime: 0,
      });
    }
    
    const stepMetric = this.metrics.stepMetrics.get(step.id)!;
    stepMetric.total++;
    
    if (success) {
      stepMetric.completed++;
      stepMetric.averageTime = (stepMetric.averageTime + duration) / 2;
    } else {
      stepMetric.failed++;
    }
  }

  /**
   * Obtiene métricas del engine
   */
  getMetrics(): WorkflowMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtiene workflow por ID
   */
  getWorkflow(id: string): WorkflowV4 | undefined {
    return this.workflows.get(id);
  }

  /**
   * Lista todos los workflows
   */
  listWorkflows(): WorkflowV4[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Pausa un workflow
   */
  async pauseWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    workflow.status = 'paused';
    console.log(`⏸️ Workflow paused: ${workflowId}`);
  }

  /**
   * Reanuda un workflow
   */
  async resumeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    if (workflow.status !== 'paused') {
      throw new Error(`Cannot resume workflow with status: ${workflow.status}`);
    }
    
    workflow.status = 'active';
    await this.executeWorkflow(workflowId);
  }

  /**
   * Cancela un workflow
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    workflow.status = 'failed';
    workflow.completedAt = new Date();
    
    // Limpiar contexto de ejecución
    this.executions.delete(workflowId);
    
    console.log(`🛑 Workflow cancelled: ${workflowId}`);
  }

  // Generación de IDs
  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton global
let globalWorkflowEngine: WorkflowEngineV4 | null = null;

export function getWorkflowEngine(): WorkflowEngineV4 {
  if (!globalWorkflowEngine) {
    globalWorkflowEngine = new WorkflowEngineV4();
  }
  return globalWorkflowEngine;
}

// Export principal
export { WorkflowEngineV4 };
