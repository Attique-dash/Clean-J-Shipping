import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as packageController from '../../controllers/customer/packageController';

const router = Router();

// All package routes require authentication
router.use(authenticate);

// Get customer's packages
router.get('/', validatePagination, asyncHandler(packageController.getCustomerPackages));
router.get('/:id', validateMongoId, asyncHandler(packageController.getPackageById));
router.get('/tracking/:trackingNumber', asyncHandler(packageController.trackPackage));

// Package operations
router.post('/:id/report-issue', validateMongoId, asyncHandler(packageController.reportIssue));
router.get('/:id/history', validateMongoId, asyncHandler(packageController.getPackageHistory));

export default router;
