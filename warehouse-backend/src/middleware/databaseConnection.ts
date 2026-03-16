import { Request, Response, NextFunction } from 'express';
import { connectDatabase } from '../config/database';
import { logger } from '../utils/logger';

export const ensureDatabaseConnection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only connect to database if not in Vercel environment or if explicitly needed
    if (process.env.VERCEL === '1') {
      // In Vercel serverless, connect on-demand for API routes
      await connectDatabase();
    }
    next();
  } catch (error) {
    logger.error('Database connection middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
};
