import { Router, Request, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiKey } from '../../models/ApiKey';

const router = Router();

// Temporary endpoint to get actual KCD API key value
router.get('/get-kcd-key', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Get the active API key but mask the actual key value
      const activeKey = await ApiKey.findOne({ 
        isActive: true,
        courierCode: { $exists: true }
      })
        .select('-key')  // Exclude the actual API key
        .sort({ createdAt: -1 });
      
      if (!activeKey) {
        res.status(404).json({
          success: false,
          message: 'No active KCD API key found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Active KCD API key info retrieved (key value masked for security)',
        data: {
          apiKey: '***MASKED***', // Mask the actual key
          courierCode: activeKey.courierCode,
          createdAt: activeKey.createdAt,
          expiresAt: activeKey.expiresAt,
          usageCount: activeKey.usageCount,
          lastUsed: activeKey.lastUsed,
          isActive: activeKey.isActive,
          note: 'API key value is masked for security. Use POST /api/admin/api-keys/kcd to generate a new key if you need the actual value.'
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get KCD API key',
        error: error.message
      });
    }
  })
);

export default router;
