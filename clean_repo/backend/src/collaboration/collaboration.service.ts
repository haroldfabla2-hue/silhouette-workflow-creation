import { DataSource } from 'typeorm';
import { Server as SocketIOServer } from 'socket.io';
import { AuthUser } from '../auth/auth.service';
import { Workflow } from '../types/workflow.entity';
import { CollaborationSession } from '../types/collaboration-session.entity';

export interface UserPresence {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    color: string;
  };
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    nodeIds: string[];
    edgeIds: string[];
  };
  activity: 'editing' | 'viewing' | 'idle';
  lastSeen: Date;
}

export interface CollaborationEvent {
  type: 'cursor_move' | 'node_select' | 'node_update' | 'node_delete' | 'edge_update' | 'comment_add' | 'lock_acquire' | 'lock_release';
  userId: string;
  workflowId: string;
  timestamp: Date;
  data: any;
}

export interface Comment {
  id: string;
  workflowId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  position: {
    x: number;
    y: number;
  };
  nodeId?: string;
  replies: CommentReply[];
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentReply {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: Date;
}

export interface EditLock {
  resourceId: string;
  resourceType: 'node' | 'edge' | 'workflow';
  lockedBy: string;
  lockedByUser: {
    id: string;
    name: string;
  };
  acquiredAt: Date;
  expiresAt: Date;
}

export class CollaborationService {
  private readonly dataSource: DataSource;
  private readonly io: SocketIOServer;
  private readonly activeSessions: Map<string, UserPresence> = new Map();
  private readonly editLocks: Map<string, EditLock> = new Map();
  private readonly userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  ];

  constructor(dataSource: DataSource, io: SocketIOServer) {
    this.dataSource = dataSource;
    this.io = io;
    this.setupSocketHandlers();
  }

  /**
   * Configura los handlers de Socket.io
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Usuario conectado: ${socket.id}`);

      // Autenticación
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const authService = new AuthService(this.dataSource);
          const user = await authService.validateToken(data.token);
          
          if (!user) {
            socket.emit('auth_error', { message: 'Token inválido' });
            return;
          }

          socket.data.user = user;
          socket.emit('auth_success', { user });

          // Unir a la sala de la organización
          socket.join(`org:${user.orgId}`);
        } catch (error) {
          socket.emit('auth_error', { message: 'Error de autenticación' });
        }
      });

      // Unirse a un workflow
      socket.on('join_workflow', async (data: { workflowId: string }) => {
        if (!socket.data.user) {
          socket.emit('error', { message: 'No autenticado' });
          return;
        }

        try {
          const user = socket.data.user as AuthUser;
          
          // Verificar acceso al workflow
          const workflow = await this.dataSource.getRepository(Workflow).findOne({
            where: { id: data.workflowId, orgId: user.orgId },
          });

          if (!workflow) {
            socket.emit('error', { message: 'Workflow no encontrado' });
            return;
          }

          // Unirse a la sala del workflow
          socket.join(`workflow:${data.workflowId}`);

          // Agregar a sesión activa
          const presence: UserPresence = {
            userId: user.id,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              color: this.getUserColor(user.id),
            },
            activity: 'viewing',
            lastSeen: new Date(),
          };

          this.activeSessions.set(socket.id, presence);

          // Notificar a otros usuarios
          socket.to(`workflow:${data.workflowId}`).emit('user_joined', presence);

          // Enviar usuarios actuales
          const currentUsers = this.getWorkflowUsers(data.workflowId);
          socket.emit('workflow_users', currentUsers);

          // Crear o actualizar sesión de colaboración
          await this.createOrUpdateSession(data.workflowId, user.id, socket.id);

        } catch (error) {
          socket.emit('error', { message: 'Error al unirse al workflow' });
        }
      });

      // Mover cursor
      socket.on('cursor_move', (data: { workflowId: string; x: number; y: number }) => {
        if (!socket.data.user) return;

        const presence = this.activeSessions.get(socket.id);
        if (presence) {
          presence.cursor = { x: data.x, y: data.y };
          presence.lastSeen = new Date();
          
          socket.to(`workflow:${data.workflowId}`).emit('user_cursor', {
            userId: presence.userId,
            cursor: presence.cursor,
          });
        }
      });

      // Seleccionar nodos
      socket.on('node_select', (data: { workflowId: string; nodeIds: string[] }) => {
        if (!socket.data.user) return;

        const presence = this.activeSessions.get(socket.id);
        if (presence) {
          presence.selection = { nodeIds: data.nodeIds, edgeIds: [] };
          presence.lastSeen = new Date();
          
          socket.to(`workflow:${data.workflowId}`).emit('user_selection', {
            userId: presence.userId,
            selection: presence.selection,
          });
        }
      });

      // Actualizar nodo
      socket.on('node_update', async (data: { workflowId: string; nodeId: string; changes: any }) => {
        if (!socket.data.user) return;

        const user = socket.data.user as AuthUser;

        try {
          // Verificar lock
          if (!this.canEditNode(data.nodeId, user.id)) {
            socket.emit('edit_denied', { 
              nodeId: data.nodeId, 
              reason: 'Nodo bloqueado por otro usuario' 
            });
            return;
          }

          // Verificar permisos
          if (!user.permissions.includes('workflows:write')) {
            socket.emit('error', { message: 'Sin permisos para editar' });
            return;
          }

          // Actualizar nodo
          await this.updateNode(data.workflowId, data.nodeId, data.changes);

          // Liberar lock
          this.releaseEditLock(data.nodeId);

          // Broadcast a otros usuarios
          socket.to(`workflow:${data.workflowId}`).emit('node_updated', {
            nodeId: data.nodeId,
            changes: data.changes,
            updatedBy: user.id,
            timestamp: new Date(),
          });

        } catch (error) {
          socket.emit('error', { message: 'Error al actualizar nodo' });
        }
      });

      // Bloquear nodo para edición
      socket.on('lock_node', (data: { workflowId: string; nodeId: string }) => {
        if (!socket.data.user) return;

        const user = socket.data.user as AuthUser;
        const success = this.acquireEditLock(data.nodeId, 'node', user);

        if (success) {
          socket.to(`workflow:${data.workflowId}`).emit('node_locked', {
            nodeId: data.nodeId,
            lockedBy: user.id,
            lockedByUser: { id: user.id, name: user.name },
          });
        } else {
          socket.emit('lock_failed', { nodeId: data.nodeId });
        }
      });

      // Liberar lock de nodo
      socket.on('unlock_node', (data: { workflowId: string; nodeId: string }) => {
        if (!socket.data.user) return;

        const user = socket.data.user as AuthUser;
        this.releaseEditLock(data.nodeId, user.id);

        socket.to(`workflow:${data.workflowId}`).emit('node_unlocked', {
          nodeId: data.nodeId,
          unlockedBy: user.id,
        });
      });

      // Agregar comentario
      socket.on('add_comment', async (data: { 
        workflowId: string; 
        content: string; 
        position: { x: number; y: number }; 
        nodeId?: string;
      }) => {
        if (!socket.data.user) return;

        const user = socket.data.user as AuthUser;

        try {
          const comment = await this.addComment(data.workflowId, user.id, {
            content: data.content,
            position: data.position,
            nodeId: data.nodeId,
          });

          // Broadcast a todos los usuarios del workflow
          this.io.to(`workflow:${data.workflowId}`).emit('comment_added', comment);

        } catch (error) {
          socket.emit('error', { message: 'Error al agregar comentario' });
        }
      });

      // Responder a comentario
      socket.on('reply_comment', async (data: { 
        commentId: string; 
        content: string; 
      }) => {
        if (!socket.data.user) return;

        const user = socket.data.user as AuthUser;

        try {
          const reply = await this.replyToComment(data.commentId, user.id, data.content);

          // Encontrar el workflow del comentario
          const session = await this.dataSource.getRepository(CollaborationSession).findOne({
            where: { workflowId: data.commentId },
          });

          if (session) {
            this.io.to(`workflow:${session.workflowId}`).emit('comment_replied', {
              commentId: data.commentId,
              reply,
            });
          }

        } catch (error) {
          socket.emit('error', { message: 'Error al responder comentario' });
        }
      });

      // Desconexión
      socket.on('disconnect', async () => {
        if (socket.data.user) {
          const user = socket.data.user as AuthUser;
          const presence = this.activeSessions.get(socket.id);
          
          if (presence) {
            // Notificar a todos los workflows donde estaba activo
            socket.broadcast.emit('user_left', {
              userId: user.id,
              workflowId: data.workflowId, // We'd need to track this
            });
          }

          // Liberar todos los locks
          this.releaseAllLocks(user.id);

          // Actualizar sesión
          await this.updateSessionOnDisconnect(user.id, socket.id);

          // Remover de sesiones activas
          this.activeSessions.delete(socket.id);
        }

        console.log(`Usuario desconectado: ${socket.id}`);
      });
    });
  }

  /**
   * Obtiene usuarios activos en un workflow
   */
  getWorkflowUsers(workflowId: string): UserPresence[] {
    const users: UserPresence[] = [];
    
    this.activeSessions.forEach((presence, socketId) => {
      // Verificar si el socket está en la sala del workflow
      // Nota: En un entorno real, necesitaríamos acceso a los rooms del socket
      users.push(presence);
    });

    return users;
  }

  /**
   * Obtiene comentarios de un workflow
   */
  async getWorkflowComments(workflowId: string): Promise<Comment[]> {
    try {
      // Esta implementación es simplificada
      // En un caso real, usarías una entidad Comment
      return [];
    } catch (error) {
      throw new Error(`Error al obtener comentarios: ${error.message}`);
    }
  }

  /**
   * Resuelve un comentario
   */
  async resolveComment(commentId: string, userId: string): Promise<void> {
    try {
      // Implementar lógica de resolución de comentarios
    } catch (error) {
      throw new Error(`Error al resolver comentario: ${error.message}`);
    }
  }

  // Métodos auxiliares privados

  private getUserColor(userId: string): string {
    // Generar color consistente basado en userId
    const hash = this.simpleHash(userId);
    return this.userColors[hash % this.userColors.length];
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private canEditNode(nodeId: string, userId: string): boolean {
    const lock = this.editLocks.get(nodeId);
    return !lock || lock.lockedBy === userId;
  }

  private acquireEditLock(resourceId: string, resourceType: 'node' | 'edge' | 'workflow', user: AuthUser): boolean {
    const existingLock = this.editLocks.get(resourceId);
    
    if (existingLock && existingLock.lockedBy !== user.id) {
      return false; // Ya está bloqueado por otro usuario
    }

    const lock: EditLock = {
      resourceId,
      resourceType,
      lockedBy: user.id,
      lockedByUser: { id: user.id, name: user.name },
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
    };

    this.editLocks.set(resourceId, lock);
    return true;
  }

  private releaseEditLock(resourceId: string, userId?: string): void {
    const lock = this.editLocks.get(resourceId);
    
    if (lock && (!userId || lock.lockedBy === userId)) {
      this.editLocks.delete(resourceId);
    }
  }

  private releaseAllLocks(userId: string): void {
    const toRelease: string[] = [];
    
    this.editLocks.forEach((lock, resourceId) => {
      if (lock.lockedBy === userId) {
        toRelease.push(resourceId);
      }
    });

    toRelease.forEach(resourceId => {
      this.editLocks.delete(resourceId);
    });
  }

  private async createOrUpdateSession(workflowId: string, userId: string, socketId: string): Promise<void> {
    try {
      const existingSession = await this.dataSource.getRepository(CollaborationSession).findOne({
        where: { workflowId, userId },
      });

      if (existingSession) {
        existingSession.socketId = socketId;
        existingSession.lastActivityAt = new Date();
        existingSession.isActive = true;
        await this.dataSource.getRepository(CollaborationSession).save(existingSession);
      } else {
        const session = this.dataSource.getRepository(CollaborationSession).create({
          workflowId,
          userId,
          socketId,
          isActive: true,
          lastActivityAt: new Date(),
        });
        await this.dataSource.getRepository(CollaborationSession).save(session);
      }
    } catch (error) {
      console.error('Error al crear/actualizar sesión de colaboración:', error);
    }
  }

  private async updateSessionOnDisconnect(userId: string, socketId: string): Promise<void> {
    try {
      const session = await this.dataSource.getRepository(CollaborationSession).findOne({
        where: { userId, socketId },
      });

      if (session) {
        session.isActive = false;
        session.disconnectedAt = new Date();
        await this.dataSource.getRepository(CollaborationSession).save(session);
      }
    } catch (error) {
      console.error('Error al actualizar sesión en desconexión:', error);
    }
  }

  private async updateNode(workflowId: string, nodeId: string, changes: any): Promise<void> {
    try {
      // Implementar actualización de nodo
      // Esta sería una llamada al servicio de workflows
    } catch (error) {
      throw new Error(`Error al actualizar nodo: ${error.message}`);
    }
  }

  private async addComment(workflowId: string, userId: string, commentData: {
    content: string;
    position: { x: number; y: number };
    nodeId?: string;
  }): Promise<Comment> {
    // Implementar creación de comentario
    // Esta sería una llamada a la base de datos
    return {
      id: `comment-${Date.now()}`,
      workflowId,
      userId,
      user: { id: userId, name: 'Usuario' },
      content: commentData.content,
      position: commentData.position,
      nodeId: commentData.nodeId,
      replies: [],
      resolved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async replyToComment(commentId: string, userId: string, content: string): Promise<CommentReply> {
    // Implementar respuesta a comentario
    return {
      id: `reply-${Date.now()}`,
      userId,
      user: { id: userId, name: 'Usuario' },
      content,
      createdAt: new Date(),
    };
  }

  /**
   * Limpia locks expirados
   */
  cleanupExpiredLocks(): void {
    const now = new Date();
    const expiredLocks: string[] = [];

    this.editLocks.forEach((lock, resourceId) => {
      if (lock.expiresAt < now) {
        expiredLocks.push(resourceId);
      }
    });

    expiredLocks.forEach(resourceId => {
      this.editLocks.delete(resourceId);
    });
  }

  /**
   * Obtiene estadísticas de colaboración
   */
  getCollaborationStats(): {
    activeUsers: number;
    activeSessions: number;
    activeLocks: number;
    recentActivity: number;
  } {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const activeUsers = this.activeSessions.size;
    const activeLocks = this.editLocks.size;
    const recentActivity = Array.from(this.activeSessions.values())
      .filter(session => session.lastSeen > fiveMinutesAgo).length;

    return {
      activeUsers,
      activeSessions: activeUsers,
      activeLocks,
      recentActivity,
    };
  }
}