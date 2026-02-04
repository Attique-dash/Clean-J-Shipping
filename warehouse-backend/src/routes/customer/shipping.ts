import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as shippingController from '../../controllers/customer/shippingController';

const router = Router();

// All shipping routes require authentication
router.use(authenticate);

// Shipping address CRUD
router.get('/addresses', validatePagination, asyncHandler(shippingController.getShippingAddresses));
router.get('/addresses/:id', validateMongoId, asyncHandler(shippingController.getShippingAddressById));
router.post('/addresses', asyncHandler(shippingController.createShippingAddress));
router.put('/addresses/:id', validateMongoId, asyncHandler(shippingController.updateShippingAddress));
router.delete('/addresses/:id', validateMongoId, asyncHandler(shippingController.deleteShippingAddress));

// Set default address
router.patch('/addresses/:id/default', validateMongoId, asyncHandler(shippingController.setDefaultAddress));

export default router;
