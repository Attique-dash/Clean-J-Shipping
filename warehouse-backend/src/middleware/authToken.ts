import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../config/env';
import { errorResponse } from '../utils/helpers';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Check multiple possible header locations for the token
    let token: string | undefined;

    // 1. Check Authorization header (with or without Bearer prefix)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      
      if (authHeaderStr.startsWith('Bearer ') || authHeaderStr.startsWith('bearer ')) {
        token = authHeaderStr.substring(7).trim();
      } else {
        token = authHeaderStr.trim();
      }
    }

    // 2. Check x-auth-token header
    if (!token && req.headers['x-auth-token']) {
      const xAuthToken = req.headers['x-auth-token'];
      token = Array.isArray(xAuthToken) ? xAuthToken[0] : xAuthToken;
      token = token.trim();
    }

    // 3. Check query parameter (for testing)
    if (!token && req.query.token) {
      token = req.query.token as string;
      token = token.trim();
    }

    logger.info('Auth token middleware - Token sources checked:', {
      authHeader: !!authHeader,
      xAuthToken: !!req.headers['x-auth-token'],
      queryToken: !!req.query.token,
      tokenFound: !!token
    });

    if (!token || token.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        error: 'Missing token',
        hint: 'Include token in Authorization header (Bearer <token> or just <token>), x-auth-token header, or ?token= query parameter',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify JWT token
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
    logger.info(`User authenticated via token: ${user.email} (${user.role})`);
    next();

  } catch (error: any) {
    logger.error('Token authentication error:', error);
    
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

export const authorizeCustomer = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.',
      error: 'Not authenticated',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.user.role !== 'customer') {
    res.status(403).json({
      success: false,
      message: 'Access denied. This endpoint requires customer role.',
      error: 'Insufficient permissions',
      requiredRole: 'customer',
      yourRole: req.user.role,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};
