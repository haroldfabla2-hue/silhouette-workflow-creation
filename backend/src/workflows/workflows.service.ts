import { DataSource } from 'typeorm';
import { Workflow } from '../types/workflow.entity';
import { WorkflowExecution } from '../types/workflow-execution.entity';
import { WorkflowNode } from '../types/workflow-node.entity';
import { AuthUser } from '../auth/auth.service';
import { AuditLog } from '../types/audit-log.entity';

export interface CreateWorkflowData {
  name: string;
  description?: string;
  canvasData: any;
  nodes?: any[];
  edges?: any[];
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  canvasData?: any;
  nodes?: any[];
  edges?: any[];
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

export interface WorkflowFilters {
  status?: string;
  name?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class WorkflowsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Crea un nuevo workflow
   */
  async createWorkflow(
    user: AuthUser,
    workflowData: CreateWorkflowData,
    ipAddress: string,
  ): Promise<Workflow> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:write')) {
        throw new Error('Sin permisos para crear workflows');
      }

      // Crear workflow
      const workflow = this.dataSource.getRepository(Workflow).create({
        orgId: user.orgId,
        name: workflowData.name,
        description: workflowData.description,
        canvasData: workflowData.canvasData,
        status: 'draft',
        createdBy: user.id,
        updatedBy: user.id,
      });

      const savedWorkflow = await this.dataSource.getRepository(Workflow).save(workflow);

      // Crear nodos si se proporcionan
      if (workflowData.nodes && workflowData.nodes.length > 0) {
        await this.createWorkflowNodes(savedWorkflow.id, workflowData.nodes);
      }

      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId: user.orgId,
        userId: user.id,
        action: 'workflow_created',
        resource: 'workflow',
        resourceId: savedWorkflow.id,
        details: JSON.stringify({
          workflowId: savedWorkflow.id,
          name: savedWorkflow.name,
          nodeCount: workflowData.nodes?.length || 0,
        }),
        ipAddress,
        userAgent: 'system',
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);

      return savedWorkflow;
    } catch (error) {
      throw new Error(`Error al crear workflow: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los workflows de la organización
   */
  async getWorkflows(
    user: AuthUser,
    filters?: WorkflowFilters,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ workflows: Workflow[]; total: number; page: number; limit: number }> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:read')) {
        throw new Error('Sin permisos para leer workflows');
      }

      const queryBuilder = this.dataSource.getRepository(Workflow)
        .createQueryBuilder('workflow')
        .leftJoinAndSelect('workflow.organization', 'organization')
        .where('workflow.orgId = :orgId', { orgId: user.orgId });

      // Aplicar filtros
      if (filters?.status) {
        queryBuilder.andWhere('workflow.status = :status', { status: filters.status });
      }

      if (filters?.name) {
        queryBuilder.andWhere('workflow.name ILIKE :name', { name: `%${filters.name}%` });
      }

      if (filters?.createdAfter) {
        queryBuilder.andWhere('workflow.createdAt >= :createdAfter', {
          createdAfter: filters.createdAfter,
        });
      }

      if (filters?.createdBefore) {
        queryBuilder.andWhere('workflow.createdAt <= :createdBefore', {
          createdBefore: filters.createdBefore,
        });
      }

      // Ordenar por fecha de creación
      queryBuilder.orderBy('workflow.createdAt', 'DESC');

      // Paginación
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [workflows, total] = await queryBuilder.getManyAndCount();

      return {
        workflows,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new Error(`Error al obtener workflows: ${error.message}`);
    }
  }

  /**
   * Obtiene un workflow por ID
   */
  async getWorkflowById(
    user: AuthUser,
    workflowId: string,
  ): Promise<Workflow> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:read')) {
        throw new Error('Sin permisos para leer workflows');
      }

      const workflow = await this.dataSource.getRepository(Workflow).findOne({
        where: { id: workflowId, orgId: user.orgId },
        relations: ['organization', 'nodes', 'executions'],
      });

      if (!workflow) {
        throw new Error('Workflow no encontrado');
      }

      // Verificar que el usuario tenga acceso a la organización
      if (workflow.orgId !== user.orgId) {
        throw new Error('Sin acceso a este workflow');
      }

      // Cargar nodos del workflow
      const nodes = await this.dataSource.getRepository(WorkflowNode).find({
        where: { workflowId },
        order: { position: 'ASC' },
      });

      workflow.nodes = nodes;

      return workflow;
    } catch (error) {
      throw new Error(`Error al obtener workflow: ${error.message}`);
    }
  }

  /**
   * Actualiza un workflow
   */
  async updateWorkflow(
    user: AuthUser,
    workflowId: string,
    updateData: UpdateWorkflowData,
    ipAddress: string,
  ): Promise<Workflow> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:write')) {
        throw new Error('Sin permisos para actualizar workflows');
      }

      // Verificar que el workflow existe y pertenece a la organización
      const workflow = await this.dataSource.getRepository(Workflow).findOne({
        where: { id: workflowId, orgId: user.orgId },
      });

      if (!workflow) {
        throw new Error('Workflow no encontrado');
      }

      // Actualizar campos
      const updateFields: any = {
        updatedBy: user.id,
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.canvasData !== undefined) updateFields.canvasData = updateData.canvasData;
      if (updateData.status !== undefined) updateFields.status = updateData.status;

      await this.dataSource.getRepository(Workflow).update(workflowId, updateFields);

      // Actualizar nodos si se proporcionan
      if (updateData.nodes !== undefined) {
        // Eliminar nodos existentes
        await this.dataSource.getRepository(WorkflowNode).delete({ workflowId });
        
        // Crear nuevos nodos
        if (updateData.nodes.length > 0) {
          await this.createWorkflowNodes(workflowId, updateData.nodes);
        }
      }

      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId: user.orgId,
        userId: user.id,
        action: 'workflow_updated',
        resource: 'workflow',
        resourceId: workflowId,
        details: JSON.stringify({
          workflowId,
          name: workflow.name,
          updatedFields: Object.keys(updateData),
        }),
        ipAddress,
        userAgent: 'system',
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);

      // Obtener workflow actualizado
      return await this.getWorkflowById(user, workflowId);
    } catch (error) {
      throw new Error(`Error al actualizar workflow: ${error.message}`);
    }
  }

  /**
   * Elimina un workflow
   */
  async deleteWorkflow(
    user: AuthUser,
    workflowId: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:delete')) {
        throw new Error('Sin permisos para eliminar workflows');
      }

      // Verificar que el workflow existe y pertenece a la organización
      const workflow = await this.dataSource.getRepository(Workflow).findOne({
        where: { id: workflowId, orgId: user.orgId },
      });

      if (!workflow) {
        throw new Error('Workflow no encontrado');
      }

      // Verificar que no hay ejecuciones activas
      const activeExecutions = await this.dataSource.getRepository(WorkflowExecution).count({
        where: { workflowId, status: 'running' },
      });

      if (activeExecutions > 0) {
        throw new Error('No se puede eliminar un workflow con ejecuciones activas');
      }

      // Eliminar nodos asociados
      await this.dataSource.getRepository(WorkflowNode).delete({ workflowId });

      // Eliminar workflow
      await this.dataSource.getRepository(Workflow).delete(workflowId);

      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId: user.orgId,
        userId: user.id,
        action: 'workflow_deleted',
        resource: 'workflow',
        resourceId: workflowId,
        details: JSON.stringify({
          workflowId,
          name: workflow.name,
        }),
        ipAddress,
        userAgent: 'system',
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);
    } catch (error) {
      throw new Error(`Error al eliminar workflow: ${error.message}`);
    }
  }

  /**
   * Duplica un workflow
   */
  async duplicateWorkflow(
    user: AuthUser,
    workflowId: string,
    name: string,
    ipAddress: string,
  ): Promise<Workflow> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:write')) {
        throw new Error('Sin permisos para duplicar workflows');
      }

      // Obtener workflow original
      const originalWorkflow = await this.getWorkflowById(user, workflowId);

      // Crear copia
      const duplicateData: CreateWorkflowData = {
        name,
        description: originalWorkflow.description,
        canvasData: originalWorkflow.canvasData,
        nodes: originalWorkflow.nodes?.map(node => ({
          type: node.type,
          position: node.position,
          data: node.data,
          config: node.config,
        })) || [],
      };

      const duplicatedWorkflow = await this.createWorkflow(
        user,
        duplicateData,
        ipAddress,
      );

      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId: user.orgId,
        userId: user.id,
        action: 'workflow_duplicated',
        resource: 'workflow',
        resourceId: duplicatedWorkflow.id,
        details: JSON.stringify({
          originalWorkflowId: workflowId,
          duplicatedWorkflowId: duplicatedWorkflow.id,
          name: duplicatedWorkflow.name,
        }),
        ipAddress,
        userAgent: 'system',
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);

      return duplicatedWorkflow;
    } catch (error) {
      throw new Error(`Error al duplicar workflow: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de workflows
   */
  async getWorkflowStats(
    user: AuthUser,
  ): Promise<{
    total: number;
    draft: number;
    active: number;
    paused: number;
    archived: number;
    withExecutions: number;
  }> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('workflows:read')) {
        throw new Error('Sin permisos para ver estadísticas');
      }

      const [
        total,
        draft,
        active,
        paused,
        archived,
        withExecutions,
      ] = await Promise.all([
        this.dataSource.getRepository(Workflow).count({ where: { orgId: user.orgId } }),
        this.dataSource.getRepository(Workflow).count({ where: { orgId: user.orgId, status: 'draft' } }),
        this.dataSource.getRepository(Workflow).count({ where: { orgId: user.orgId, status: 'active' } }),
        this.dataSource.getRepository(Workflow).count({ where: { orgId: user.orgId, status: 'paused' } }),
        this.dataSource.getRepository(Workflow).count({ where: { orgId: user.orgId, status: 'archived' } }),
        this.dataSource.getRepository(Workflow)
          .createQueryBuilder('workflow')
          .leftJoin('workflow.executions', 'executions')
          .where('workflow.orgId = :orgId', { orgId: user.orgId })
          .andWhere('executions.id IS NOT NULL')
          .getCount(),
      ]);

      return {
        total,
        draft,
        active,
        paused,
        archived,
        withExecutions,
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Crea nodos para un workflow
   */
  private async createWorkflowNodes(
    workflowId: string,
    nodes: any[],
  ): Promise<void> {
    const workflowNodes = nodes.map((node, index) =>
      this.dataSource.getRepository(WorkflowNode).create({
        workflowId,
        type: node.type,
        position: node.position || { x: 0, y: index * 100 },
        data: node.data || {},
        config: node.config || {},
      }),
    );

    await this.dataSource.getRepository(WorkflowNode).save(workflowNodes);
  }
}