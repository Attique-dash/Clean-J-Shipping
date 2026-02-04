import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as profileController from '../../controllers/customer/profileController';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// Profile management
router.get('/', asyncHandler(profileController.getProfile));
router.put('/', asyncHandler(profileController.updateProfile));
router.put('/password', asyncHandler(profileController.updatePassword));
router.put('/preferences', asyncHandler(profileController.updatePreferences));
router.delete('/account', asyncHandler(profileController.deleteAccount));

// Profile verification
router.post('/verify-email', asyncHandler(profileController.verifyEmail));
router.post('/verify-phone', asyncHandler(profileController.verifyPhone));

export default router;
