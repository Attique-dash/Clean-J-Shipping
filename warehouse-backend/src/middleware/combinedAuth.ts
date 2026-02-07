import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from './auth';
import { authenticateWarehouse, WarehouseRequest } from './warehouseAuth';

/**
 * Combined authentication middleware that accepts either:
 * - JWT Bearer token (for logged-in users)
 * - X-API-Key header (for warehouse API integrations)
 */
export const combinedAuth = async (req: AuthRequest & WarehouseRequest, res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.header('X-API-Key');
  
  if (apiKey) {
    // Use warehouse authentication
    return authenticateWarehouse(req, res, next);
  } else {
    // Use regular JWT authentication
    return authenticate(req, res, next);
  }
};