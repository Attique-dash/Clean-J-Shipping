import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as analyticsController from '../../controllers/warehouse/analyticsController';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Analytics endpoints
router.get('/dashboard', asyncHandler(analyticsController.getDashboardStats));
router.get('/packages', asyncHandler(analyticsController.getPackageAnalytics));
router.get('/inventory', asyncHandler(analyticsController.getInventoryAnalytics));
router.get('/customers', asyncHandler(analyticsController.getCustomerAnalytics));
router.get('/revenue', asyncHandler(analyticsController.getRevenueAnalytics));
router.get('/performance', asyncHandler(analyticsController.getPerformanceMetrics));

export default router;
