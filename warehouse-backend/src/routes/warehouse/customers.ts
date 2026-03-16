import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as customerController from '../../controllers/warehouse/customerController';

const router = Router();

// All warehouse customer routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/warehouse/customers:
 *   get:
 *     summary: Get all customers
 *     description: Retrieves a paginated list of all customers in the system with filtering and search capabilities. Supports both JWT authentication (staff) and API key authentication (KCD Logistics).
 *     tags: [Warehouse Customers]
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
 *         description: Number of customers per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search customers by name, email, or user code
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, inactive]
 *         description: Filter by account status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, warehouse]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: List of customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 customers:
 *                   - id: "64a1b2c3d4e5f6789012345"
 *                     userCode: "CS-12345"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     email: "john.doe@example.com"
 *                     phone: "+1234567890"
 *                     role: "customer"
 *                     accountStatus: "active"
 *                     emailVerified: true
 *                     createdAt: "2024-01-10T08:30:00Z"
 *                     totalPackages: 15
 *                     lastActiveAt: "2024-01-15T14:20:00Z"
 *                 pagination:
 *                   currentPage: 1
 *                   totalPages: 8
 *                   totalItems: 156
 *                   hasNextPage: true
 *                   hasPrevPage: false
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
// Get All Customers (API SPEC) - authenticateWarehouse already applied via router.use()
router.get('/', 
  asyncHandler(customerController.getCustomers)
);

/**
 * @swagger
 * /api/warehouse/customers/{userCode}:
 *   get:
 *     summary: Get customer details by user code
 *     description: Retrieves detailed information about a specific customer using their unique user code. Includes customer profile, package history, and account statistics.
 *     tags: [Warehouse Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2}-\d{5}$'
 *         description: Customer user code - format XX-12345
 *         example: "CS-12345"
 *     responses:
 *       200:
 *         description: Customer details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "64a1b2c3d4e5f6789012345"
 *                 userCode: "CS-12345"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 phone: "+1234567890"
 *                 role: "customer"
 *                 accountStatus: "active"
 *                 emailVerified: true
 *                 createdAt: "2024-01-10T08:30:00Z"
 *                 lastActiveAt: "2024-01-15T14:20:00Z"
 *                 statistics:
 *                   totalPackages: 15
 *                   activePackages: 3
 *                   deliveredPackages: 12
 *                   totalSpent: 382.50
 *                   averageDeliveryTime: "2.5 days"
 *                 recentPackages:
 *                   - trackingNumber: "TRK123456789"
 *                     status: "in_transit"
 *                     createdAt: "2024-01-15T10:30:00Z"
 *                   - trackingNumber: "TRK123456788"
 *                     status: "delivered"
 *                     createdAt: "2024-01-12T09:15:00Z"
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Customer with user code CS-12345 not found"
 *       401:
 *         description: Unauthorized
 */
// Get Customer Details by userCode (API SPEC) - authenticateWarehouse already applied via router.use()
router.get('/:userCode', 
  asyncHandler(customerController.getCustomerByUserCode)
);

/**
 * @swagger
 * /api/warehouse/customers:
 *   delete:
 *     summary: Delete customer
 *     description: Permanently removes a customer account from the system. This action is irreversible and requires admin-level permissions. All associated packages will be archived.
 *     tags: [Warehouse Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userCode]
 *             properties:
 *               userCode:
 *                 type: string
 *                 pattern: '^[A-Z]{2}-\d{5}$'
 *                 description: Customer user code to delete
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for deletion - for audit trail
 *               confirmDeletion:
 *                 type: boolean
 *                 description: Must be true to confirm deletion
 *           example:
 *             userCode: "CS-12345"
 *             reason: "Customer requested account deletion per GDPR"
 *             confirmDeletion: true
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Customer CS-12345 deleted successfully"
 *               data:
 *                 deletedUserCode: "CS-12345"
 *                 deletedPackagesCount: 15
 *                 archivedPackagesCount: 15
 *                 deletedAt: "2024-01-15T16:30:00Z"
 *       404:
 *         description: Customer not found
 *       400:
 *         description: Invalid request - confirmation required
 *       403:
 *         description: Insufficient permissions to delete customers
 */
// Delete Customer (API SPEC) - authenticateWarehouse already applied via router.use()
router.delete('/', 
  asyncHandler(customerController.deleteCustomer)
);

export default router;