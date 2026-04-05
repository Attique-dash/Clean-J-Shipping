import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateMongoId, validatePagination } from '../utils/validators';
import { asyncHandler } from '../middleware/errorHandler';
import * as adminController from '../controllers/adminController';
import apiKeyRoutes from './admin/apiKeys';
import getKcdKeyRoute from './admin/get-kcd-key';

const router = Router();

/**
 * @swagger
 * /api/admin/customers:
 *   get:
 *     summary: Get all customers (admin only)
 *     description: Retrieves a comprehensive list of all customers in the system with pagination and search capabilities. Requires admin privileges.
 *     tags: [Admin]
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
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query for name, email, or user code
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/customers', 
  authenticate, 
  authorize('admin'), 
  validatePagination, 
  asyncHandler(adminController.getAllCustomers)
);

/**
 * @swagger
 * /api/admin/customers/{id}:
 *   get:
 *     summary: Get customer by ID (admin only)
 *     description: Retrieves a specific customer by their ID. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.get('/customers/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId,
  asyncHandler(adminController.getCustomerById)
);

/**
 * @swagger
 * /api/admin/customers/{id}:
 *   put:
 *     summary: Update customer (admin only)
 *     description: Updates a specific customer's information. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Customer's first name
 *               lastName:
 *                 type: string
 *                 description: Customer's last name
 *               phone:
 *                 type: string
 *                 description: Customer's phone number
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                 description: Customer's address
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.put('/customers/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId,
  asyncHandler(adminController.updateCustomer)
);

/**
 * @swagger
 * /api/admin/customers/{id}:
 *   delete:
 *     summary: Delete customer (admin only)
 *     description: Deletes a specific customer from the system. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.delete('/customers/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId,
  asyncHandler(adminController.deleteCustomer)
);


/**
 * @swagger
 * /api/admin/staff:
 *   get:
 *     summary: Get all warehouse staff (admin only)
 *     description: Retrieves a comprehensive list of all warehouse staff members with pagination and search capabilities. Requires admin privileges.
 *     tags: [Admin]
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
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query for staff name, email, or user code
 *     responses:
 *       200:
 *         description: Staff retrieved successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/staff', 
  authenticate, 
  authorize('admin'), 
  validatePagination, 
  asyncHandler(adminController.getAllStaff)
);

/**
 * @swagger
 * /api/admin/packages:
 *   get:
 *     summary: Get all packages (admin only)
 *     description: Retrieves a comprehensive list of all packages in the system with pagination, filtering, and search capabilities. Requires admin privileges.
 *     tags: [Admin]
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
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [received, in_transit, out_for_delivery, delivered, pending, customs, returned, at_warehouse, processing, ready_for_pickup]
 *         description: Filter by package status
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query for tracking number, description, shipper, or recipient
 *     responses:
 *       200:
 *         description: Packages retrieved successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/packages', 
  authenticate, 
  authorize('admin'), 
  validatePagination, 
  asyncHandler(adminController.getAllPackages)
);

/**
 * @swagger
 * /api/admin/packages/{id}:
 *   get:
 *     summary: Get package by ID (admin only)
 *     description: Retrieves a specific package by its ID. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package retrieved successfully
 *       404:
 *         description: Package not found
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.get('/packages/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId,
  asyncHandler(adminController.getPackageById)
);

/**
 * @swagger
 * /api/admin/packages/{id}:
 *   put:
 *     summary: Update package (admin only)
 *     description: Updates a specific package's information. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 description: Package description
 *               weight:
 *                 type: number
 *                 description: Package weight
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   length:
 *                     type: number
 *                   width:
 *                     type: number
 *                   height:
 *                     type: number
 *                 description: Package dimensions
 *               status:
 *                 type: string
 *                 enum: [received, in_transit, out_for_delivery, delivered, pending, customs, returned, at_warehouse, processing, ready_for_pickup]
 *                 description: Package status
 *               recipientName:
 *                 type: string
 *                 description: Recipient name
 *               recipientAddress:
 *                 type: object
 *                 description: Recipient address
 *     responses:
 *       200:
 *         description: Package updated successfully
 *       404:
 *         description: Package not found
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.put('/packages/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId,
  asyncHandler(adminController.updatePackage)
);

/**
 * @swagger
 * /api/admin/packages/{id}:
 *   delete:
 *     summary: Delete package (admin only)
 *     description: Deletes a specific package from the system. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *       404:
 *         description: Package not found
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.delete('/packages/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId,
  asyncHandler(adminController.deletePackage)
);

/**
 * @swagger
 * /api/admin/packages:
 *   post:
 *     summary: Add Package (Admin)
 *     description: Add a new package to the warehouse system. Supports both Tasoko API fields and legacy fields. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: trackingNumber
 *         schema:
 *           type: string
 *         description: Package tracking number (optional - will be auto-generated if not provided)
 *       - in: query
 *         name: userCode
 *         schema:
 *           type: string
 *         description: Customer user code (required if TrackingNumber not provided)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               // Tasoko API fields
 *               PackageID:
 *                 type: string
 *                 description: UUID from Tasoko system
 *                 example: "83383d43-a368-4fc1-a216-9e54e8ae7227"
 *               CourierID:
 *                 type: string
 *                 description: UUID from Tasoko system
 *                 example: "15fff123-f237-4571-b92a-ae69427d7a56"
 *               TrackingNumber:
 *                 type: string
 *                 description: Alternative tracking number field
 *                 example: "DROPOFF-20240902-225642-547"
 *               ControlNumber:
 *                 type: string
 *                 description: EP0096513 format control number
 *                 example: "EP0096513"
 *               FirstName:
 *                 type: string
 *                 description: First name from Tasoko
 *                 example: "Courtney"
 *               LastName:
 *                 type: string
 *                 description: Last name from Tasoko
 *                 example: "Patterson"
 *               UserCode:
 *                 type: string
 *                 description: User code from Tasoko (REQUIRED)
 *                 example: "EPXUUYE"
 *               Weight:
 *                 type: number
 *                 description: Weight from Tasoko (REQUIRED)
 *                 example: 1
 *               Shipper:
 *                 type: string
 *                 description: Shipper from Tasoko
 *                 example: "Amazon"
 *               EntryStaff:
 *                 type: string
 *                 description: Staff who entered package
 *                 example: "warehouse_staff_01"
 *               EntryDate:
 *                 type: string
 *                 format: date
 *                 description: Entry date (date only)
 *                 example: "2024-09-02"
 *               EntryDateTime:
 *                 type: string
 *                 format: date-time
 *                 description: Full timestamp
 *                 example: "2024-09-02T21:55:51.1806146-05:00"
 *               Branch:
 *                 type: string
 *                 description: Branch name
 *                 example: "Down Town"
 *               Claimed:
 *                 type: boolean
 *                 description: Package claimed status
 *                 example: false
 *               APIToken:
 *                 type: string
 *                 description: API token reference
 *                 example: "<API-TOKEN>"
 *               ShowControls:
 *                 type: boolean
 *                 description: UI control flag
 *                 example: false
 *               ManifestCode:
 *                 type: string
 *                 description: Manifest code from Tasoko
 *                 example: ""
 *               CollectionCode:
 *                 type: string
 *                 description: Collection code from Tasoko
 *                 example: ""
 *               Description:
 *                 type: string
 *                 description: Description from Tasoko
 *                 example: "Merchandise from Amazon"
 *               HSCode:
 *                 type: string
 *                 description: HS tariff code
 *                 example: ""
 *               Unknown:
 *                 type: boolean
 *                 description: Unknown package flag
 *                 example: false
 *               AIProcessed:
 *                 type: boolean
 *                 description: AI processing status
 *                 example: false
 *               OriginalHouseNumber:
 *                 type: string
 *                 description: Original tracking
 *                 example: ""
 *               Cubes:
 *                 type: number
 *                 description: Volume in cubic units
 *                 example: 0
 *               Length:
 *                 type: number
 *                 description: Length from Tasoko
 *                 example: 0
 *               Width:
 *                 type: number
 *                 description: Width from Tasoko
 *                 example: 0
 *               Height:
 *                 type: number
 *                 description: Height from Tasoko
 *                 example: 0
 *               Pieces:
 *                 type: number
 *                 description: Number of pieces
 *                 example: 1
 *               Discrepancy:
 *                 type: boolean
 *                 description: Discrepancy flag
 *                 example: false
 *               DiscrepancyDescription:
 *                 type: string
 *                 description: Discrepancy description
 *                 example: ""
 *               ServiceTypeID:
 *                 type: string
 *                 description: Service type ID from Tasoko spec
 *                 example: ""
 *               HazmatCodeID:
 *                 type: string
 *                 description: Hazmat code ID from Tasoko spec
 *                 example: ""
 *               Coloaded:
 *                 type: boolean
 *                 description: Co-loading flag
 *                 example: false
 *               ColoadIndicator:
 *                 type: string
 *                 description: Co-load indicator
 *                 example: ""
 *               
 *               // Legacy fields (backward compatible)
 *               trackingNumber:
 *                 type: string
 *                 description: Legacy tracking number field
 *                 example: "TRK123456789"
 *               userCode:
 *                 type: string
 *                 description: Legacy user code field
 *                 example: "CLEAN-0001"
 *               weight:
 *                 type: number
 *                 description: Package weight
 *                 example: 5.5
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   length:
 *                     type: number
 *                     example: 10
 *                   width:
 *                     type: number
 *                     example: 5
 *                   height:
 *                     type: number
 *                     example: 3
 *                   unit:
 *                     type: string
 *                     enum: [cm, in]
 *                     example: "cm"
 *               serviceMode:
 *                 type: string
 *                 enum: [air, ocean, local]
 *                 example: "air"
 *               status:
 *                 type: string
 *                 enum: [received, in_transit, out_for_delivery, delivered, pending, customs, returned, at_warehouse, processing, ready_for_pickup]
 *                 example: "received"
 *               shipper:
 *                 type: string
 *                 example: "DHL"
 *               description:
 *                 type: string
 *                 example: "Electronics package"
 *               itemDescription:
 *                 type: string
 *                 example: "Laptop computer"
 *               senderName:
 *                 type: string
 *                 example: "John Smith"
 *               senderEmail:
 *                 type: string
 *                 example: "sender@example.com"
 *               senderPhone:
 *                 type: string
 *                 example: "+1234567890"
 *               senderAddress:
 *                 type: string
 *                 example: "123 Sender St, Sender City"
 *               senderCountry:
 *                 type: string
 *                 example: "USA"
 *               recipient:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Jane Doe"
 *                   email:
 *                     type: string
 *                     example: "jane@example.com"
 *                   shippingId:
 *                     type: string
 *                     example: "SHIP001"
 *                   phone:
 *                     type: string
 *                     example: "+0987654321"
 *                   address:
 *                     type: string
 *                     example: "456 Recipient Ave, Recipient City"
 *               warehouseLocation:
 *                 type: string
 *                 example: "New York Warehouse"
 *               warehouseAddress:
 *                 type: string
 *                 example: "789 Warehouse Blvd, NY"
 *               location:
 *                 type: string
 *                 example: "In transit - New York"
 *               estimatedDelivery:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-02-15T10:00:00Z"
 *               customsRequired:
 *                 type: boolean
 *                 example: false
 *               customsStatus:
 *                 type: string
 *                 enum: [not_required, pending, cleared]
 *                 example: "not_required"
 *               shippingCost:
 *                 type: number
 *                 example: 25.50
 *               totalAmount:
 *                 type: number
 *                 example: 125.50
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, partially_paid]
 *                 example: "pending"
 *               isFragile:
 *                 type: boolean
 *                 example: false
 *               isHazardous:
 *                 type: boolean
 *                 example: false
 *               requiresSignature:
 *                 type: boolean
 *                 example: true
 *               specialInstructions:
 *                 type: string
 *                 example: "Handle with care"
 *               notes:
 *                 type: string
 *                 example: "Customer requested expedited shipping"
 *               entryDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-02-10T09:00:00Z"
 *               itemValue:
 *                 type: number
 *                 example: 125.50
 *     responses:
 *       201:
 *         description: Package added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Package added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     package:
 *                       type: object
 *                       description: "Created package with all fields populated"
 *       400:
 *         description: Bad request - Invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/packages', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.addPackage)
);

/**
 * @swagger
 * /api/admin/inventory:
 *   get:
 *     summary: Get all inventory (admin only)
 *     description: Retrieves a comprehensive list of all inventory items with pagination, filtering, and search capabilities. Requires admin privileges.
 *     tags: [Admin]
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
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by inventory category
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query for item name, SKU, or description
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/inventory', 
  authenticate, 
  authorize('admin'), 
  validatePagination, 
  asyncHandler(adminController.getAllInventory)
);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system statistics (admin only)
 *     description: Retrieves comprehensive system statistics including user counts, package status, and inventory levels. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         customers:
 *                           type: integer
 *                         staff:
 *                           type: integer
 *                     packages:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         delivered:
 *                           type: integer
 *                     inventory:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         lowStock:
 *                           type: integer
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/stats', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.getSystemStats)
);


/**
 * @swagger
 * /api/admin/users/{userCode}/role:
 *   put:
 *     summary: Change user role (admin only)
 *     description: Changes the role of any user in the system. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2,6}-\d{3,4}$'
 *         description: User Code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, customer, warehouse]
 *                 description: New user role
 *                 example: "customer"
 *           example:
 *             role: "warehouse"
 *     responses:
 *       200:
 *         description: User role changed successfully
 *       400:
 *         description: Invalid role or request data
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 */
router.put('/users/:userCode/role', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.changeUserRole)
);

/**
 * @swagger
 * /api/admin/users/{userCode}/status:
 *   put:
 *     summary: Update user account status (admin only)
 *     description: Updates the account status and email verification status of any user. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2,6}-\d{3,4}$'
 *         description: User Code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountStatus:
 *                 type: string
 *                 enum: [pending, active, inactive]
 *                 description: Account status
 *                 example: "active"
 *               emailVerified:
 *                 type: boolean
 *                 description: Email verification status
 *                 example: true
 *           example:
 *             accountStatus: "active"
 *             emailVerified: true
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Invalid status or request data
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 */
router.put('/users/:userCode/status', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.updateUserStatus)
);

/**
 * @swagger
 * /api/admin/users/{userCode}:
 *   delete:
 *     summary: Delete user (admin only)
 *     description: Deletes a user (staff or customer) from the system. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2,6}-\d{3,4}$'
 *         description: User Code
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 */
router.delete('/users/:userCode', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.deleteUser)
);

/**
 * @swagger
 * /api/admin/staff:
 *   post:
 *     summary: Add new warehouse staff (admin only)
 *     description: Creates a new warehouse staff member with unique user code and assigned permissions. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Staff member's first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Staff member's last name
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff member's email address
 *                 example: "john.doe@warehouse.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Staff member's password
 *                 example: "SecurePassword123!"
 *               phone:
 *                 type: string
 *                 description: Staff member's phone number
 *                 example: "+1234567890"
 *               assignedWarehouse:
 *                 type: string
 *                 description: Warehouse ID to assign staff to
 *                 example: "507f1f77bcf86cd799439011"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permissions for the staff member
 *                 example: ["inventory_management", "package_processing"]
 *           example:
 *             firstName: "Jane"
 *             lastName: "Smith"
 *             email: "jane.smith@warehouse.com"
 *             password: "WarehousePass123!"
 *             phone: "+1234567890"
 *             permissions: ["inventory_management", "package_processing"]
 *     responses:
 *       201:
 *         description: Warehouse staff created successfully
 *       400:
 *         description: Invalid request data or missing required fields
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       409:
 *         description: User with this email already exists
 */
router.post('/staff', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.addWarehouseStaff)
);

/**
 * @swagger
 * /api/admin/shipping-addresses:
 *   get:
 *     summary: Get all shipping addresses (admin only)
 *     description: Retrieves all shipping addresses from all users with pagination and filtering capabilities. Requires admin privileges.
 *     tags: [Admin]
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
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [air, sea, china, standard]
 *         description: Filter by address type
 *     responses:
 *       200:
 *         description: Shipping addresses retrieved successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/shipping-addresses', 
  authenticate, 
  authorize('admin'), 
  validatePagination, 
  asyncHandler(adminController.getAllShippingAddresses)
);

/**
 * @swagger
 * /api/admin/shipping-address/{type}:
 *   put:
 *     summary: Update shipping address by type (admin only)
 *     description: Updates shipping addresses of a specific type for all users who have that address type. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [air, sea, china, standard]
 *         description: Address type to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [address]
 *             properties:
 *               address:
 *                 type: object
 *                 required: [street, city, state, zipCode]
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Main St"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   zipCode:
 *                     type: string
 *                     example: "10001"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *           example:
 *             address:
 *               street: "456 Oak Ave"
 *               city: "Los Angeles"
 *               state: "CA"
 *               zipCode: "90001"
 *               country: "USA"
 *     responses:
 *       200:
 *         description: Shipping addresses updated successfully
 *       400:
 *         description: Invalid request data or address type
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: No users found with specified address type
 */
router.put('/shipping-address/:type', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.updateShippingAddressByType)
);

// Mount temporary route to get actual KCD key
router.use('/api-keys', getKcdKeyRoute);

// Mount API key management routes
router.use('/api-keys', apiKeyRoutes);

/**
 * @swagger
 * /api/admin/warehouses:
 *   get:
 *     summary: Get all warehouses (admin only)
 *     description: Retrieves a comprehensive list of all warehouses in the system. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouses retrieved successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/warehouses', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.getAllWarehouses)
);

/**
 * @swagger
 * /api/admin/warehouses:
 *   post:
 *     summary: Create new warehouse (admin only)
 *     description: Creates a new warehouse with complete Air/Sea/China addresses. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - address
 *               - city
 *               - state
 *               - zipCode
 *               - country
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CLEAN"
 *               name:
 *                 type: string
 *                 example: "Clean J Shipping Main Warehouse"
 *               address:
 *                 type: string
 *                 example: "123 Shipping Lane"
 *               city:
 *                 type: string
 *                 example: "Karachi"
 *               state:
 *                 type: string
 *                 example: "Sindh"
 *               zipCode:
 *                 type: string
 *                 example: "75300"
 *               country:
 *                 type: string
 *                 example: "Pakistan"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               isDefault:
 *                 type: boolean
 *                 example: true
 *               airAddress:
 *                 type: object
 *               seaAddress:
 *                 type: object
 *               chinaAddress:
 *                 type: object
 *     responses:
 *       201:
 *         description: Warehouse created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Admin access required
 *       409:
 *         description: Warehouse code already exists
 */
router.post('/warehouses', 
  authenticate, 
  authorize('admin'), 
  asyncHandler(adminController.createWarehouse)
);

/**
 * @swagger
 * /api/admin/warehouses/{id}:
 *   put:
 *     summary: Update warehouse (admin only)
 *     description: Updates an existing warehouse's information. Requires admin privileges.
 *     tags: [Admin]
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
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               country:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               isDefault:
 *                 type: boolean
 *               airAddress:
 *                 type: object
 *               seaAddress:
 *                 type: object
 *               chinaAddress:
 *                 type: object
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 *       404:
 *         description: Warehouse not found
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.put('/warehouses/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId,
  asyncHandler(adminController.updateWarehouse)
);

/**
 * @swagger
 * /api/admin/warehouses/{id}:
 *   delete:
 *     summary: Delete warehouse (admin only)
 *     description: Deletes a warehouse from the system. Requires admin privileges.
 *     tags: [Admin]
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
 *         description: Warehouse deleted successfully
 *       404:
 *         description: Warehouse not found
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.delete('/warehouses/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId,
  asyncHandler(adminController.deleteWarehouse)
);

// Mount API key management routes
router.use('/api-keys', apiKeyRoutes);

// Mount KCD key retrieval route
router.use('/get-kcd-key', getKcdKeyRoute);

export default router;
