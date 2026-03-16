import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../models/ApiKey';
import { errorResponse } from '../utils/helpers';
import { logger } from '../utils/logger';
import { authenticate } from './auth';

// ─────────────────────────────────────────────────────────────
// validateApiKey middleware
// Place this on any route that KCD will call
// It reads the X-API-Key header and checks it against MongoDB
// ─────────────────────────────────────────────────────────────
export const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // KCD sends the key in this header
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        message: 'Missing X-API-Key header. KCD must send the API key in every request.',
      });
      return;
    }

    // Look up the key in the database
    const keyRecord = await ApiKey.findOne({ key: apiKey, isActive: true });

    if (!keyRecord) {
      res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key. Regenerate via POST /api/admin/api-keys/kcd.',
      });
      return;
    }

    // Check if key has expired (if expiry was set)
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        message: 'API key has expired. Generate a new one via POST /api/admin/api-keys/kcd.',
      });
      return;
    }

    // Check if key can be used (using the model's method)
    if (!keyRecord.canUse()) {
      res.status(401).json({
        success: false,
        message: 'API key is inactive or expired.',
      });
      return;
    }

    // Track usage — update count and last used timestamp
    await ApiKey.findByIdAndUpdate(keyRecord._id, {
      $inc: { usageCount: 1 },
      lastUsed: new Date(),
    });

    // Attach key info to request for use in controllers
    (req as any).apiKey = keyRecord;

    next();
  } catch (error) {
    console.error('validateApiKey error:', error);
    errorResponse(res, 'API key validation failed', 500);
  }
};

// ─────────────────────────────────────────────────────────────
// combinedAuth middleware
// Accepts EITHER a JWT bearer token OR an X-API-Key
// Use this on warehouse endpoints that both staff AND KCD call
// ─────────────────────────────────────────────────────────────
export const combinedAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKeyHeader = req.headers['x-api-key'] as string;
  const authHeader   = req.headers['authorization'];

  // If X-API-Key is present → use API key auth (KCD requests)
  if (apiKeyHeader) {
    return validateApiKey(req, res, next);
  }

  // If Authorization Bearer is present → use JWT auth (your staff/admin)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use static import instead of dynamic import for better performance
    return authenticate(req, res, next);
  }

  // Neither provided
  res.status(401).json({
    success: false,
    message: 'Authentication required. Provide either Authorization: Bearer <token> or X-API-Key header.',
  });
};
