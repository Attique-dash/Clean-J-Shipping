import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validateCreateCustomer, validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as customerController from '../../controllers/warehouse/customerController';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

// Customer CRUD operations
router.get('/', validatePagination, asyncHandler(customerController.getCustomers));
router.get('/:id', validateMongoId, asyncHandler(customerController.getCustomerById));
router.post('/', authorize('admin', 'warehouse_staff'), validateCreateCustomer, asyncHandler(customerController.createCustomer));
router.put('/:id', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(customerController.updateCustomer));
router.delete('/:id', authorize('admin'), validateMongoId, asyncHandler(customerController.deleteCustomer));

// Customer search
router.get('/search/email/:email', asyncHandler(customerController.getCustomerByEmail));
router.get('/search/phone/:phone', asyncHandler(customerController.getCustomerByPhone));

// Customer packages
router.get('/:id/packages', validateMongoId, validatePagination, asyncHandler(customerController.getCustomerPackages));

export default router;
