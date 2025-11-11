import { AppDataSource } from '../config/database';
import { CollaborationSession, WorkflowComment, WorkflowVersion, User, Workflow } from '../entities';
import { SocketService } from './socketService';
import { NotificationService } from './notificationService';
import { AuditService } from './auditService';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export class CollaborationService extends EventEmitter {
  private sessionRepository: any;
  private commentRepository: any;
  private versionRepository: any;
  private userRepository: any;
  private workflowRepository: any;

  constructor() {
    super();
    this.initializeRepositories();
  }

  private initializeRepositories() {
    this.sessionRepository = AppDataSource.getRepository(CollaborationSession);
    this.commentRepository = AppDataSource.getRepository(WorkflowComment);
    this.versionRepository = AppDataSource.getRepository(WorkflowVersion);
    this.userRepository = AppDataSource.getRepository(User);
    this.workflowRepository = AppDataSource.getRepository(Workflow);
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Generate secure join token for collaboration sessions
   */
  static generateJoinToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new collaboration session
   */
  async createSession(params: {
    workflowId: string;
    createdBy: string;
    sessionType: string;
    maxParticipants: number;
    allowAnonymous: boolean;
    password?: string;
    settings: any;
    expiresAt: Date;
  }): Promise<CollaborationSession> {
    const session = new CollaborationSession();
    session.workflow = { id: params.workflowId } as any;
    session.createdBy = params.createdBy;
    session.sessionType = params.sessionType;
    session.maxParticipants = params.maxParticipants;
    session.allowAnonymous = params.allowAnonymous;
    session.password = params.password;
    session.settings = params.settings;
    session.participants = [];
    session.status = 'active';
    session.expiresAt = params.expiresAt;
    session.joinToken = CollaborationService.generateJoinToken();
    session.createdAt = new Date();
    session.updatedAt = new Date();

    return await this.sessionRepository.save(session);
  }

  /**
   * Get active session for workflow
   */
  async getActiveSession(workflowId: string): Promise<CollaborationSession | null> {
    return await this.sessionRepository.findOne({
      where: {
        workflowId,
        status: 'active',
        expiresAt: new Date()
      },
      relations: ['workflow', 'participants']
    });
  }

  /**
   * Join collaboration session
   */
  async joinSession(sessionId: string, userId: string, role: string = 'participant'): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['participants']
    });

    if (!session || session.status !== 'active' || session.expiresAt < new Date()) {
      return false;
    }

    // Check if user is already a participant
    const existingParticipant = session.participants.find((p: any) => p.userId === userId);
    
    if (existingParticipant) {
      if (!existingParticipant.isActive) {
        existingParticipant.isActive = true;
        existingParticipant.joinedAt = new Date();
      }
    } else {
      // Check capacity
      const activeCount = session.participants.filter((p: any) => p.isActive).length;
      if (activeCount >= session.maxParticipants) {
        return false;
      }

      // Add new participant
      session.participants.push({
        userId,
        role,
        joinedAt: new Date(),
        isActive: true,
        cursor: null,
        selection: null
      });
    }

    await this.sessionRepository.save(session);

    // Emit real-time event
    this.emit('participant:joined', {
      sessionId,
      userId,
      role,
      totalParticipants: session.participants.filter((p: any) => p.isActive).length
    });

    return true;
  }

  /**
   * Leave collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['participants']
    });

    if (!session) {
      return false;
    }

    const participantIndex = session.participants.findIndex((p: any) => p.userId === userId);
    if (participantIndex === -1) {
      return false;
    }

    // Deactivate participant
    session.participants[participantIndex].isActive = false;
    session.participants[participantIndex].leftAt = new Date();

    // If creator left and there are other active participants, transfer ownership
    if (session.createdBy === userId) {
      const otherActiveParticipants = session.participants.filter((p: any) => p.isActive);
      if (otherActiveParticipants.length > 0) {
        session.createdBy = otherActiveParticipants[0].userId;
        otherActiveParticipants[0].role = 'owner';
      } else {
        // No active participants, end session
        session.status = 'ended';
        session.endedAt = new Date();
      }
    }

    await this.sessionRepository.save(session);

    // Emit real-time event
    this.emit('participant:left', {
      sessionId,
      userId,
      newOwnerId: session.createdBy,
      remainingParticipants: session.participants.filter((p: any) => p.isActive).length
    });

    return true;
  }

  /**
   * Update participant cursor and selection
   */
  async updateCursor(sessionId: string, userId: string, cursor: any, selection: any): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['participants']
    });

    if (!session) {
      return false;
    }

    const participant = session.participants.find((p: any) => p.userId === userId && p.isActive);
    if (!participant) {
      return false;
    }

    participant.cursor = cursor;
    participant.selection = selection;
    participant.lastActivity = new Date();

    await this.sessionRepository.save(session);

    // Emit real-time cursor update
    this.emit('cursor:updated', {
      sessionId,
      userId,
      cursor,
      selection,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const expiredSessions = await this.sessionRepository.find({
      where: {
        status: 'active',
        expiresAt: new Date()
      }
    });

    for (const session of expiredSessions) {
      session.status = 'ended';
      session.endedAt = new Date();
      await this.sessionRepository.save(session);

      // Emit session ended event
      this.emit('session:ended', {
        sessionId: session.id,
        workflowId: session.workflowId,
        reason: 'expired'
      });
    }

    return expiredSessions.length;
  }

  // ==================== COMMENT MANAGEMENT ====================

  /**
   * Add comment to workflow
   */
  async addComment(params: {
    workflowId: string;
    content: string;
    createdBy: string;
    parentId?: string;
    position?: any;
    metadata?: any;
  }): Promise<WorkflowComment> {
    const comment = new WorkflowComment();
    comment.workflow = { id: params.workflowId } as any;
    comment.createdBy = params.createdBy;
    comment.content = params.content;
    comment.parentId = params.parentId;
    comment.position = params.position;
    comment.metadata = {
      ...params.metadata,
      timestamp: new Date().toISOString()
    };
    comment.isResolved = false;
    comment.createdAt = new Date();
    comment.updatedAt = new Date();

    const savedComment = await this.commentRepository.save(comment);

    // Emit real-time event
    this.emit('comment:added', {
      commentId: savedComment.id,
      workflowId: params.workflowId,
      content: params.content,
      createdBy: params.createdBy
    });

    return savedComment;
  }

  /**
   * Resolve or unresolve comment
   */
  async resolveComment(commentId: string, resolved: boolean, resolvedBy: string): Promise<boolean> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['workflow']
    });

    if (!comment) {
      return false;
    }

    comment.isResolved = resolved;
    comment.resolvedAt = resolved ? new Date() : null;
    comment.resolvedBy = resolved ? resolvedBy : null;
    comment.updatedAt = new Date();

    await this.commentRepository.save(comment);

    // Emit real-time event
    this.emit('comment:resolved', {
      commentId,
      resolved,
      resolvedBy,
      workflowId: comment.workflowId
    });

    return true;
  }

  /**
   * Get comments for workflow with threading
   */
  async getWorkflowComments(workflowId: string, includeResolved: boolean = false): Promise<any[]> {
    let query = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.createdByUser', 'user')
      .where('comment.workflowId = :workflowId', { workflowId });

    if (!includeResolved) {
      query = query.andWhere('comment.isResolved = :isResolved', { isResolved: false });
    }

    const comments = await query.orderBy('comment.createdAt', 'ASC').getMany();

    // Build threaded structure
    const commentMap = new Map();
    const rootComments: any[] = [];

    comments.forEach(comment => {
      const commentData = {
        ...comment,
        replies: [],
        createdBy: {
          id: comment.createdByUser.id,
          name: comment.createdByUser.name,
          email: comment.createdByUser.email,
          avatar: comment.createdByUser.avatar
        }
      };
      commentMap.set(comment.id, commentData);
    });

    comments.forEach(comment => {
      const commentData = commentMap.get(comment.id);
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentData);
        } else {
          rootComments.push(commentData);
        }
      } else {
        rootComments.push(commentData);
      }
    });

    return rootComments;
  }

  // ==================== VERSION MANAGEMENT ====================

  /**
   * Create workflow version
   */
  async createVersion(params: {
    workflowId: string;
    version: string;
    createdBy: string;
    description: string;
    changes: any;
    snapshot: any;
  }): Promise<WorkflowVersion> {
    // Get previous version for diff calculation
    const previousVersion = await this.versionRepository.findOne({
      where: { workflowId: params.workflowId },
      order: { createdAt: 'DESC' }
    });

    const version = new WorkflowVersion();
    version.workflow = { id: params.workflowId } as any;
    version.version = params.version;
    version.createdBy = params.createdBy;
    version.description = params.description;
    version.changes = params.changes;
    version.snapshot = params.snapshot;
    version.diff = CollaborationService.generateDiff(
      previousVersion?.snapshot || {},
      params.snapshot
    );
    version.createdAt = new Date();

    return await this.versionRepository.save(version);
  }

  /**
   * Get workflow version history
   */
  async getVersionHistory(workflowId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    const versions = await this.versionRepository.find({
      where: { workflowId },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset
    });

    return versions.map(version => ({
      ...version,
      createdBy: {
        id: version.createdByUser.id,
        name: version.createdByUser.name,
        email: version.createdByUser.email,
        avatar: version.createdByUser.avatar
      }
    }));
  }

  /**
   * Revert workflow to specific version
   */
  async revertToVersion(workflowId: string, versionId: string, revertedBy: string): Promise<boolean> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId, workflowId },
      relations: ['workflow']
    });

    if (!version) {
      return false;
    }

    // Update workflow with reverted data
    const workflow = version.workflow;
    if (workflow) {
      workflow.snapshot = version.snapshot;
      await this.workflowRepository.save(workflow);
    }

    // Create new version record for the revert
    await this.createVersion({
      workflowId,
      version: `revert-${Date.now()}`,
      createdBy: revertedBy,
      description: `Reverted to version ${version.version}`,
      changes: { type: 'revert', revertedFrom: versionId },
      snapshot: version.snapshot
    });

    // Emit real-time event
    this.emit('version:reverted', {
      workflowId,
      revertedToVersion: version.version,
      revertedBy
    });

    return true;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate diff between two objects
   */
  static generateDiff(oldObj: any, newObj: any): any {
    const diff: any = {
      added: [],
      removed: [],
      modified: []
    };

    const oldKeys = new Set(Object.keys(oldObj || {}));
    const newKeys = new Set(Object.keys(newObj || {}));

    // Find added keys
    for (const key of newKeys) {
      if (!oldKeys.has(key)) {
        diff.added.push(key);
      }
    }

    // Find removed keys
    for (const key of oldKeys) {
      if (!newKeys.has(key)) {
        diff.removed.push(key);
      }
    }

    // Find modified keys
    for (const key of newKeys) {
      if (oldKeys.has(key) && JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        diff.modified.push({
          key,
          oldValue: oldObj[key],
          newValue: newObj[key]
        });
      }
    }

    return diff;
  }

  /**
   * Calculate text similarity for merge suggestions
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Detect conflicts in collaborative editing
   */
  async detectConflicts(workflowId: string, userId: string, timestamp: Date): Promise<any[]> {
    // Get recent versions and sessions
    const recentVersions = await this.getVersionHistory(workflowId, 5, 0);
    const activeSession = await this.getActiveSession(workflowId);

    const conflicts: any[] = [];

    // Check for version conflicts
    for (const version of recentVersions) {
      if (version.createdBy !== userId && version.createdAt > timestamp) {
        conflicts.push({
          type: 'version_conflict',
          versionId: version.id,
          createdBy: version.createdBy,
          createdAt: version.createdAt,
          description: version.description
        });
      }
    }

    // Check for session conflicts
    if (activeSession) {
      const activeParticipants = activeSession.participants.filter((p: any) => p.isActive && p.userId !== userId);
      for (const participant of activeParticipants) {
        if (participant.lastActivity && participant.lastActivity > timestamp) {
          conflicts.push({
            type: 'session_conflict',
            userId: participant.userId,
            lastActivity: participant.lastActivity,
            message: 'Active editing session detected'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Suggest merge strategies for conflicting edits
   */
  async suggestMergeStrategy(workflowId: string, conflicts: any[]): Promise<any> {
    const strategies = [];

    for (const conflict of conflicts) {
      if (conflict.type === 'version_conflict') {
        strategies.push({
          conflictId: conflict.versionId,
          type: 'merge_or_replace',
          description: 'Merge changes or replace with newer version',
          confidence: 0.8
        });
      } else if (conflict.type === 'session_conflict') {
        strategies.push({
          conflictId: conflict.userId,
          type: 'real_time_merge',
          description: 'Real-time collaborative merge required',
          confidence: 0.6
        });
      }
    }

    return {
      mergeStrategy: strategies.length > 1 ? 'complex_merge' : strategies[0]?.type || 'manual',
      strategies,
      recommended: strategies.find(s => s.confidence > 0.7)?.type || 'manual_review'
    };
  }

  // ==================== COLLABORATION ANALYTICS ====================

  /**
   * Get collaboration statistics
   */
  async getCollaborationStats(teamId: string, dateFrom: Date, dateTo: Date): Promise<any> {
    // Get session statistics
    const sessionStats = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.teamId = :teamId', { teamId })
      .andWhere('session.createdAt >= :dateFrom AND session.createdAt <= :dateTo', { dateFrom, dateTo })
      .select([
        'COUNT(*) as totalSessions',
        'AVG(session.maxParticipants) as avgParticipants',
        'AVG(EXTRACT(EPOCH FROM (session.endedAt - session.createdAt))) as avgDuration'
      ])
      .getRawOne();

    // Get comment statistics
    const commentStats = await this.commentRepository
      .createQueryBuilder('comment')
      .leftJoin('comment.workflow', 'workflow')
      .where('workflow.teamId = :teamId', { teamId })
      .andWhere('comment.createdAt >= :dateFrom AND comment.createdAt <= :dateTo', { dateFrom, dateTo })
      .select([
        'COUNT(*) as totalComments',
        'COUNT(CASE WHEN comment.isResolved = true THEN 1 END) as resolvedComments'
      ])
      .getRawOne();

    // Get version statistics
    const versionStats = await this.versionRepository
      .createQueryBuilder('version')
      .leftJoin('version.workflow', 'workflow')
      .where('workflow.teamId = :teamId', { teamId })
      .andWhere('version.createdAt >= :dateFrom AND version.createdAt <= :dateTo', { dateFrom, dateTo })
      .select([
        'COUNT(*) as totalVersions',
        'AVG(LENGTH(version.description)) as avgDescriptionLength'
      ])
      .getRawOne();

    return {
      sessions: {
        total: Number(sessionStats?.totalSessions || 0),
        avgParticipants: Number(sessionStats?.avgParticipants || 0),
        avgDuration: Math.round(Number(sessionStats?.avgDuration || 0))
      },
      comments: {
        total: Number(commentStats?.totalComments || 0),
        resolved: Number(commentStats?.resolvedComments || 0),
        resolutionRate: commentStats?.totalComments > 0 ? 
          Math.round((Number(commentStats.resolvedComments) / Number(commentStats.totalComments)) * 100) : 0
      },
      versions: {
        total: Number(versionStats?.totalVersions || 0),
        avgDescriptionLength: Math.round(Number(versionStats?.avgDescriptionLength || 0))
      }
    };
  }
}

export default CollaborationService;