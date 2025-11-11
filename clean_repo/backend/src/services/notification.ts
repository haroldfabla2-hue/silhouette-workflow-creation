import { AppDataSource } from '../config/database';
import { User, Team, TeamMember, Notification, NotificationPreference } from '../entities';
import { EventEmitter } from 'events';
import { SocketService } from './socketService';

interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channels?: string[];
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: any;
}

interface BulkNotificationData {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  data?: any;
  channels?: string[];
  priority?: string;
}

export class NotificationService extends EventEmitter {
  private userRepository: any;
  private teamMemberRepository: any;
  private notificationRepository: any;
  private preferenceRepository: any;

  constructor() {
    super();
    this.initializeRepositories();
    this.setupEventHandlers();
  }

  private initializeRepositories() {
    this.userRepository = AppDataSource.getRepository(User);
    this.teamMemberRepository = AppDataSource.getRepository(TeamMember);
    this.notificationRepository = AppDataSource.getRepository(Notification);
    this.preferenceRepository = AppDataSource.getRepository(NotificationPreference);
  }

  private setupEventHandlers() {
    // Setup event handlers for different notification triggers
    this.on('workflow:executed', this.handleWorkflowExecution.bind(this));
    this.on('workflow:failed', this.handleWorkflowFailure.bind(this));
    this.on('collaboration:comment:added', this.handleCommentAdded.bind(this));
    this.on('team:member:added', this.handleTeamMemberAdded.bind(this));
    this.on('system:maintenance', this.handleSystemMaintenance.bind(this));
  }

  // ==================== INDIVIDUAL NOTIFICATIONS ====================

  /**
   * Send notification to a single user
   */
  async sendNotification(userId: string, notificationData: NotificationData): Promise<string> {
    try {
      // Get user and their preferences
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['notificationPreferences']
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check user preferences for notification type
      const preference = user.notificationPreferences.find((p: any) => p.type === notificationData.type);
      const enabledChannels = this.getEnabledChannels(notificationData, preference);

      if (enabledChannels.length === 0) {
        return ''; // Notification disabled for this type
      }

      // Create notification record
      const notification = new Notification();
      notification.userId = userId;
      notification.type = notificationData.type;
      notification.title = notificationData.title;
      notification.message = notificationData.message;
      notification.data = notificationData.data || {};
      notification.priority = notificationData.priority || 'normal';
      notification.channels = enabledChannels;
      notification.scheduledAt = notificationData.scheduledAt;
      notification.expiresAt = notificationData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      notification.metadata = {
        ...notificationData.metadata,
        createdAt: new Date().toISOString(),
        channelsUsed: enabledChannels
      };

      // If scheduled, mark as pending, otherwise send immediately
      if (notificationData.scheduledAt && notificationData.scheduledAt > new Date()) {
        notification.status = 'scheduled';
      } else {
        notification.status = 'pending';
        notification.sentAt = new Date();
      }

      const savedNotification = await this.notificationRepository.save(notification);

      // Send via enabled channels
      if (notification.status === 'pending') {
        await this.sendViaChannels(savedNotification, enabledChannels);
      }

      return savedNotification.id;

    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(bulkData: BulkNotificationData): Promise<string[]> {
    try {
      // Get users and their preferences
      const users = await this.userRepository.findByIds(
        bulkData.userIds,
        { relations: ['notificationPreferences'] }
      );

      const notificationIds: string[] = [];

      for (const user of users) {
        // Check user preferences
        const preference = user.notificationPreferences.find((p: any) => p.type === bulkData.type);
        const enabledChannels = this.getEnabledChannels(
          { 
            type: bulkData.type, 
            title: bulkData.title, 
            message: bulkData.message, 
            channels: bulkData.channels 
          }, 
          preference
        );

        if (enabledChannels.length > 0) {
          const notificationId = await this.sendNotification(user.id, {
            type: bulkData.type,
            title: bulkData.title,
            message: bulkData.message,
            data: bulkData.data,
            channels: bulkData.channels,
            priority: bulkData.priority as any
          });
          notificationIds.push(notificationId);
        }
      }

      return notificationIds;

    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to team members
   */
  async sendToTeam(teamId: string, notificationData: NotificationData, roleFilter?: string[]): Promise<string[]> {
    try {
      // Get team members
      let query = this.teamMemberRepository.createQueryBuilder('member')
        .leftJoinAndSelect('member.user', 'user')
        .where('member.teamId = :teamId', { teamId })
        .andWhere('member.isActive = :isActive', { isActive: true });

      if (roleFilter && roleFilter.length > 0) {
        query = query.andWhere('member.role IN (:...roles)', { roles: roleFilter });
      }

      const teamMembers = await query.getMany();
      const userIds = teamMembers.map(member => member.user.id);

      return await this.sendBulkNotifications({
        userIds,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        channels: notificationData.channels,
        priority: notificationData.priority
      });

    } catch (error) {
      console.error('Error sending team notification:', error);
      throw error;
    }
  }

  // ==================== CHANNEL-SPECIFIC SENDERS ====================

  /**
   * Send notification via specific channels
   */
  private async sendViaChannels(notification: any, channels: string[]): Promise<void> {
    const sendPromises = [];

    for (const channel of channels) {
      switch (channel) {
        case 'in_app':
          sendPromises.push(this.sendInAppNotification(notification));
          break;
        case 'email':
          sendPromises.push(this.sendEmailNotification(notification));
          break;
        case 'push':
          sendPromises.push(this.sendPushNotification(notification));
          break;
        case 'sms':
          sendPromises.push(this.sendSMSNotification(notification));
          break;
        case 'slack':
          sendPromises.push(this.sendSlackNotification(notification));
          break;
        case 'webhook':
          sendPromises.push(this.sendWebhookNotification(notification));
          break;
      }
    }

    try {
      await Promise.allSettled(sendPromises);
      
      // Update notification status
      notification.status = 'sent';
      notification.deliveredAt = new Date();
      await this.notificationRepository.save(notification);

    } catch (error) {
      console.error('Error sending notifications via channels:', error);
      notification.status = 'failed';
      notification.error = error.message;
      await this.notificationRepository.save(notification);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(notification: any): Promise<void> {
    try {
      // Send real-time notification via Socket.IO
      SocketService.emitToUser(notification.userId, 'notification:new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        createdAt: notification.createdAt
      });

    } catch (error) {
      console.error('Error sending in-app notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    try {
      // In a real implementation, this would integrate with email service
      // For now, we'll just log the email
      console.log(`Email notification to ${notification.userId}:`, {
        subject: notification.title,
        body: notification.message,
        data: notification.data
      });

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: any): Promise<void> {
    try {
      // In a real implementation, this would integrate with push notification service
      // (Firebase Cloud Messaging, Apple Push Notification Service, etc.)
      console.log(`Push notification to ${notification.userId}:`, {
        title: notification.title,
        body: notification.message,
        data: notification.data
      });

      // Simulate push notification delay
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: any): Promise<void> {
    try {
      // In a real implementation, this would integrate with SMS service
      // (Twilio, AWS SNS, etc.)
      console.log(`SMS notification to ${notification.userId}:`, {
        message: notification.message.substring(0, 160), // SMS character limit
        data: notification.data
      });

      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error('Error sending SMS notification:', error);
      throw error;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(notification: any): Promise<void> {
    try {
      // In a real implementation, this would integrate with Slack API
      // Using webhooks or Slack bot tokens
      console.log(`Slack notification to ${notification.userId}:`, {
        channel: 'general', // Would be determined by user settings
        text: notification.message,
        attachments: [
          {
            color: this.getSlackColor(notification.priority),
            title: notification.title,
            text: notification.message,
            fields: Object.keys(notification.data).map(key => ({
              title: key,
              value: JSON.stringify(notification.data[key]),
              short: true
            }))
          }
        ]
      });

      // Simulate Slack API delay
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      console.error('Error sending Slack notification:', error);
      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: any): Promise<void> {
    try {
      // In a real implementation, this would send to user's configured webhook URLs
      const webhookUrl = notification.metadata?.webhookUrl;
      
      if (!webhookUrl) {
        console.log(`No webhook URL configured for user ${notification.userId}`);
        return;
      }

      console.log(`Webhook notification to ${notification.userId}:`, {
        url: webhookUrl,
        payload: {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: notification.createdAt
        }
      });

      // Simulate webhook delay
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('Error sending webhook notification:', error);
      throw error;
    }
  }

  // ==================== NOTIFICATION PREFERENCES ====================

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['notificationPreferences']
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Return formatted preferences
    const preferences = user.notificationPreferences.reduce((acc: any, pref: any) => {
      acc[pref.type] = {
        enabled: pref.enabled,
        channels: pref.channels,
        frequency: pref.frequency,
        quietHours: pref.quietHours
      };
      return acc;
    }, {});

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    for (const [type, prefs] of Object.entries(preferences)) {
      let preference = await this.preferenceRepository.findOne({
        where: { userId, type }
      });

      if (!preference) {
        preference = new NotificationPreference();
        preference.userId = userId;
        preference.type = type as string;
      }

      preference.enabled = (prefs as any).enabled ?? true;
      preference.channels = (prefs as any).channels || ['in_app'];
      preference.frequency = (prefs as any).frequency || 'immediate';
      preference.quietHours = (prefs as any).quietHours || null;
      preference.updatedAt = new Date();

      await this.preferenceRepository.save(preference);
    }
  }

  /**
   * Get enabled channels based on user preferences
   */
  private getEnabledChannels(notificationData: NotificationData, preference: any): string[] {
    const defaultChannels = notificationData.channels || ['in_app'];
    
    if (!preference) {
      return defaultChannels;
    }

    if (!preference.enabled) {
      return [];
    }

    // Filter channels based on user preferences and quiet hours
    const enabledChannels = defaultChannels.filter(channel => 
      preference.channels.includes(channel)
    );

    // Check quiet hours
    if (preference.quietHours && this.isQuietHours(preference.quietHours)) {
      // Disable intrusive channels during quiet hours
      return enabledChannels.filter(channel => !['email', 'sms', 'push'].includes(channel));
    }

    return enabledChannels;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(quietHours: any): boolean {
    if (!quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to HHMM format
    const startTime = this.parseTime(quietHours.start);
    const endTime = this.parseTime(quietHours.end);

    if (startTime <= endTime) {
      // Same day
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Parse time string to minutes
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, options: {
    limit?: number;
    offset?: number;
    status?: string;
    type?: string;
  } = {}): Promise<any> {
    const { limit = 20, offset = 0, status, type } = options;

    let query = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (status) {
      query = query.andWhere('notification.status = :status', { status });
    }

    if (type) {
      query = query.andWhere('notification.type = :type', { type });
    }

    const notifications = await query
      .orderBy('notification.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const total = await query.getCount();

    return {
      notifications,
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      return false;
    }

    notification.readAt = new Date();
    await this.notificationRepository.save(notification);

    // Emit real-time event
    SocketService.emitToUser(userId, 'notification:read', {
      notificationId
    });

    return true;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('userId = :userId AND readAt IS NULL', { userId })
      .execute();

    // Emit real-time event
    SocketService.emitToUser(userId, 'notification:all:read', {});

    return result.affected || 0;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      return false;
    }

    await this.notificationRepository.remove(notification);

    // Emit real-time event
    SocketService.emitToUser(userId, 'notification:deleted', {
      notificationId
    });

    return true;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, readAt: null }
    });
  }

  // ==================== SCHEDULED NOTIFICATIONS ====================

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    const scheduledNotifications = await this.notificationRepository.find({
      where: {
        status: 'scheduled',
        scheduledAt: new Date()
      },
      relations: ['user']
    });

    for (const notification of scheduledNotifications) {
      try {
        notification.status = 'pending';
        notification.sentAt = new Date();
        await this.notificationRepository.save(notification);

        await this.sendViaChannels(notification, notification.channels);

      } catch (error) {
        console.error('Error processing scheduled notification:', error);
        notification.status = 'failed';
        notification.error = error.message;
        await this.notificationRepository.save(notification);
      }
    }
  }

  /**
   * Cleanup expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle workflow execution notifications
   */
  private async handleWorkflowExecution(data: any): Promise<void> {
    const { workflowId, executionId, workflowName, status, executedBy } = data;

    if (status === 'completed') {
      await this.sendToTeam(data.teamId, {
        type: 'workflow_execution_completed',
        title: 'Workflow Completed',
        message: `Workflow "${workflowName}" has completed successfully`,
        data: { workflowId, executionId, workflowName, executedBy },
        priority: 'normal',
        channels: ['in_app']
      });
    } else if (status === 'failed') {
      await this.sendToTeam(data.teamId, {
        type: 'workflow_execution_failed',
        title: 'Workflow Failed',
        message: `Workflow "${workflowName}" has failed to execute`,
        data: { workflowId, executionId, workflowName, executedBy },
        priority: 'high',
        channels: ['in_app', 'email']
      });
    }
  }

  /**
   * Handle workflow failure notifications
   */
  private async handleWorkflowFailure(data: any): Promise<void> {
    const { workflowId, workflowName, error, teamId, executedBy } = data;

    await this.sendToTeam(teamId, {
      type: 'workflow_execution_error',
      title: 'Workflow Error',
      message: `Workflow "${workflowName}" encountered an error: ${error.message}`,
      data: { workflowId, error, executedBy },
      priority: 'high',
      channels: ['in_app', 'email']
    });
  }

  /**
   * Handle comment added notifications
   */
  private async handleCommentAdded(data: any): Promise<void> {
    const { workflowId, workflowName, commentContent, commentedBy, teamId } = data;

    await this.sendToTeam(teamId, {
      type: 'workflow_comment_added',
      title: 'New Workflow Comment',
      message: `${commentedBy.name} commented on workflow "${workflowName}"`,
      data: { workflowId, workflowName, commentContent, commentedBy },
      priority: 'normal',
      channels: ['in_app']
    });
  }

  /**
   * Handle team member added notifications
   */
  private async handleTeamMemberAdded(data: any): Promise<void> {
    const { teamId, newMember, addedBy } = data;

    await this.sendNotification(newMember.userId, {
      type: 'team_member_added',
      title: 'Added to Team',
      message: `You have been added to a team by ${addedBy.name}`,
      data: { teamId, newMember, addedBy },
      priority: 'normal',
      channels: ['in_app', 'email']
    });
  }

  /**
   * Handle system maintenance notifications
   */
  private async handleSystemMaintenance(data: any): Promise<void> {
    const { message, scheduledAt, estimatedDuration, severity } = data;

    // Send to all active users
    const activeUsers = await this.userRepository.find({
      where: { isActive: true },
      select: ['id']
    });

    const userIds = activeUsers.map(user => user.id);

    await this.sendBulkNotifications({
      userIds,
      type: 'system_maintenance',
      title: 'System Maintenance',
      message,
      data: { scheduledAt, estimatedDuration, severity },
      priority: severity === 'critical' ? 'urgent' : 'high',
      channels: ['in_app', 'email']
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get Slack color based on priority
   */
  private getSlackColor(priority: string): string {
    const colorMap: Record<string, string> = {
      low: '#36a64f',
      normal: '#439FE0',
      high: '#ff9500',
      urgent: '#ff0000'
    };

    return colorMap[priority] || colorMap.normal;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string, dateFrom: Date, dateTo: Date): Promise<any> {
    const stats = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.createdAt >= :dateFrom AND notification.createdAt <= :dateTo', { 
        dateFrom, 
        dateTo 
      })
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN notification.readAt IS NOT NULL THEN 1 END) as read',
        'COUNT(CASE WHEN notification.status = \'sent\' THEN 1 END) as sent',
        'COUNT(CASE WHEN notification.status = \'failed\' THEN 1 END) as failed',
        'notification.type',
        'notification.priority'
      ])
      .groupBy('notification.type, notification.priority')
      .getRawMany();

    return {
      total: stats.reduce((sum, stat) => sum + Number(stat.total), 0),
      read: stats.reduce((sum, stat) => sum + Number(stat.read), 0),
      sent: stats.reduce((sum, stat) => sum + Number(stat.sent), 0),
      failed: stats.reduce((sum, stat) => sum + Number(stat.failed), 0),
      byType: stats,
      readRate: stats.length > 0 ? 
        Math.round((stats.reduce((sum, stat) => sum + Number(stat.read), 0) / 
                   stats.reduce((sum, stat) => sum + Number(stat.total), 0)) * 100) : 0
    };
  }
}

export default NotificationService;