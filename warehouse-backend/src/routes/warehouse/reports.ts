import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as settingsController from '../../controllers/warehouse/settingsController';

const router = Router();

// All reports routes require authentication
router.use(authenticate);

// Report generation
router.get('/packages', asyncHandler(settingsController.generatePackageReport));
router.get('/inventory', asyncHandler(settingsController.generateInventoryReport));
router.get('/customers', asyncHandler(settingsController.generateCustomerReport));
router.get('/financial', authorize('admin'), asyncHandler(settingsController.generateFinancialReport));
router.get('/performance', asyncHandler(settingsController.generatePerformanceReport));

export default router;
