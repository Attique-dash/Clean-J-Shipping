import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as shippingAddressesController from '../../controllers/customer/ shippingAddressesController';

const router = Router();

// All routes require customer authentication
router.use(authenticate);

/**
 * GET /api/customer/shipping-addresses
 * Get all warehouse shipping addresses (Air, Sea, China)
 * Response includes customer's mailbox number
 */
router.get('/', 
  asyncHandler(shippingAddressesController.getShippingAddresses)
);

/**
 * GET /api/customer/shipping-addresses/:type
 * Get specific warehouse address by type
 * Params: type = 'air' | 'sea' | 'china'
 */
router.get('/:type', 
  asyncHandler(shippingAddressesController.getShippingAddressByType)
);

/**
 * GET /api/customer/my-shipping-info
 * Get complete shipping information for customer dashboard
 * Includes all addresses formatted with customer's mailbox number
 */
router.get('/info/complete', 
  asyncHandler(shippingAddressesController.getMyShippingInfo)
);

export default router;