import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { Team, TeamMember, User, Organization } from '../entities';
import { SocketService } from '../services/socketService';
import { AuditService } from '../services/auditService';

const router = Router();
const teamRepository = AppDataSource.getRepository(Team);
const teamMemberRepository = AppDataSource.getRepository(TeamMember);
const userRepository = AppDataSource.getRepository(User);
const organizationRepository = AppDataSource.getRepository(Organization);

// ==================== TEAM MANAGEMENT ====================

/**
 * Create a new team
 * @route POST /teams
 * @desc Create a new team within an organization
 * @access Private (authenticated users with org access)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager', 'lead']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, description, organizationId, members = [], settings = {} } = req.body;
      const userId = req.user?.id;

      // Verify organization access
      const organization = await organizationRepository.findOne({
        where: { id: organizationId },
        relations: ['members']
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }

      const isOrgMember = organization.members.some(member => member.userId === userId);
      if (!isOrgMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a member of this organization'
        });
      }

      // Create team
      const team = new Team();
      team.name = name;
      team.description = description;
      team.organization = organization;
      team.createdBy = userId!;
      team.settings = {
        visibility: settings.visibility || 'private',
        allowAutoJoin: settings.allowAutoJoin || false,
        maxMembers: settings.maxMembers || 50,
        workflowSharing: settings.workflowSharing || 'members',
        notificationSettings: {
          teamUpdates: true,
          workflowChanges: true,
          memberActivities: true,
          ...settings.notificationSettings
        }
      };

      const savedTeam = await teamRepository.save(team);

      // Add creator as team owner
      const teamMember = new TeamMember();
      teamMember.team = savedTeam;
      teamMember.user = userId as any;
      teamMember.role = 'owner';
      teamMember.permissions = [
        'team:manage',
        'team:members:manage',
        'workflows:create',
        'workflows:edit',
        'workflows:delete',
        'workflows:execute',
        'workflows:share',
        'analytics:view'
      ];
      teamMember.isActive = true;
      teamMember.joinedAt = new Date();

      await teamMemberRepository.save(teamMember);

      // Add initial members if provided
      if (members.length > 0) {
        for (const memberData of members) {
          const user = await userRepository.findOne({ where: { id: memberData.userId } });
          if (user) {
            const newMember = new TeamMember();
            newMember.team = savedTeam;
            newMember.user = user;
            newMember.role = memberData.role || 'member';
            newMember.permissions = getDefaultPermissions(memberData.role || 'member');
            newMember.isActive = true;
            newMember.joinedAt = new Date();
            await teamMemberRepository.save(newMember);
          }
        }
      }

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'team:create',
        resourceType: 'team',
        resourceId: savedTeam.id,
        details: { teamName: name, organizationId }
      });

      // Emit real-time event
      SocketService.emitToOrganization(organizationId, 'team:created', {
        team: savedTeam,
        createdBy: req.user
      });

      res.status(201).json({
        success: true,
        message: 'Team created successfully',
        data: savedTeam
      });

    } catch (error) {
      console.error('Team creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create team',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get all teams for user's organizations
 * @route GET /teams
 * @desc Get all teams accessible to the authenticated user
 * @access Private
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { organizationId, includeMembers = false, page = 1, limit = 20 } = req.query;

      let query = teamRepository
        .createQueryBuilder('team')
        .leftJoinAndSelect('team.organization', 'organization')
        .leftJoin('team.members', 'member')
        .where('member.userId = :userId', { userId });

      if (organizationId) {
        query = query.andWhere('team.organizationId = :orgId', { orgId: organizationId });
      }

      if (includeMembers === 'true') {
        query = query.leftJoinAndSelect('team.members', 'members')
                     .leftJoinAndSelect('members.user', 'user');
      }

      const teams = await query
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getMany();

      // Get total count
      const totalQuery = teamRepository
        .createQueryBuilder('team')
        .leftJoin('team.members', 'member')
        .where('member.userId = :userId', { userId });

      if (organizationId) {
        totalQuery.andWhere('team.organizationId = :orgId', { orgId: organizationId });
      }

      const total = await totalQuery.getCount();

      res.json({
        success: true,
        data: teams,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get teams error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch teams',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Get team by ID
 * @route GET /teams/:teamId
 * @desc Get specific team details
 * @access Private (team members only)
 */
router.get(
  '/:teamId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId } = req.params;
      const userId = req.user?.id;

      const team = await teamRepository.findOne({
        where: { id: teamId },
        relations: ['organization', 'members', 'members.user', 'workflows']
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      // Check if user is a member
      const isMember = team.members.some(member => member.userId === userId);
      if (!isMember && team.settings.visibility === 'private') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Remove sensitive member data if not member
      const responseTeam = isMember ? team : {
        ...team,
        members: team.members.map(member => ({
          ...member,
          user: {
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatar
          }
        }))
      };

      res.json({
        success: true,
        data: responseTeam
      });

    } catch (error) {
      console.error('Get team error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Update team
 * @route PUT /teams/:teamId
 * @desc Update team information
 * @access Private (team owners/managers only)
 */
router.put(
  '/:teamId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId } = req.params;
      const userId = req.user?.id;
      const { name, description, settings } = req.body;

      const team = await teamRepository.findOne({
        where: { id: teamId },
        relations: ['members', 'members.user']
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      // Check permissions
      const userMember = team.members.find(member => member.userId === userId);
      if (!userMember || !['owner', 'manager'].includes(userMember.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      // Update fields
      if (name) team.name = name;
      if (description) team.description = description;
      if (settings) {
        team.settings = {
          ...team.settings,
          ...settings
        };
      }

      team.updatedAt = new Date();

      const savedTeam = await teamRepository.save(team);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'team:update',
        resourceType: 'team',
        resourceId: teamId,
        details: { updatedFields: Object.keys(req.body) }
      });

      // Emit real-time event
      SocketService.emitToTeam(teamId, 'team:updated', {
        team: savedTeam,
        updatedBy: req.user
      });

      res.json({
        success: true,
        message: 'Team updated successfully',
        data: savedTeam
      });

    } catch (error) {
      console.error('Update team error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update team',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Delete team
 * @route DELETE /teams/:teamId
 * @desc Delete a team
 * @access Private (team owners only)
 */
router.delete(
  '/:teamId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId } = req.params;
      const userId = req.user?.id;

      const team = await teamRepository.findOne({
        where: { id: teamId },
        relations: ['members']
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      // Check permissions
      const userMember = team.members.find(member => member.userId === userId);
      if (!userMember || userMember.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only team owners can delete teams'
        });
      }

      // Check for active workflows
      // This would check for running workflows and prevent deletion
      // const activeWorkflows = await workflowRepository.count({ where: { teamId, status: 'running' } });
      // if (activeWorkflows > 0) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Cannot delete team with active workflows'
      //   });
      // }

      // Soft delete - mark as deleted instead of removing
      team.isDeleted = true;
      team.deletedAt = new Date();
      await teamRepository.save(team);

      // Audit log
      await AuditService.log({
        userId: userId!,
        action: 'team:delete',
        resourceType: 'team',
        resourceId: teamId,
        details: { teamName: team.name }
      });

      // Emit real-time event
      SocketService.emitToTeam(teamId, 'team:deleted', {
        teamId,
        deletedBy: req.user
      });

      res.json({
        success: true,
        message: 'Team deleted successfully'
      });

    } catch (error) {
      console.error('Delete team error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete team',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== TEAM MEMBERS ====================

/**
 * Add member to team
 * @route POST /teams/:teamId/members
 * @desc Add a new member to the team
 * @access Private (team owners/managers only)
 */
router.post(
  '/:teamId/members',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId } = req.params;
      const { userId, role = 'member', permissions } = req.body;
      const currentUserId = req.user?.id;

      const team = await teamRepository.findOne({
        where: { id: teamId },
        relations: ['members', 'members.user', 'organization']
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      // Check permissions
      const currentMember = team.members.find(member => member.userId === currentUserId);
      if (!currentMember || !['owner', 'manager'].includes(currentMember.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      // Check if user is already a member
      const existingMember = team.members.find(member => member.userId === userId);
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'User is already a team member'
        });
      }

      // Verify the user exists
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check team capacity
      if (team.members.length >= team.settings.maxMembers) {
        return res.status(400).json({
          success: false,
          message: 'Team is at maximum capacity'
        });
      }

      // Add member
      const teamMember = new TeamMember();
      teamMember.team = team;
      teamMember.user = user;
      teamMember.role = role;
      teamMember.permissions = permissions || getDefaultPermissions(role);
      teamMember.isActive = true;
      teamMember.joinedAt = new Date();

      const savedMember = await teamMemberRepository.save(teamMember);

      // Audit log
      await AuditService.log({
        userId: currentUserId!,
        action: 'team:member:add',
        resourceType: 'team_member',
        resourceId: savedMember.id,
        details: { teamId, userId, role }
      });

      // Emit real-time event
      SocketService.emitToTeam(teamId, 'member:added', {
        member: {
          ...savedMember,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
          }
        },
        addedBy: req.user
      });

      res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: savedMember
      });

    } catch (error) {
      console.error('Add team member error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add member',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Update member role/permissions
 * @route PUT /teams/:teamId/members/:memberId
 * @desc Update team member role or permissions
 * @access Private (team owners only, except can update own permissions)
 */
router.put(
  '/:teamId/members/:memberId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId, memberId } = req.params;
      const { role, permissions, isActive } = req.body;
      const currentUserId = req.user?.id;

      const team = await teamRepository.findOne({
        where: { id: teamId },
        relations: ['members', 'members.user']
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      const member = await teamMemberRepository.findOne({
        where: { id: memberId },
        relations: ['user', 'team']
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found'
        });
      }

      // Check permissions
      const currentMember = team.members.find(m => m.userId === currentUserId);
      if (!currentMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      // Users can update their own permissions, but only owners can change roles
      if (member.userId === currentUserId) {
        if (role) {
          return res.status(403).json({
            success: false,
            message: 'Cannot change your own role'
          });
        }
        if (permissions) {
          member.permissions = permissions;
        }
        if (typeof isActive === 'boolean') {
          member.isActive = isActive;
        }
      } else {
        // Only owners can modify other members
        if (currentMember.role !== 'owner') {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Only team owners can modify other members'
          });
        }

        if (role) {
          // Ensure at least one owner remains
          if (member.role === 'owner' && role !== 'owner') {
            const ownerCount = team.members.filter(m => m.role === 'owner' && m.id !== memberId).length;
            if (ownerCount === 0) {
              return res.status(400).json({
                success: false,
                message: 'Cannot remove the last owner from the team'
              });
            }
          }
          member.role = role;
        }
        if (permissions) member.permissions = permissions;
        if (typeof isActive === 'boolean') member.isActive = isActive;
      }

      const savedMember = await teamMemberRepository.save(member);

      // Audit log
      await AuditService.log({
        userId: currentUserId!,
        action: 'team:member:update',
        resourceType: 'team_member',
        resourceId: memberId,
        details: { 
          targetUserId: member.userId,
          role: role || member.role,
          permissions,
          isActive
        }
      });

      // Emit real-time event
      SocketService.emitToTeam(teamId, 'member:updated', {
        member: {
          ...savedMember,
          user: {
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatar
          }
        },
        updatedBy: req.user
      });

      res.json({
        success: true,
        message: 'Member updated successfully',
        data: savedMember
      });

    } catch (error) {
      console.error('Update team member error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update member',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Remove member from team
 * @route DELETE /teams/:teamId/members/:memberId
 * @desc Remove a member from the team
 * @access Private (team owners/managers only, or self-removal)
 */
router.delete(
  '/:teamId/members/:memberId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId, memberId } = req.params;
      const currentUserId = req.user?.id;

      const team = await teamRepository.findOne({
        where: { id: teamId },
        relations: ['members', 'members.user']
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      const member = await teamMemberRepository.findOne({
        where: { id: memberId },
        relations: ['user', 'team']
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found'
        });
      }

      // Check permissions - members can remove themselves, owners can remove anyone
      const currentMember = team.members.find(m => m.userId === currentUserId);
      const isSelfRemoval = member.userId === currentUserId;

      if (!isSelfRemoval && (!currentMember || !['owner', 'manager'].includes(currentMember.role))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      // Prevent removing the last owner
      if (member.role === 'owner' && !isSelfRemoval) {
        const ownerCount = team.members.filter(m => m.role === 'owner' && m.id !== memberId).length;
        if (ownerCount === 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot remove the last owner from the team'
          });
        }
      }

      await teamMemberRepository.remove(member);

      // Audit log
      await AuditService.log({
        userId: currentUserId!,
        action: 'team:member:remove',
        resourceType: 'team_member',
        resourceId: memberId,
        details: { 
          targetUserId: member.userId,
          teamId,
          isSelfRemoval
        }
      });

      // Emit real-time event
      SocketService.emitToTeam(teamId, 'member:removed', {
        memberId,
        targetUserId: member.userId,
        removedBy: isSelfRemoval ? 'self' : req.user
      });

      res.json({
        success: true,
        message: 'Member removed successfully'
      });

    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove member',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== TEAM UTILITIES ====================

/**
 * Get team members
 * @route GET /teams/:teamId/members
 * @desc Get all team members
 * @access Private (team members only)
 */
router.get(
  '/:teamId/members',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId } = req.params;
      const userId = req.user?.id;
      const { includeInactive = false } = req.query;

      const team = await teamRepository.findOne({
        where: { id: teamId },
        relations: ['members', 'members.user']
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      // Check if user is a member
      const isMember = team.members.some(member => member.userId === userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Not a team member'
        });
      }

      let members = team.members;
      if (includeInactive !== 'true') {
        members = members.filter(member => member.isActive);
      }

      const responseMembers = members.map(member => ({
        id: member.id,
        role: member.role,
        permissions: member.permissions,
        isActive: member.isActive,
        joinedAt: member.joinedAt,
        lastActiveAt: member.lastActiveAt,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatar: member.user.avatar,
          title: member.user.title,
          department: member.user.department
        }
      }));

      res.json({
        success: true,
        data: responseMembers
      });

    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team members',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * Search users to invite to team
 * @route GET /teams/:teamId/invite/search
 * @desc Search for users to invite to the team
 * @access Private (team owners/managers only)
 */
router.get(
  '/:teamId/invite/search',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamId } = req.params;
      const { q, limit = 10 } = req.query;
      const currentUserId = req.user?.id;

      const team = await teamRepository.findOne({
        where: { id: teamId },
        relations: ['members', 'organization']
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      // Check permissions
      const currentMember = team.members.find(member => member.userId === currentUserId);
      if (!currentMember || !['owner', 'manager'].includes(currentMember.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      if (!q) {
        return res.json({
          success: true,
          data: []
        });
      }

      // Search users in the same organization who are not already team members
      const memberUserIds = team.members.map(m => m.userId);
      
      const users = await userRepository
        .createQueryBuilder('user')
        .leftJoin('user.organizations', 'org')
        .where('org.id = :orgId', { orgId: team.organization.id })
        .andWhere('user.id NOT IN (:...memberIds)', { memberIds: memberUserIds })
        .andWhere('(user.name ILIKE :query OR user.email ILIKE :query)', { query: `%${q}%` })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .take(Number(limit))
        .getMany();

      const results = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        title: user.title,
        department: user.department
      }));

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search users',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// ==================== HELPER FUNCTIONS ====================

/**
 * Get default permissions for a role
 */
function getDefaultPermissions(role: string): string[] {
  const permissionMap: Record<string, string[]> = {
    owner: [
      'team:manage',
      'team:members:manage',
      'team:settings',
      'workflows:create',
      'workflows:edit',
      'workflows:delete',
      'workflows:execute',
      'workflows:share',
      'analytics:view',
      'analytics:export',
      'integrations:manage',
      'billing:manage'
    ],
    manager: [
      'team:members:manage',
      'workflows:create',
      'workflows:edit',
      'workflows:delete',
      'workflows:execute',
      'workflows:share',
      'analytics:view',
      'analytics:export'
    ],
    lead: [
      'workflows:create',
      'workflows:edit',
      'workflows:execute',
      'workflows:share',
      'analytics:view'
    ],
    member: [
      'workflows:create',
      'workflows:edit',
      'workflows:execute',
      'analytics:view'
    ],
    viewer: [
      'analytics:view'
    ]
  };

  return permissionMap[role] || permissionMap.member;
}

export default router;