import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as packageController from '../../controllers/customer/packageController';

const router = Router();

/**
 * @swagger
 * /api/customer/packages/tracking/{trackingNumber}:
 *   get:
 *     summary: Track package by tracking number
 *     description: Provides real-time tracking information for a package using its tracking number. This endpoint is publicly accessible and does not require authentication.
 *     tags: [Customer Packages]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z0-9]{8,20}$'
 *         description: Package tracking number (8-20 alphanumeric characters)
 *         example: "TRK123456789"
 *     responses:
 *       200:
 *         description: Package tracking information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 trackingNumber: "TRK123456789"
 *                 status: "in_transit"
 *                 currentLocation: "Distribution Center, Newark, NJ"
 *                 estimatedDelivery: "2024-01-18T16:00:00Z"
 *                 progress: 65
 *                 trackingHistory:
 *                   - timestamp: "2024-01-15T10:30:00Z"
 *                     status: "received"
 *                     location: "Origin Facility, Los Angeles, CA"
 *                     description: "Package received at origin facility"
 *                   - timestamp: "2024-01-15T14:20:00Z"
 *                     status: "in_transit"
 *                     location: "Distribution Center, Newark, NJ"
 *                     description: "Package in transit to destination"
 *       404:
 *         description: Tracking number not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Invalid tracking number"
 */
// Public tracking endpoint - must be before auth middleware
router.get('/tracking/:trackingNumber', asyncHandler(packageController.trackPackage));

// All other package routes require authentication AND customer role
router.use(authenticate);
router.use(authorize('customer'));

/**
 * @swagger
 * /api/customer/packages:
 *   get:
 *     summary: Get customer's packages
 *     description: Retrieves a paginated list of packages belonging to the authenticated customer. Supports filtering by status and sorting options.
 *     tags: [Customer Packages]
 *     security:
 *       - bearerAuth: []
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
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [received, in_transit, out_for_delivery, delivered, pending, customs, returned]
 *         description: Filter packages by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, trackingNumber]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of customer's packages
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
 *                     weight: 2.5
 *                     destination: "123 Main St, New York, NY"
 *                     createdAt: "2024-01-15T10:30:00Z"
 *                     estimatedDelivery: "2024-01-18T16:00:00Z"
 *                 pagination:
 *                   currentPage: 1
 *                   totalPages: 3
 *                   totalItems: 25
 *                   hasNextPage: true
 *                   hasPrevPage: false
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Authentication required"
 */
// Get customer's packages
router.get('/', validatePagination, asyncHandler(packageController.getCustomerPackages));

/**
 * @swagger
 * /api/customer/packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     description: Retrieves detailed information about a specific package belonging to the authenticated customer.
 *     tags: [Customer Packages]
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
 *         description: Package details
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
 *                 weight: 2.5
 *                 dimensions:
 *                   length: 30
 *                   width: 20
 *                   height: 15
 *                   unit: "cm"
 *                 serviceMode: "air"
 *                 shipper: "John Doe"
 *                 recipient:
 *                   name: "Jane Smith"
 *                   email: "jane.smith@example.com"
 *                   phone: "+1234567890"
 *                   address: "123 Main St, New York, NY 10001"
 *                 currentLocation: "Distribution Center, Newark, NJ"
 *                 trackingHistory:
 *                   - timestamp: "2024-01-15T10:30:00Z"
 *                     status: "received"
 *                     location: "Origin Facility"
 *                   - timestamp: "2024-01-15T14:20:00Z"
 *                     status: "in_transit"
 *                     location: "Distribution Center, Newark, NJ"
 *                 estimatedDelivery: "2024-01-18T16:00:00Z"
 *       404:
 *         description: Package not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Package not found or access denied"
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', validateMongoId, asyncHandler(packageController.getPackageById));


/**
 * @swagger
 * /api/customer/packages/{id}/report-issue:
 *   post:
 *     summary: Report an issue with a package
 *     description: Allows customers to report issues such as damage, missing items, or delivery problems with their packages.
 *     tags: [Customer Packages]
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
 *             required: [issueType, description]
 *             properties:
 *               issueType:
 *                 type: string
 *                 enum: [damaged, missing_item, late_delivery, wrong_address, other]
 *                 description: Type of issue
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Detailed description of the issue
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 description: Issue priority
 *           example:
 *             issueType: "damaged"
 *             description: "Package arrived with visible damage to the outer box. Inner contents may be affected."
 *             priority: "high"
 *     responses:
 *       200:
 *         description: Issue reported successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Issue reported successfully. Reference #ISS123456"
 *               data:
 *                 issueId: "ISS123456"
 *                 status: "under_review"
 *                 estimatedResolution: "2024-01-20T17:00:00Z"
 *       404:
 *         description: Package not found
 *       400:
 *         description: Invalid issue data
 */
router.post('/:id/report-issue', validateMongoId, asyncHandler(packageController.reportIssue));

/**
 * @swagger
 * /api/customer/packages/{id}/history:
 *   get:
 *     summary: Get package tracking history
 *     description: Retrieves complete tracking history and status changes for a specific package.
 *     tags: [Customer Packages]
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
 *         description: Package tracking history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 packageId: "64a1b2c3d4e5f6789012345"
 *                 trackingNumber: "TRK123456789"
 *                 history:
 *                   - timestamp: "2024-01-15T10:30:00Z"
 *                     status: "received"
 *                     location: "Origin Facility, Los Angeles, CA"
 *                     description: "Package received at origin facility"
 *                     updatedBy: "system"
 *                   - timestamp: "2024-01-15T14:20:00Z"
 *                     status: "in_transit"
 *                     location: "Distribution Center, Newark, NJ"
 *                     description: "Package departed origin facility"
 *                     updatedBy: "staff123"
 *                   - timestamp: "2024-01-16T09:15:00Z"
 *                     status: "out_for_delivery"
 *                     location: "Local Distribution Center, New York, NY"
 *                     description: "Package out for delivery"
 *                     updatedBy: "driver456"
 *       404:
 *         description: Package not found
 */
router.get('/:id/history', validateMongoId, asyncHandler(packageController.getPackageHistory));

export default router;
