import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as settingsController from '../../controllers/warehouse/settingsController';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// System settings (admin only)
router.get('/system', authorize('admin'), asyncHandler(settingsController.getSystemSettings));
router.put('/system', authorize('admin'), asyncHandler(settingsController.updateSystemSettings));

// Warehouse settings
router.get('/warehouse', asyncHandler(settingsController.getWarehouseSettings));
router.put('/warehouse', authorize('admin', 'warehouse_staff'), asyncHandler(settingsController.updateWarehouseSettings));

// Notification settings
router.get('/notifications', asyncHandler(settingsController.getNotificationSettings));
router.put('/notifications', asyncHandler(settingsController.updateNotificationSettings));

export default router;
