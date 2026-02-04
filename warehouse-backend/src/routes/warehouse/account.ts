import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as settingsController from '../../controllers/warehouse/settingsController';

const router = Router();

// All account routes require authentication
router.use(authenticate);

// Account management
router.get('/profile', asyncHandler(settingsController.getProfile));
router.put('/profile', asyncHandler(settingsController.updateProfile));
router.put('/password', asyncHandler(settingsController.updatePassword));
router.get('/activity', asyncHandler(settingsController.getActivityLog));

export default router;
