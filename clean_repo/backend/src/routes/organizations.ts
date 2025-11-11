import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

// Mock organization interface
interface Organization {
  id: string;
  name: string;
  domain: string;
  settings: any;
  createdAt: string;
  updatedAt: string;
}

const router = Router();

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations
 * @access  Private (Admin only)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Mock data - in real implementation, this would query the database
    const organizations: Organization[] = [
      {
        id: '1',
        name: 'Silhouette Agency',
        domain: 'silhouette.com',
        settings: { theme: 'dark', notifications: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: {
        organizations,
        pagination: {
          page,
          limit,
          total: organizations.length,
          totalPages: Math.ceil(organizations.length / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORGANIZATION_FETCH_ERROR',
        message: 'Failed to fetch organizations'
      }
    });
  }
});

/**
 * @route   POST /api/organizations
 * @desc    Create organization
 * @access  Private (Owner/Admin only)
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, domain, settings } = req.body;
    
    if (!name || !domain) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and domain are required'
        }
      });
    }

    const organization: Organization = {
      id: Date.now().toString(),
      name,
      domain,
      settings: settings || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In real implementation, save to database

    res.status(201).json({
      success: true,
      data: { organization }
    });
  } catch (error) {
    logger.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORGANIZATION_CREATE_ERROR',
        message: 'Failed to create organization'
      }
    });
  }
});

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Mock organization data
    const organization: Organization = {
      id,
      name: 'Silhouette Agency',
      domain: 'silhouette.com',
      settings: { theme: 'dark', notifications: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { organization }
    });
  } catch (error) {
    logger.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORGANIZATION_FETCH_ERROR',
        message: 'Failed to fetch organization'
      }
    });
  }
});

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, domain, settings } = req.body;

    const updatedOrganization: Organization = {
      id,
      name: name || 'Silhouette Agency',
      domain: domain || 'silhouette.com',
      settings: settings || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In real implementation, update in database

    res.json({
      success: true,
      data: { organization: updatedOrganization }
    });
  } catch (error) {
    logger.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORGANIZATION_UPDATE_ERROR',
        message: 'Failed to update organization'
      }
    });
  }
});

/**
 * @route   DELETE /api/organizations/:id
 * @desc    Delete organization
 * @access  Private (Owner only)
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // In real implementation, soft delete or archive organization

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORGANIZATION_DELETE_ERROR',
        message: 'Failed to delete organization'
      }
    });
  }
});

export default router;