import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { AuthUser } from '../auth/auth.service';
import {
  WorkflowsService,
  CreateWorkflowData,
  UpdateWorkflowData,
  WorkflowFilters,
} from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  /**
   * Crear nuevo workflow
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkflow(
    @GetUser() user: AuthUser,
    @Body() workflowData: CreateWorkflowData,
    @Ip() ip: string,
  ) {
    try {
      const workflow = await this.workflowsService.createWorkflow(
        user,
        workflowData,
        ip,
      );

      return {
        success: true,
        message: 'Workflow creado exitosamente',
        data: workflow,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'WORKFLOW_CREATION_ERROR',
      };
    }
  }

  /**
   * Obtener lista de workflows
   */
  @Get()
  async getWorkflows(
    @GetUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('name') name?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const filters: WorkflowFilters = {};
      
      if (status) filters.status = status;
      if (name) filters.name = name;

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;

      const result = await this.workflowsService.getWorkflows(
        user,
        filters,
        pageNum,
        limitNum,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'WORKFLOWS_FETCH_ERROR',
      };
    }
  }

  /**
   * Obtener workflow por ID
   */
  @Get(':id')
  async getWorkflowById(
    @GetUser() user: AuthUser,
    @Param('id') workflowId: string,
  ) {
    try {
      const workflow = await this.workflowsService.getWorkflowById(
        user,
        workflowId,
      );

      return {
        success: true,
        data: workflow,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'WORKFLOW_FETCH_ERROR',
      };
    }
  }

  /**
   * Actualizar workflow
   */
  @Put(':id')
  async updateWorkflow(
    @GetUser() user: AuthUser,
    @Param('id') workflowId: string,
    @Body() updateData: UpdateWorkflowData,
    @Ip() ip: string,
  ) {
    try {
      const workflow = await this.workflowsService.updateWorkflow(
        user,
        workflowId,
        updateData,
        ip,
      );

      return {
        success: true,
        message: 'Workflow actualizado exitosamente',
        data: workflow,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'WORKFLOW_UPDATE_ERROR',
      };
    }
  }

  /**
   * Eliminar workflow
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflow(
    @GetUser() user: AuthUser,
    @Param('id') workflowId: string,
    @Ip() ip: string,
  ) {
    try {
      await this.workflowsService.deleteWorkflow(user, workflowId, ip);

      return {
        success: true,
        message: 'Workflow eliminado exitosamente',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'WORKFLOW_DELETE_ERROR',
      };
    }
  }

  /**
   * Duplicar workflow
   */
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateWorkflow(
    @GetUser() user: AuthUser,
    @Param('id') workflowId: string,
    @Body('name') name: string,
    @Ip() ip: string,
  ) {
    try {
      if (!name) {
        return {
          success: false,
          message: 'El nombre es requerido para duplicar',
          error: 'NAME_REQUIRED',
        };
      }

      const workflow = await this.workflowsService.duplicateWorkflow(
        user,
        workflowId,
        name,
        ip,
      );

      return {
        success: true,
        message: 'Workflow duplicado exitosamente',
        data: workflow,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'WORKFLOW_DUPLICATION_ERROR',
      };
    }
  }

  /**
   * Obtener estadísticas de workflows
   */
  @Get('stats/overview')
  async getWorkflowStats(@GetUser() user: AuthUser) {
    try {
      const stats = await this.workflowsService.getWorkflowStats(user);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'WORKFLOW_STATS_ERROR',
      };
    }
  }

  /**
   * Health check para workflows
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      success: true,
      service: 'workflows',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}