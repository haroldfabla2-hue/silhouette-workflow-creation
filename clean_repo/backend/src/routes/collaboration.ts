import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CollaborationSession, WorkflowComment, WorkflowVersion, User, Team, TeamMember, Workflow } from '../entities';
import { CollaborationService } from '../services/collaborationService';
import { SocketService } from '../services/socketService';
import { AuditService } from '../services/auditService';
import { NotificationService } from '../services/notificationService';

const router = Router();
const sessionRepository = AppDataSource.getRepository(CollaborationSession);
const commentRepository = AppDataSource.getRepository(WorkflowComment);
const versionRepository = AppDataSource.getRepository(WorkflowVersion);
const userRepository = AppDataSource.getRepository(User);
const teamRepository = AppDataSource.getRepository(Team);
const teamMemberRepository = AppDataSource.getRepository(TeamMember);
const workflowRepository = AppDataSource.getRepository(Workflow);

// ==================== COLLABORATION SESSIONS ====================

/**
 * Create collaboration session
 * @route POST /collaboration/sessions
 * @desc Create a real-time collaboration session for a workflow
 * @access Private (team members with edit permissions)
 */
router.post(
  '/sessions',
  authenticate,
  authorize(['admin', 'manager', 'lead', 'member']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        workflowId, 
        sessionType = 'edit', 
        expiresAt,
        maxParticipants = 10,
        allowAnonymous = false,
        password,
        settings = {}
      } = req.body;
      const userId = req.user?.id;

      // Get workflow and verify permissions
      const workflow = await workflowRepository.findOne({
        where: { id: workflowId },
        relations: ['team', 'team.members', 'team.members.user']
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      // Check team membership and permissions
      const teamMember = workflow.team.members.find(member => member.userId === userId);
      if (!teamMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      if (!teamMember.permissions.includes('workflows:edit') && teamMember.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to create collaboration sessions'
        });
      }

      // Check for existing active session
      const existingSession = await sessionRepository.findOne({
        where: {
          workflowId,
          status: 'active',
          expiresAt: new Date(),
        }
      });

      if (existingSession) {
        return res.status(409).json({
          success: false,
          message: 'An active collaboration session already exists for this workflow',
          data: { sessionId: existingSession.id }
        });
      }

      // Create collaboration session
      const session = new CollaborationSession();
      session.workflow = workflow;
      session.createdBy = userId!;
      session.sessionType = sessionType;
      session.maxParticipants = maxParticipants;
      session.allowAnonymous = allowAnonymous;
      session.password = password;
      session.settings = {
        enableChat: settings.enableChat !== false,
        enableScreenShare: settings.enableScreenShare || false,
        enableVoiceChat: settings.enableVoiceChat || false,
        enableFileSharing: settings.enableFileSharing !== false,
        requireApproval: settings.requireApproval || false,
        autoSaveInterval: settings.autoSaveInterval || 30000, // 30 seconds
        ...settings
      };
      session.participants = [{
        userId: userId!,
        role: 'owner',
        joinedAt: new Date(),
        isActive: true,
        cursor: null,
        selection: null
      }];
      session.status = 'active';
      session.expiresAt = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      session.joinToken = CollaborationService.generateJoinToken();

      const savedSession = await sessionRepository.save(session);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'collaboration:session:create',
        resourceType: 'collaboration_session',
        resourceId: savedSession.id,
        details: { 
          workflowId, 
          sessionType, 
          maxParticipants,
          expiresAt: savedSession.expiresAt
        }
      });

      // Emit real-time event
      SocketService.emitToWorkflow(workflowId, 'collaboration:session:created', {
        session: {
          id: savedSession.id,
          sessionType: savedSession.sessionType,
          maxParticipants: savedSession.maxParticipants,
          settings: savedSession.settings,
          expiresAt: savedSession.expiresAt,
          createdBy: req.user
        }
      });

      // Notify team members about new collaboration session
      const teamMembers = workflow.team.members
        .filter(member => member.userId !== userId)
        .map(member => member.userId);

      if (teamMembers.length > 0) {
        await NotificationService.sendBulkNotifications({
          userIds: teamMembers,
          type: 'collaboration_session_started',
          title: 'Collaboration Session Started',
          message: `${req.user?.name} started a collaboration session for workflow "${workflow.name}"`,
          data: {
            workflowId,
            workflowName: workflow.name,
            sessionId: savedSession.id,
            sessionType,
            initiatedBy: req.user
          },
          channels: ['in_app', 'email']
        });
      }

      res.status(201).json({
        success: true,
        message: 'Collaboration session created successfully',
        data: {
          session: savedSession,
          joinUrl: `${process.env.FRONTEND_URL}/collaboration/join/${savedSession.id}/${savedSession.joinToken}`,
          sessionId: savedSession.id,
          joinToken: savedSession.joinToken
        }
      });

    } catch (error) {
      console.error('Create collaboration session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create collaboration session',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get collaboration session
 * @route GET /collaboration/sessions/:sessionId
 * @desc Get collaboration session details
 * @access Private (team members or session participants)
 */
router.get(
  '/sessions/:sessionId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      const { joinToken } = req.query;

      const session = await sessionRepository.findOne({
        where: { id: sessionId },
        relations: [
          'workflow', 
          'workflow.team', 
          'workflow.team.members', 
          'workflow.team.members.user',
          'createdByUser'
        ]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration session not found'
        });
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        return res.status(410).json({
          success: false,
          message: 'Collaboration session has expired'
        });
      }

      // Check access permissions
      const isTeamMember = session.workflow.team.members.some(member => member.userId === userId);
      const isParticipant = session.participants.some(p => p.userId === userId && p.isActive);
      const isCreator = session.createdBy === userId;

      if (!isTeamMember && !isParticipant && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not authorized to view this session'
        });
      }

      // If joining with token, validate
      if (joinToken && !isTeamMember && !isCreator) {
        if (session.joinToken !== joinToken) {
          return res.status(403).json({
            success: false,
            message: 'Invalid join token'
          });
        }
      }

      // Check if session is at capacity
      if (session.participants.filter(p => p.isActive).length >= session.maxParticipants && !isParticipant) {
        return res.status(409).json({
          success: false,
          message: 'Collaboration session is at maximum capacity'
        });
      }

      res.json({
        success: true,
        data: {
          ...session,
          createdByUser: {
            id: session.createdByUser.id,
            name: session.createdByUser.name,
            email: session.createdByUser.email
          },
          workflow: {
            id: session.workflow.id,
            name: session.workflow.name,
            version: session.workflow.version
          }
        }
      });

    } catch (error) {
      console.error('Get collaboration session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch collaboration session',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Join collaboration session
 * @route POST /collaboration/sessions/:sessionId/join
 * @desc Join a collaboration session
 * @access Private (team members or with valid join token)
 */
router.post(
  '/sessions/:sessionId/join',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { joinToken, role = 'participant', cursor, selection } = req.body;
      const userId = req.user?.id;

      const session = await sessionRepository.findOne({
        where: { id: sessionId },
        relations: ['workflow', 'workflow.team', 'workflow.team.members']
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration session not found'
        });
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        return res.status(410).json({
          success: false,
          message: 'Collaboration session has expired'
        });
      }

      if (session.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Cannot join session with status: ${session.status}`
        });
      }

      // Check team membership
      const teamMember = session.workflow.team.members.find(member => member.userId === userId);
      const isTeamMember = !!teamMember;

      if (!isTeamMember && session.joinToken !== joinToken) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Invalid join token or not a team member'
        });
      }

      // Check if already a participant
      const existingParticipant = session.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        if (!existingParticipant.isActive) {
          // Reactivate participant
          existingParticipant.isActive = true;
          existingParticipant.joinedAt = new Date();
          if (cursor) existingParticipant.cursor = cursor;
          if (selection) existingParticipant.selection = selection;
        }
      } else {
        // Check capacity
        const activeCount = session.participants.filter(p => p.isActive).length;
        if (activeCount >= session.maxParticipants) {
          return res.status(409).json({
            success: false,
            message: 'Collaboration session is at maximum capacity'
          });
        }

        // Add new participant
        session.participants.push({
          userId: userId!,
          role,
          joinedAt: new Date(),
          isActive: true,
          cursor: cursor || null,
          selection: selection || null
        });
      }

      const savedSession = await sessionRepository.save(session);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'collaboration:session:join',
        resourceType: 'collaboration_session',
        resourceId: sessionId,
        details: { 
          isTeamMember,
          role,
          participantCount: session.participants.filter(p => p.isActive).length
        }
      });

      // Emit real-time events
      SocketService.emitToSession(sessionId, 'collaboration:participant:joined', {
        participant: {
          userId,
          role,
          joinedAt: new Date(),
          user: {
            id: req.user?.id,
            name: req.user?.name,
            email: req.user?.email,
            avatar: req.user?.avatar
          }
        },
        totalParticipants: session.participants.filter(p => p.isActive).length
      });

      // Update participant cursors/selections
      if (cursor || selection) {
        SocketService.emitToSession(sessionId, 'collaboration:cursor:update', {
          userId,
          cursor,
          selection,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        message: 'Successfully joined collaboration session',
        data: {
          sessionId: savedSession.id,
          role: role,
          participants: savedSession.participants.filter(p => p.isActive),
          isOwner: savedSession.createdBy === userId
        }
      });

    } catch (error) {
      console.error('Join collaboration session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join collaboration session',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Leave collaboration session
 * @route POST /collaboration/sessions/:sessionId/leave
 * @desc Leave a collaboration session
 * @access Private (session participants)
 */
router.post(
  '/sessions/:sessionId/leave',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      const session = await sessionRepository.findOne({
        where: { id: sessionId }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration session not found'
        });
      }

      // Find and deactivate participant
      const participantIndex = session.participants.findIndex(p => p.userId === userId);
      if (participantIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Not a participant in this session'
        });
      }

      session.participants[participantIndex].isActive = false;
      session.participants[participantIndex].leftAt = new Date();

      // If creator left and there are other active participants, transfer ownership
      if (session.createdBy === userId) {
        const otherActiveParticipants = session.participants.filter(p => p.isActive);
        if (otherActiveParticipants.length > 0) {
          session.createdBy = otherActiveParticipants[0].userId;
          otherActiveParticipants[0].role = 'owner';
        } else {
          // No active participants, end session
          session.status = 'ended';
          session.endedAt = new Date();
        }
      }

      const savedSession = await sessionRepository.save(session);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'collaboration:session:leave',
        resourceType: 'collaboration_session',
        resourceId: sessionId,
        details: { 
          wasOwner: session.createdBy === userId,
          remainingParticipants: session.participants.filter(p => p.isActive).length
        }
      });

      // Emit real-time events
      SocketService.emitToSession(sessionId, 'collaboration:participant:left', {
        userId,
        user: {
          id: req.user?.id,
          name: req.user?.name,
          email: req.user?.email,
          avatar: req.user?.avatar
        },
        totalParticipants: session.participants.filter(p => p.isActive).length,
        newOwnerId: session.createdBy
      });

      res.json({
        success: true,
        message: 'Successfully left collaboration session',
        data: {
          sessionStatus: session.status,
          newOwnerId: session.createdBy
        }
      });

    } catch (error) {
      console.error('Leave collaboration session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to leave collaboration session',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== WORKFLOW COMMENTS ====================

/**
 * Add comment to workflow
 * @route POST /collaboration/comments
 * @desc Add a comment to a workflow
 * @access Private (team members)
 */
router.post(
  '/comments',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        workflowId, 
        content, 
        parentId = null, 
        position = null,
        metadata = {}
      } = req.body;
      const userId = req.user?.id;

      // Get workflow and verify team membership
      const workflow = await workflowRepository.findOne({
        where: { id: workflowId },
        relations: ['team', 'team.members', 'team.members.user']
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      const teamMember = workflow.team.members.find(member => member.userId === userId);
      if (!teamMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Create comment
      const comment = new WorkflowComment();
      comment.workflow = workflow;
      comment.createdBy = userId!;
      comment.content = content;
      comment.parentId = parentId;
      comment.position = position;
      comment.metadata = {
        ...metadata,
        teamId: workflow.teamId,
        workflowVersion: workflow.version
      };
      comment.isResolved = false;

      const savedComment = await commentRepository.save(comment);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'workflow:comment:add',
        resourceType: 'workflow_comment',
        resourceId: savedComment.id,
        details: { 
          workflowId, 
          hasParent: !!parentId,
          position
        }
      });

      // Emit real-time events
      SocketService.emitToWorkflow(workflowId, 'collaboration:comment:added', {
        comment: {
          ...savedComment,
          createdBy: {
            id: req.user?.id,
            name: req.user?.name,
            email: req.user?.email,
            avatar: req.user?.avatar
          }
        }
      });

      // Notify other team members
      const otherMembers = workflow.team.members
        .filter(member => member.userId !== userId)
        .map(member => member.userId);

      if (otherMembers.length > 0) {
        await NotificationService.sendBulkNotifications({
          userIds: otherMembers,
          type: 'workflow_comment_added',
          title: 'New Workflow Comment',
          message: `${req.user?.name} commented on workflow "${workflow.name}"`,
          data: {
            workflowId,
            workflowName: workflow.name,
            commentId: savedComment.id,
            commentContent: content.substring(0, 100),
            commentedBy: req.user
          },
          channels: ['in_app']
        });
      }

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: savedComment
      });

    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add comment',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get workflow comments
 * @route GET /collaboration/comments
 * @desc Get comments for a workflow
 * @access Private (team members)
 */
router.get(
  '/comments',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workflowId, includeResolved = false, page = 1, limit = 50 } = req.query;
      const userId = req.user?.id;

      // Verify team membership
      const workflow = await workflowRepository.findOne({
        where: { id: workflowId },
        relations: ['team', 'team.members']
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      const isTeamMember = workflow.team.members.some(member => member.userId === userId);
      if (!isTeamMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Build query
      let query = commentRepository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.createdByUser', 'user')
        .leftJoin('comment.parent', 'parent')
        .where('comment.workflowId = :workflowId', { workflowId });

      if (includeResolved !== 'true') {
        query = query.andWhere('comment.isResolved = :isResolved', { isResolved: false });
      }

      // Sort by creation date (newest first)
      query = query.orderBy('comment.createdAt', 'DESC');

      // Apply pagination
      const comments = await query
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getMany();

      // Get total count
      const totalQuery = commentRepository
        .createQueryBuilder('comment')
        .where('comment.workflowId = :workflowId', { workflowId });

      if (includeResolved !== 'true') {
        totalQuery.andWhere('comment.isResolved = :isResolved', { isResolved: false });
      }

      const total = await totalQuery.getCount();

      // Format response
      const formattedComments = comments.map(comment => ({
        ...comment,
        createdBy: {
          id: comment.createdByUser.id,
          name: comment.createdByUser.name,
          email: comment.createdByUser.email,
          avatar: comment.createdByUser.avatar
        },
        replies: [], // Will be populated if needed
        parentComment: comment.parent ? {
          id: comment.parent.id,
          content: comment.parent.content,
          createdBy: comment.parent.createdBy
        } : null
      }));

      res.json({
        success: true,
        data: formattedComments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch comments',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Resolve comment
 * @route PUT /collaboration/comments/:commentId/resolve
 * @desc Mark a comment as resolved
 * @access Private (team members)
 */
router.put(
  '/comments/:commentId/resolve',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { commentId } = req.params;
      const { resolved = true } = req.body;
      const userId = req.user?.id;

      const comment = await commentRepository.findOne({
        where: { id: commentId },
        relations: ['workflow', 'workflow.team', 'workflow.team.members']
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Check team membership
      const isTeamMember = comment.workflow.team.members.some(member => member.userId === userId);
      if (!isTeamMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      comment.isResolved = resolved;
      comment.resolvedAt = resolved ? new Date() : null;
      comment.resolvedBy = resolved ? userId : null;

      const savedComment = await commentRepository.save(comment);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'workflow:comment:resolve',
        resourceType: 'workflow_comment',
        resourceId: commentId,
        details: { resolved }
      });

      // Emit real-time event
      SocketService.emitToWorkflow(comment.workflowId, 'collaboration:comment:resolved', {
        commentId,
        resolved,
        resolvedBy: req.user
      });

      res.json({
        success: true,
        message: `Comment ${resolved ? 'resolved' : 'unresolved'} successfully`,
        data: savedComment
      });

    } catch (error) {
      console.error('Resolve comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve comment',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== WORKFLOW VERSIONS ====================

/**
 * Create workflow version
 * @route POST /collaboration/versions
 * @desc Create a new version of a workflow
 * @access Private (team members with edit permissions)
 */
router.post(
  '/versions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        workflowId, 
        version, 
        description = '',
        changes = {},
        snapshot = {}
      } = req.body;
      const userId = req.user?.id;

      // Get workflow and verify permissions
      const workflow = await workflowRepository.findOne({
        where: { id: workflowId },
        relations: ['team', 'team.members', 'team.members.user']
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      const teamMember = workflow.team.members.find(member => member.userId === userId);
      if (!teamMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      if (!teamMember.permissions.includes('workflows:edit') && teamMember.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to create versions'
        });
      }

      // Create version
      const workflowVersion = new WorkflowVersion();
      workflowVersion.workflow = workflow;
      workflowVersion.version = version;
      workflowVersion.createdBy = userId!;
      workflowVersion.description = description;
      workflowVersion.changes = changes;
      workflowVersion.snapshot = snapshot;
      workflowVersion.diff = CollaborationService.generateDiff(
        workflowVersion.snapshot, 
        snapshot
      );

      const savedVersion = await versionRepository.save(workflowVersion);

      // Update workflow version
      workflow.version = version;
      await workflowRepository.save(workflow);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'workflow:version:create',
        resourceType: 'workflow_version',
        resourceId: savedVersion.id,
        details: { 
          workflowId, 
          version, 
          description,
          changeCount: Object.keys(changes).length
        }
      });

      // Emit real-time events
      SocketService.emitToWorkflow(workflowId, 'collaboration:version:created', {
        version: savedVersion,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          newVersion: version
        },
        createdBy: req.user
      });

      res.status(201).json({
        success: true,
        message: 'Workflow version created successfully',
        data: savedVersion
      });

    } catch (error) {
      console.error('Create workflow version error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create workflow version',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get workflow versions
 * @route GET /collaboration/versions
 * @desc Get version history for a workflow
 * @access Private (team members)
 */
router.get(
  '/versions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workflowId, page = 1, limit = 20 } = req.query;
      const userId = req.user?.id;

      // Verify team membership
      const workflow = await workflowRepository.findOne({
        where: { id: workflowId },
        relations: ['team', 'team.members']
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      const isTeamMember = workflow.team.members.some(member => member.userId === userId);
      if (!isTeamMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Get versions
      const versions = await versionRepository
        .createQueryBuilder('version')
        .leftJoinAndSelect('version.createdByUser', 'user')
        .where('version.workflowId = :workflowId', { workflowId })
        .orderBy('version.createdAt', 'DESC')
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getMany();

      // Get total count
      const total = await versionRepository.count({
        where: { workflowId }
      });

      // Format response
      const formattedVersions = versions.map(version => ({
        ...version,
        createdBy: {
          id: version.createdByUser.id,
          name: version.createdByUser.name,
          email: version.createdByUser.email,
          avatar: version.createdByUser.avatar
        },
        // Remove large snapshot data from response
        snapshot: version.snapshot ? 'present' : null
      }));

      res.json({
        success: true,
        data: formattedVersions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get workflow versions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflow versions',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Revert to previous version
 * @route POST /collaboration/versions/:versionId/revert
 * @desc Revert workflow to a previous version
 * @access Private (team owners/managers only)
 */
router.post(
  '/versions/:versionId/revert',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { versionId } = req.params;
      const { reason = '' } = req.body;
      const userId = req.user?.id;

      const version = await versionRepository.findOne({
        where: { id: versionId },
        relations: [
          'workflow', 
          'workflow.team', 
          'workflow.team.members', 
          'workflow.team.members.user'
        ]
      });

      if (!version) {
        return res.status(404).json({
          success: false,
          message: 'Workflow version not found'
        });
      }

      // Check permissions
      const teamMember = version.workflow.team.members.find(member => member.userId === userId);
      if (!teamMember || !['owner', 'manager'].includes(teamMember.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only team owners and managers can revert versions'
        });
      }

      // Create new version with reverted data
      const revertedVersion = new WorkflowVersion();
      revertedVersion.workflow = version.workflow;
      revertedVersion.version = version.version;
      revertedVersion.createdBy = userId!;
      revertedVersion.description = `Reverted to version ${version.version}${reason ? ` - ${reason}` : ''}`;
      revertedVersion.changes = { type: 'revert', revertedFrom: version.id };
      revertedVersion.snapshot = version.snapshot;
      revertedVersion.diff = CollaborationService.generateDiff(
        version.workflow.snapshot || {}, 
        version.snapshot
      );

      const savedVersion = await versionRepository.save(revertedVersion);

      // Update workflow with reverted data
      const workflow = version.workflow;
      workflow.snapshot = version.snapshot;
      workflow.version = version.version;
      workflow.updatedAt = new Date();

      await workflowRepository.save(workflow);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'workflow:version:revert',
        resourceType: 'workflow_version',
        resourceId: savedVersion.id,
        details: { 
          revertedToVersion: version.version,
          reason,
          originalVersion: workflow.version
        }
      });

      // Emit real-time events
      SocketService.emitToWorkflow(workflow.id, 'collaboration:version:reverted', {
        version: savedVersion,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          revertedToVersion: version.version
        },
        revertedBy: req.user
      });

      res.json({
        success: true,
        message: 'Workflow reverted to previous version successfully',
        data: savedVersion
      });

    } catch (error) {
      console.error('Revert workflow version error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revert workflow version',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== REAL-TIME UPDATES ====================

/**
 * Update participant cursor/selection
 * @route PUT /collaboration/sessions/:sessionId/cursor
 * @desc Update participant cursor and selection in real-time
 * @access Private (session participants)
 */
router.put(
  '/sessions/:sessionId/cursor',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { cursor, selection } = req.body;
      const userId = req.user?.id;

      const session = await sessionRepository.findOne({
        where: { id: sessionId }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration session not found'
        });
      }

      // Check if user is an active participant
      const participant = session.participants.find(p => p.userId === userId && p.isActive);
      if (!participant) {
        return res.status(403).json({
          success: false,
          message: 'Not an active participant in this session'
        });
      }

      // Update cursor and selection
      if (cursor) participant.cursor = cursor;
      if (selection) participant.selection = selection;
      participant.lastActivity = new Date();

      await sessionRepository.save(session);

      // Emit real-time cursor update
      SocketService.emitToSession(sessionId, 'collaboration:cursor:update', {
        userId,
        cursor,
        selection,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'Cursor position updated'
      });

    } catch (error) {
      console.error('Update cursor error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cursor position',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

export default router;