import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

const authService = new AuthService();

export interface AuthenticatedRequest extends Request {
  user?: any;
  token?: string;
}

export const authenticateToken = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
    }

    const user = await authService.verifyToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token verification failed',
      error: 'TOKEN_VERIFICATION_ERROR'
    });
  }
};

export const requireOwner = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Owner access required',
      error: 'OWNER_ACCESS_REQUIRED'
    });
  }
  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.canInviteUsers) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'ADMIN_ACCESS_REQUIRED'
    });
  }
  next();
};

export const requireActiveUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Active user account required',
      error: 'INACTIVE_USER'
    });
  }
  next();
};