import { Router } from 'express';
import { authenticate, authenticateWarehouse } from '../../middleware/auth';
import * as customerController from '../../controllers/warehouse/customerController';

const router = Router();

// Get All Customers (API SPEC)
router.get('/', 
  authenticate || authenticateWarehouse, 
  customerController.getCustomers
);

// Get Customer Details by userCode (API SPEC)
router.get('/:userCode', 
  authenticate || authenticateWarehouse, 
  customerController.getCustomerByUserCode
);

// Delete Customer (API SPEC)
router.delete('/', 
  authenticate || authenticateWarehouse, 
  customerController.deleteCustomer
);

export default router;
