import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { combinedAuth } from '../../middleware/apiKeyAuth';
import * as packageController from '../../controllers/warehouse/packageController';
import { validateAddPackage, validateUpdatePackage, validateUpdatePackageStatus } from '../../validators/packageValidators';
import { validateObjectId } from '../../middleware/validation';

const router = Router();

// All warehouse package routes require authentication (JWT or API Key)
router.use(combinedAuth);

/**
 * @swagger
 * /api/warehouse/packages:
 *   get:
 *     summary: Get all packages
 *     description: Retrieves a comprehensive list of all packages in the system with pagination, filtering, and sorting capabilities. Supports both JWT authentication (staff) and API key authentication (KCD Logistics).
 *     tags: [Warehouse Packages]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [received, in_transit, out_for_delivery, delivered, pending, customs, returned]
 *         description: Filter by package status
 *       - in: query
 *         name: serviceMode
 *         schema:
 *           type: string
 *           enum: [air, ocean, local]
 *         description: Filter by service mode
 *       - in: query
 *         name: warehouseLocation
 *         schema:
 *           type: string
 *         description: Filter by warehouse location
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter packages created after this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter packages created before this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of packages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 packages:
 *                   - id: "64a1b2c3d4e5f6789012345"
 *                     trackingNumber: "TRK123456789"
 *                     status: "in_transit"
 *                     serviceMode: "air"
 *                     weight: 2.5
 *                     warehouseLocation: "Newark, NJ"
 *                     createdAt: "2024-01-15T10:30:00Z"
 *                     estimatedDelivery: "2024-01-18T16:00:00Z"
 *                 pagination:
 *                   currentPage: 1
 *                   totalPages: 5
 *                   totalItems: 98
 *                   hasNextPage: true
 *                   hasPrevPage: false
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
// Get all packages - use search endpoint with no filters
router.get('/', packageController.searchPackages);

// All routes use combined authentication (JWT or API Key)

/**
 * @swagger
 * /api/warehouse/packages/search:
 *   get:
 *     summary: Search packages
 *     description: Advanced search functionality for packages with multiple filter criteria. Supports text search across tracking numbers, recipient names, and addresses.
 *     tags: [Warehouse Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Search query - searches tracking numbers, recipient names, addresses
 *         example: "TRK123456789"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [received, in_transit, out_for_delivery, delivered, pending, customs, returned]
 *         description: Filter by package status
 *       - in: query
 *         name: serviceMode
 *         schema:
 *           type: string
 *           enum: [air, ocean, local]
 *         description: Filter by service mode
 *       - in: query
 *         name: warehouseLocation
 *         schema:
 *           type: string
 *         description: Filter by warehouse location
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 packages:
 *                   - id: "64a1b2c3d4e5f6789012345"
 *                     trackingNumber: "TRK123456789"
 *                     status: "in_transit"
 *                     recipient:
 *                       name: "Jane Smith"
 *                       address: "123 Main St, New York, NY"
 *                     serviceMode: "air"
 *                     weight: 2.5
 *                 searchMeta:
 *                   query: "TRK123456789"
 *                   totalResults: 1
 *                   searchTime: "0.05s"
 *                 pagination:
 *                   currentPage: 1
 *                   totalPages: 1
 *                   totalItems: 1
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Unauthorized
 */
// Search/List Packages (Paginated + Filtered) - API SPEC
router.get('/search', 
  packageController.searchPackages
);

/**
 * @swagger
 * /api/warehouse/packages/{id}:
 *   get:
 *     summary: Get single package
 *     description: Retrieves detailed information about a specific package by its ID. Includes complete package details, tracking history, and current status.
 *     tags: [Warehouse Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Package MongoDB ID
 *     responses:
 *       200:
 *         description: Package details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "64a1b2c3d4e5f6789012345"
 *                 trackingNumber: "TRK123456789"
 *                 status: "in_transit"
 *                 serviceMode: "air"
 *                 weight: 2.5
 *                 dimensions:
 *                   length: 30
 *                   width: 20
 *                   height: 15
 *                   unit: "cm"
 *                 shipper: "John Doe"
 *                 recipient:
 *                   name: "Jane Smith"
 *                   email: "jane.smith@example.com"
 *                   phone: "+1234567890"
 *                   address: "123 Main St, New York, NY 10001"
 *                 warehouseLocation: "Newark, NJ"
 *                 customsRequired: false
 *                 shippingCost: 25.50
 *                 paymentStatus: "paid"
 *                 createdAt: "2024-01-15T10:30:00Z"
 *                 updatedAt: "2024-01-15T14:20:00Z"
 *       404:
 *         description: Package not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', 
  validateObjectId('id'),
  packageController.getPackageById
);


/**
 * @swagger
 * /api/warehouse/packages/add:
 *   post:
 *     summary: Add new package
 *     description: Creates a new package in the system with complete details including sender, recipient, dimensions, and shipping information. Supports both JWT authentication (staff) and API key authentication (KCD Logistics).
 *     tags: [Warehouse Packages]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Package'
 *           example:
 *             trackingNumber: "TRK123456789"
 *             userCode: "CS-12345"
 *             userId: "64a1b2c3d4e5f6789012346"
 *             weight: 2.5
 *             dimensions:
 *               length: 30
 *               width: 20
 *               height: 15
 *               unit: "cm"
 *             serviceMode: "air"
 *             shipper: "John Doe"
 *             senderName: "John Doe"
 *             senderEmail: "john.doe@example.com"
 *             senderPhone: "+1234567890"
 *             senderAddress: "456 Oak Ave, Los Angeles, CA"
 *             recipient:
 *               name: "Jane Smith"
 *               email: "jane.smith@example.com"
 *               phone: "+1234567890"
 *               address: "123 Main St, New York, NY 10001"
 *             warehouseLocation: "Newark, NJ"
 *             customsRequired: false
 *             shippingCost: 25.50
 *             isFragile: false
 *             isHazardous: false
 *             requiresSignature: true
 *     responses:
 *       201:
 *         description: Package created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Package created successfully"
 *               data:
 *                 id: "64a1b2c3d4e5f6789012345"
 *                 trackingNumber: "TRK123456789"
 *                 status: "received"
 *                 createdAt: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Invalid package data
 *       401:
 *         description: Unauthorized
 */
router.post('/add', 
  validateAddPackage,
  packageController.addPackage
);

/**
 * @swagger
 * /api/warehouse/packages/{id}:
 *   put:
 *     summary: Update package
 *     description: Updates existing package information. Only provided fields will be updated. Supports both JWT authentication (staff) and API key authentication (KCD Logistics).
 *     tags: [Warehouse Packages]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Package MongoDB ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 description: Package weight in kg
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   length: { type: number }
 *                   width: { type: number }
 *                   height: { type: number }
 *                   unit: { type: string, enum: ['cm', 'in'] }
 *               recipient:
 *                 type: object
 *                 properties:
 *                   name: { type: string }
 *                   email: { type: string, format: email }
 *                   phone: { type: string }
 *                   address: { type: string }
 *               warehouseLocation:
 *                 type: string
 *                 description: Current warehouse location
 *               specialInstructions:
 *                 type: string
 *                 maxLength: 500
 *                 description: Special handling instructions
 *           example:
 *             weight: 3.0
 *             warehouseLocation: "New York, NY"
 *             specialInstructions: "Handle with care - fragile items"
 *     responses:
 *       200:
 *         description: Package updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Package updated successfully"
 *               data:
 *                 id: "64a1b2c3d4e5f6789012345"
 *                 updatedAt: "2024-01-15T15:30:00Z"
 *       404:
 *         description: Package not found
 *       400:
 *         description: Invalid update data
 */
router.put('/:id', 
  validateObjectId('id'),
  validateUpdatePackage,
  packageController.updatePackage
);

/**
 * @swagger
 * /api/warehouse/packages/{id}:
 *   delete:
 *     summary: Delete package
 *     description: Removes a package from the system. This action is irreversible and requires admin-level permissions.
 *     tags: [Warehouse Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Package MongoDB ID
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Package deleted successfully"
 *       404:
 *         description: Package not found
 *       403:
 *         description: Insufficient permissions to delete package
 */
router.delete('/:id', 
  validateObjectId('id'),
  packageController.deletePackage
);

/**
 * @swagger
 * /api/warehouse/packages/{id}/status:
 *   post:
 *     summary: Update package status
 *     description: Updates the status of a package and automatically creates a tracking history entry. Supports location and description updates.
 *     tags: [Warehouse Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Package MongoDB ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [received, in_transit, out_for_delivery, delivered, pending, customs, returned]
 *                 description: New package status
 *               location:
 *                 type: string
 *                 maxLength: 200
 *                 description: Current location of the package
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Status change description or notes
 *               estimatedDelivery:
 *                 type: string
 *                 format: date-time
 *                 description: Updated estimated delivery time
 *           example:
 *             status: "out_for_delivery"
 *             location: "Local Distribution Center, New York, NY"
 *             description: "Package out for delivery to recipient"
 *             estimatedDelivery: "2024-01-16T18:00:00Z"
 *     responses:
 *       200:
 *         description: Package status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Package status updated successfully"
 *               data:
 *                 id: "64a1b2c3d4e5f6789012345"
 *                 status: "out_for_delivery"
 *                 location: "Local Distribution Center, New York, NY"
 *                 updatedAt: "2024-01-16T09:15:00Z"
 *       404:
 *         description: Package not found
 *       400:
 *         description: Invalid status transition
 */
router.post('/:id/status', 
  validateObjectId('id'),
  validateUpdatePackageStatus,
  packageController.updatePackageStatus
);

/**
 * @swagger
 * /api/warehouse/packages/bulk-upload:
 *   post:
 *     summary: Bulk upload packages
 *     description: Upload multiple packages at once using CSV or JSON format. Supports up to 1000 packages per batch.
 *     tags: [Warehouse Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV or JSON file containing package data
 *               format:
 *                 type: string
 *                 enum: [csv, json]
 *                 default: csv
 *                 description: File format
 *               validateOnly:
 *                 type: boolean
 *                 default: false
 *                 description: If true, only validates data without creating packages
 *           example:
 *             file: packages.csv
 *             format: csv
 *             validateOnly: false
 *     responses:
 *       200:
 *         description: Bulk upload completed
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Bulk upload completed successfully"
 *               data:
 *                 totalProcessed: 150
 *                 successful: 145
 *                 failed: 5
 *                 errors:
 *                   - row: 23
 *                     error: "Invalid email format"
 *                   - row: 67
 *                     error: "Missing required field: trackingNumber"
 *                 processingTime: "2.3s"
 *       400:
 *         description: Invalid file format or data
 *       413:
 *         description: File too large
 */
router.post('/bulk-upload', 
  packageController.bulkUploadPackages
);

export default router;