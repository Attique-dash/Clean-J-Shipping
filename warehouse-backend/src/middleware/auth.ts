import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../config/env';
import { errorResponse } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';

export interface AuthRequest extends Request {
  user?: IUser;
}

export { Response };

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      errorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      errorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
      return;
    }

    if (user.accountStatus !== 'active') {
      errorResponse(res, 'Account is not active', 403);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    errorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, 401);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      errorResponse(res, ERROR_MESSAGES.FORBIDDEN, 403);
      return;
    }

    next();
  };
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

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