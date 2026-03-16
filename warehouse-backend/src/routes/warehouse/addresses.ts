import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validateMongoId } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as shippingAddressSettingsController from '../../controllers/warehouse/shippingAddressSettingsController';

const router = Router();

// All addresses routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/warehouse/addresses:
 *   get:
 *     summary: Get all warehouse addresses
 *     description: Retrieve all warehouses with their complete address information including shipping method addresses
 *     tags: ['Warehouse']
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouse addresses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Warehouse'
 *       401:
 *         description: Unauthorized
 */
router.get('/', 
  asyncHandler(shippingAddressSettingsController.getShippingAddressesConfig)
);

/**
 * @swagger
 * /api/warehouse/addresses/{id}:
 *   get:
 *     summary: Get warehouse by ID
 *     description: Retrieve specific warehouse information with all address details
 *     tags: ['Warehouse']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     responses:
 *       200:
 *         description: Warehouse retrieved successfully
 *       404:
 *         description: Warehouse not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', 
  authenticate,
  validateMongoId,
  asyncHandler(shippingAddressSettingsController.getShippingAddressesConfig)
);

/**
 * @swagger
 * /api/warehouse/addresses/{id}/air:
 *   put:
 *     summary: Update warehouse air address
 *     description: Update the air shipping address for a specific warehouse
 *     tags: ['Warehouse']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [street, city, state, zipCode, country]
 *             properties:
 *               street:
 *                 type: string
 *                 description: Street address
 *               city:
 *                 type: string
 *                 description: City
 *               state:
 *                 type: string
 *                 description: State/Province
 *               zipCode:
 *                 type: string
 *                 description: Postal code
 *               country:
 *                 type: string
 *                 description: Country
 *     responses:
 *       200:
 *         description: Air address updated successfully
 *       404:
 *         description: Warehouse not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.put('/:id/air', 
  authenticate,
  authorize('admin', 'warehouse'),
  validateMongoId,
  asyncHandler(shippingAddressSettingsController.updateAirAddress)
);

/**
 * @swagger
 * /api/warehouse/addresses/{id}/sea:
 *   put:
 *     summary: Update warehouse sea address
 *     description: Update the sea shipping address for a specific warehouse
 *     tags: ['Warehouse']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [street, city, state, zipCode, country]
 *             properties:
 *               street:
 *                 type: string
 *                 description: Street address
 *               city:
 *                 type: string
 *                 description: City
 *               state:
 *                 type: string
 *                 description: State/Province
 *               zipCode:
 *                 type: string
 *                 description: Postal code
 *               country:
 *                 type: string
 *                 description: Country
 *     responses:
 *       200:
 *         description: Sea address updated successfully
 *       404:
 *         description: Warehouse not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.put('/:id/sea', 
  authenticate,
  authorize('admin', 'warehouse'),
  validateMongoId,
  asyncHandler(shippingAddressSettingsController.updateSeaAddress)
);

/**
 * @swagger
 * /api/warehouse/addresses/{id}/china:
 *   put:
 *     summary: Update warehouse china address
 *     description: Update the China shipping address for a specific warehouse
 *     tags: ['Warehouse']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [street, city, state, zipCode, country]
 *             properties:
 *               street:
 *                 type: string
 *                 description: Street address
 *               city:
 *                 type: string
 *                 description: City
 *               state:
 *                 type: string
 *                 description: State/Province
 *               zipCode:
 *                 type: string
 *                 description: Postal code
 *               country:
 *                 type: string
 *                 description: Country
 *     responses:
 *       200:
 *         description: China address updated successfully
 *       404:
 *         description: Warehouse not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.put('/:id/china', 
  authenticate,
  authorize('admin', 'warehouse'),
  validateMongoId,
  asyncHandler(shippingAddressSettingsController.updateChinaAddress)
);

export default router;
