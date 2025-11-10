import { Router, Request, Response } from 'express';
import { AuthService, CreateUserDto, LoginDto, InviteUserDto } from '../services/AuthService';
import { UserRole } from '../database/models/User';

const router = Router();
const authService = new AuthService();

// Register first user or regular user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData: CreateUserDto = req.body;
    
    if (!userData.email || !userData.firstName || !userData.lastName || !userData.password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, firstName, lastName, password',
        error: 'MISSING_FIELDS'
      });
    }

    const result = await authService.registerUser(userData);
    
    res.status(201).json({
      success: true,
      message: result.isFirstSetup ? 'First user created successfully' : 'User registered successfully',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          isFirstUser: result.user.isFirstUser,
          isOwner: result.user.isOwner
        },
        token: result.token,
        isFirstSetup: result.isFirstSetup
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed',
      error: 'REGISTRATION_ERROR'
    });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData: LoginDto = req.body;
    
    if (!loginData.email || !loginData.password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password',
        error: 'MISSING_CREDENTIALS'
      });
    }

    const result = await authService.login(loginData);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          isFirstUser: result.user.isFirstUser,
          isOwner: result.user.isOwner,
          lastLoginAt: result.user.lastLoginAt
        },
        token: result.token
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Login failed',
      error: 'LOGIN_ERROR'
    });
  }
});

// Verify token
router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      message: 'Token valid',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isFirstUser: user.isFirstUser,
          isOwner: user.isOwner,
          lastLoginAt: user.lastLoginAt
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token verification failed',
      error: 'TOKEN_VERIFICATION_ERROR'
    });
  }
});

// Accept invitation
router.post('/accept-invitation', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: token, password',
        error: 'MISSING_FIELDS'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        error: 'WEAK_PASSWORD'
      });
    }

    const result = await authService.acceptInvitation(token, password);
    
    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          isFirstUser: result.user.isFirstUser,
          isOwner: result.user.isOwner
        },
        token: result.token
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to accept invitation',
      error: 'INVITATION_ACCEPT_ERROR'
    });
  }
});

// Invite user (owner/admin only)
router.post('/invite', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    const inviteData: InviteUserDto = req.body;
    
    if (!currentUser.canInviteUsers) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to invite users',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    if (!inviteData.email || !inviteData.firstName || !inviteData.lastName || !inviteData.role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, firstName, lastName, role',
        error: 'MISSING_FIELDS'
      });
    }

    // Validate role
    if (!Object.values(UserRole).includes(inviteData.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
        error: 'INVALID_ROLE'
      });
    }

    const result = await authService.inviteUser(currentUser.id, inviteData);
    
    res.status(201).json({
      success: true,
      message: 'User invited successfully',
      data: {
        inviteToken: result.inviteToken,
        inviteUrl: result.inviteUrl,
        email: inviteData.email,
        expiresIn: '24 hours'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to invite user',
      error: 'INVITATION_ERROR'
    });
  }
});

// Get invited users (owner/admin only)
router.get('/invited-users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser.canInviteUsers) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view invited users',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const invitedUsers = await authService.getUsersByInviter(currentUser.id);
    
    res.json({
      success: true,
      message: 'Invited users retrieved successfully',
      data: {
        users: invitedUsers.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          invitedAt: user.createdAt,
          inviteExpires: user.inviteExpires
        }))
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get invited users',
      error: 'GET_INVITED_USERS_ERROR'
    });
  }
});

// Get all users (owner only)
router.get('/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser.isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only owners can view all users',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const users = await authService.getAllUsers(currentUser.id);
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          isFirstUser: user.isFirstUser,
          isOwner: user.isOwner,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          invitedBy: user.invitedBy
        }))
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get users',
      error: 'GET_USERS_ERROR'
    });
  }
});

// Get instance setup status
router.get('/setup-status', async (req: Request, res: Response) => {
  try {
    const settings = await authService.getInstanceSettings();
    
    res.json({
      success: true,
      message: 'Setup status retrieved successfully',
      data: {
        setupStatus: settings.setupStatus,
        userManagementEnabled: settings.userManagementEnabled,
        allowSelfRegistration: settings.allowSelfRegistration,
        authProvider: settings.authProvider,
        isFirstUserAllowed: settings.setupStatus !== 'completed'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get setup status',
      error: 'SETUP_STATUS_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    // Generate new token
    const token = authService.generateToken ? 
      (authService as any).generateToken(user) : 
      req.token; // Fallback to existing token
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Failed to refresh token',
      error: 'REFRESH_TOKEN_ERROR'
    });
  }
});

// Middleware de autenticación
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
      error: 'MISSING_TOKEN'
    });
  }

  const user = authService.verifyToken(token);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    });
  }

  req.user = user;
  req.token = token;
  next();
};

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'auth',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;