import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../config/env';
import { errorResponse } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: IUser;
}

export { Response };

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Debug: Log all headers for troubleshooting
    logger.info('Auth middleware - All headers:', req.headers);
    logger.info('Auth middleware - Authorization header:', req.headers.authorization);

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.error('Missing Authorization header in request');
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        error: 'Missing Authorization header',
        hint: 'Include header: Authorization: <token> or Authorization: Bearer <token>',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Normalize header to string
    const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    logger.info('Auth middleware - Normalized header:', authHeaderStr);
    
    // Extract token (handle both "Bearer <token>" and just "<token>")
    let token: string;
    if (authHeaderStr.startsWith('Bearer ') || authHeaderStr.startsWith('bearer ')) {
      token = authHeaderStr.substring(7).trim();
      logger.info('Auth middleware - Extracted token (Bearer format):', token.substring(0, 20) + '...');
      // Remove "Bearer " prefix if it exists again (prevents double Bearer)
      if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
        token = token.substring(7).trim();
        logger.info('Auth middleware - Removed double Bearer, token:', token.substring(0, 20) + '...');
      }
    } else {
      token = authHeaderStr.trim();
      logger.info('Auth middleware - Extracted token (direct format):', token.substring(0, 20) + '...');
    }

    if (!token || token.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format. Please provide a valid token.',
        error: 'Empty token',
        hint: 'Token format: Authorization: <token> or Authorization: Bearer <token>',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found. The token is invalid or the user has been deleted.',
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (user.accountStatus !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact support to activate your account.',
        error: 'Account inactive',
        timestamp: new Date().toISOString()
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again to get a new token.',
        error: 'Token expired',
        timestamp: new Date().toISOString()
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token. Please provide a valid authentication token.',
        error: 'Invalid token',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Authentication failed. Please check your token and try again.',
        error: 'Authentication error',
        timestamp: new Date().toISOString()
      });
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please login first.',
        error: 'Not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. This endpoint requires one of the following roles: ${roles.join(', ')}. Your role: ${req.user.role}`,
        error: 'Insufficient permissions',
        requiredRoles: roles,
        yourRole: req.user.role,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    errorResponse(res, 'Admin access required', 403);
    return;
  }
  next();
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return next();
    }

    // Extract token properly (handle "Bearer <token>" format)
    let token = authHeader.trim();
    if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
      token = token.substring(7).trim();
      // Remove "Bearer " prefix if it exists again (prevents double Bearer)
      if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
        token = token.substring(7).trim();
      }
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const user = await User.findById(decoded.userId).select('-passwordHash');
      req.user = user || undefined;
    }

    next();
  } catch (error) {
    // Continue without authentication for optional routes
    next();
  }
};