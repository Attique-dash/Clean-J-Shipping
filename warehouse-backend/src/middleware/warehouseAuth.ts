import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../models/ApiKey';
import { errorResponse } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';

export interface WarehouseRequest extends Request {
  warehouse?: any;
}

export const authenticateWarehouse = async (req: WarehouseRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      errorResponse(res, 'API key is required', 401);
      return;
    }

    const key = await ApiKey.findOne({ key: apiKey, isActive: true }).populate('warehouseId');

    if (!key) {
      errorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
      return;
    }

    // Check if API key has expired
    if (key.expiresAt && key.expiresAt < new Date()) {
      errorResponse(res, 'API key has expired', 401);
      return;
    }

    // Update last used timestamp
    key.lastUsed = new Date();
    await key.save();

    req.warehouse = key.warehouseId;
    next();
  } catch (error) {
    errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 500);
  }
};

export const authorizeWarehouse = (...permissions: string[]) => {
  return (req: WarehouseRequest, res: Response, next: NextFunction): void => {
    if (!req.warehouse) {
      errorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
      return;
    }

    // Check if warehouse has required permissions
    const warehousePermissions = req.warehouse.permissions || [];
    const hasPermission = permissions.every(permission => warehousePermissions.includes(permission));

    if (!hasPermission) {
      errorResponse(res, ERROR_MESSAGES.FORBIDDEN, 403);
      return;
    }

    next();
  };
};
