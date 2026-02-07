import { Router } from 'express';
import { combinedAuth } from '../../middleware/combinedAuth';
import * as customerController from '../../controllers/warehouse/customerController';

const router = Router();

// Get All Customers (API SPEC)
router.get('/', 
  combinedAuth, 
  customerController.getCustomers
);

// Get Customer Details by userCode (API SPEC)
router.get('/:userCode', 
  combinedAuth, 
  customerController.getCustomerByUserCode
);

// Delete Customer (API SPEC)
router.delete('/', 
  combinedAuth, 
  customerController.deleteCustomer
);

export default router;