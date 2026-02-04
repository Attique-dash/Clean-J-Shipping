import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { authenticateWarehouse } from '../../middleware/warehouseAuth';
import { validateCreatePackage, validateUpdatePackage, validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as packageController from '../../controllers/warehouse/packageController';

const router = Router();

// All package routes require authentication
router.use(authenticate);

// Package CRUD operations
router.get('/', validatePagination, asyncHandler(packageController.getPackages));
router.get('/:id', validateMongoId, asyncHandler(packageController.getPackageById));
router.post('/', authorize('admin', 'warehouse_staff'), validateCreatePackage, asyncHandler(packageController.createPackage));
router.put('/:id', authorize('admin', 'warehouse_staff'), validateMongoId, validateUpdatePackage, asyncHandler(packageController.updatePackage));
router.delete('/:id', authorize('admin'), validateMongoId, asyncHandler(packageController.deletePackage));

// Package status updates
router.patch('/:id/status', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(packageController.updatePackageStatus));
router.post('/:id/tracking', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(packageController.addTrackingUpdate));

// Package search and filtering
router.get('/search/tracking/:trackingNumber', asyncHandler(packageController.getPackageByTrackingNumber));
router.get('/filter/status/:status', validatePagination, asyncHandler(packageController.getPackagesByStatus));
router.get('/filter/customer/:customerId', validatePagination, asyncHandler(packageController.getPackagesByCustomer));

// Package operations
router.post('/:id/manifest', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(packageController.addToManifest));
router.delete('/:id/manifest', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(packageController.removeFromManifest));

export default router;
