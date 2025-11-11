import { Router, Request, Response } from 'express';
import { User } from '../database/models/User';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination)
 * @access  Private
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get users from database
    const users = await User.find({
      skip: offset,
      take: limit,
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'lastLoginAt']
    });

    const total = await User.count();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_FETCH_ERROR',
        message: 'Failed to fetch users'
      }
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'lastLoginAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_FETCH_ERROR',
        message: 'Failed to fetch user'
      }
    });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, isActive } = req.body;

    // Check if user exists
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Update user
    await User.update({ id }, {
      firstName,
      lastName,
      role,
      isActive
    });

    // Get updated user
    const updatedUser = await User.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'lastLoginAt']
    });

    res.json({
      success: true,
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_UPDATE_ERROR',
        message: 'Failed to update user'
      }
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Soft delete by deactivating
    await User.update({ id }, { isActive: false });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_DELETE_ERROR',
        message: 'Failed to delete user'
      }
    });
  }
});

/**
 * @route   GET /api/users/:id/activity
 * @desc    Get user activity
 * @access  Private
 */
router.get('/:id/activity', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // TODO: Implement user activity tracking
    // This would involve creating an activity log table

    res.json({
      success: true,
      data: {
        activities: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_ACTIVITY_ERROR',
        message: 'Failed to fetch user activity'
      }
    });
  }
});

export default router;