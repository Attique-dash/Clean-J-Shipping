import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { ApiKey } from '../models/ApiKey';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { errorResponse } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';

export interface WarehouseRequest extends Request {
  user?: any;
  warehouse?: any;
  apiKey?: any;
}

/**
 * Warehouse-only authentication middleware
 * Accepts EITHER a JWT Bearer token from warehouse staff/admin OR an X-API-Key from KCD Logistics
 * Ensures only authorized roles can access warehouse endpoints
 */
export const authenticateWarehouse = async (req: WarehouseRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string;
    const authHeader = req.headers['authorization'];

    // --- Try API Key first (KCD path) ---
    if (apiKeyHeader) {
      const apiKey = await ApiKey.findOne({ key: apiKeyHeader, isActive: true }).populate('warehouseId');

      if (!apiKey) {
        errorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
        return;
      }

      // Check if API key has expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        errorResponse(res, 'API key has expired', 401);
        return;
      }

      // Update last used timestamp
      apiKey.lastUsed = new Date();
      await apiKey.save();

      req.user = { role: 'warehouse', _id: apiKey.createdBy, isApiKey: true };
      req.apiKey = apiKey;
      req.warehouse = apiKey.warehouseId;
      return next();
    }

    // --- Try JWT (warehouse staff/admin path) ---
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.userId).select('-passwordHash');

      if (!user || user.accountStatus !== 'active') {
        errorResponse(res, 'User not found or inactive', 401);
        return;
      }

      // Verify user has warehouse or admin role
      if (user.role !== 'warehouse' && user.role !== 'admin') {
        errorResponse(res, 'Access denied. Warehouse or admin role required.', 403);
        return;
      }

      req.user = user;
      return next();
    }

    errorResponse(res, 'Authentication required. Provide a Bearer token or X-API-Key header.', 401);
  } catch (error) {
    logger.error('authenticateWarehouse error:', error);
    errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 500);
  }
};

/**
 * Warehouse-only role authorization
 * Ensures the authenticated user has warehouse privileges (allows admins too)
 */
export const authorizeWarehouse = (...permissions: string[]) => {
  return (req: WarehouseRequest, res: Response, next: NextFunction): void => {
    if (!req.user && !req.warehouse) {
      errorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
      return;
    }

    // For API key authentication
    if (req.warehouse) {
      const warehousePermissions = req.warehouse.permissions || [];
      const hasPermission = permissions.every(permission => warehousePermissions.includes(permission));

      if (!hasPermission) {
        errorResponse(res, ERROR_MESSAGES.FORBIDDEN, 403);
        return;
      }
    }
    // For JWT authentication
    else if (req.user) {
      // Allow both warehouse staff and admins
      if (req.user.role !== 'warehouse' && req.user.role !== 'admin') {
        errorResponse(res, 'Access denied. Warehouse role required.', 403);
        return;
      }
    }

    next();
  };
};
