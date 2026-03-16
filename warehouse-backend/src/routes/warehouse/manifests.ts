import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { combinedAuth } from '../../middleware/apiKeyAuth';
import { validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as manifestController from '../../controllers/warehouse/manifestController';

const router = Router();

// All warehouse manifest routes require authentication (JWT or API Key)
router.use(combinedAuth);

/**
 * @swagger
 * /api/warehouse/manifests:
 *   get:
 *     summary: Get all manifests
 *     description: Retrieves a list of all manifests with pagination. Supports both JWT authentication (staff) and API key authentication (KCD Logistics).
 *     tags: [Warehouse Manifests]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Manifests retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', validatePagination, asyncHandler(manifestController.getManifests));

/**
 * @swagger
 * /api/warehouse/manifests/{id}:
 *   get:
 *     summary: Get manifest by ID
 *     description: Retrieves a specific manifest by its ID. Supports both JWT authentication (staff) and API key authentication (KCD Logistics).
 *     tags: [Warehouse Manifests]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Manifest ID
 *     responses:
 *       200:
 *         description: Manifest retrieved successfully
 *       404:
 *         description: Manifest not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', validateMongoId, asyncHandler(manifestController.getManifestById));

/**
 * @swagger
 * /api/warehouse/manifests:
 *   post:
 *     summary: Create new manifest
 *     description: Creates a new manifest in the system. Supports both JWT authentication (staff) and API key authentication (KCD Logistics).
 *     tags: [Warehouse Manifests]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       201:
 *         description: Manifest created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', asyncHandler(manifestController.createManifest));

/**
 * @swagger
 * /api/warehouse/manifests/{id}:
 *   put:
 *     summary: Update manifest
 *     description: Updates an existing manifest. This is the primary endpoint KCD uses to update manifest information. Supports both JWT authentication (staff) and API key authentication (KCD Logistics).
 *     tags: [Warehouse Manifests]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Manifest ID
 *     responses:
 *       200:
 *         description: Manifest updated successfully
 *       404:
 *         description: Manifest not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', validateMongoId, asyncHandler(manifestController.updateManifest));

// Manifest operations
router.patch('/:id/start', validateMongoId, asyncHandler(manifestController.startManifest));
router.post('/:id/start', validateMongoId, asyncHandler(manifestController.startManifest));
router.patch('/:id/complete', validateMongoId, asyncHandler(manifestController.completeManifest));
router.post('/:id/complete', validateMongoId, asyncHandler(manifestController.completeManifest));
router.post('/:id/packages', validateMongoId, asyncHandler(manifestController.addPackageToManifest));
router.delete('/:id/packages/:packageId', validateMongoId, asyncHandler(manifestController.removePackageFromManifest));
router.post('/:id/packages/:packageId/deliver', validateMongoId, asyncHandler(manifestController.deliverPackageInManifest));

export default router;
