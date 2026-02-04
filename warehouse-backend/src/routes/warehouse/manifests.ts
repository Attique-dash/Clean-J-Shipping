import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as manifestController from '../../controllers/warehouse/manifestController';

const router = Router();

// All manifest routes require authentication
router.use(authenticate);

// Manifest CRUD operations
router.get('/', validatePagination, asyncHandler(manifestController.getManifests));
router.get('/:id', validateMongoId, asyncHandler(manifestController.getManifestById));
router.post('/', authorize('admin', 'warehouse_staff'), asyncHandler(manifestController.createManifest));
router.put('/:id', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(manifestController.updateManifest));
router.delete('/:id', authorize('admin'), validateMongoId, asyncHandler(manifestController.deleteManifest));

// Manifest operations
router.patch('/:id/start', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(manifestController.startManifest));
router.patch('/:id/complete', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(manifestController.completeManifest));
router.post('/:id/packages', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(manifestController.addPackageToManifest));
router.delete('/:id/packages/:packageId', authorize('admin', 'warehouse_staff'), asyncHandler(manifestController.removePackageFromManifest));

export default router;
