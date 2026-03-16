import { Router, Response } from 'express';
import { authKcdApiKey, AuthenticatedKcdRequest } from '../middleware/authKcd';
import { User } from '../models/User';
import { Package } from '../models/Package';

const router = Router();

// ─────────────────────────────────────────────────────────────
// POST /api/Courier/TestCourierProvider
// Test endpoint for KCD portal validation
// ─────────────────────────────────────────────────────────────
router.post('/TestCourierProvider',
  authKcdApiKey,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const authenticatedCourierCode = req.courierCode;
      
      res.json({
        success: true,
        message: 'Courier API connection test successful',
        data: {
          courierCode: authenticatedCourierCode,
          timestamp: new Date().toISOString(),
          server: 'Clean J Shipping Backend',
          version: '1.0.0',
          status: 'connected',
          apiToken: req.headers.authorization?.replace('Bearer ', '') || req.headers['x-api-key'] as string
        }
      });
    } catch (error: any) {
      console.error('Courier test endpoint error:', error);
      res.status(500).json({
        success: false,
        message: 'Courier test endpoint failed',
        error: error.message
      });
    }
  }
);

export default router;
