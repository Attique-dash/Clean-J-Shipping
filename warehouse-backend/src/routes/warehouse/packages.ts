import { Router } from 'express';
import { authenticate, authenticateWarehouse } from '../../middleware/auth';
import * as packageController from '../../controllers/warehouse/packageController';

const router = Router();

// Get All Packages (Paginated + Filtered) - API SPEC
router.get('/search', 
  authenticate || authenticateWarehouse, 
  packageController.searchPackages
);

// Get Single Package - API SPEC
router.get('/:id', 
  authenticate || authenticateWarehouse, 
  packageController.getPackageById
);

// Add New Package - API SPEC
router.post('/add', 
  authenticate || authenticateWarehouse, 
  packageController.addPackage
);

// Update Package - API SPEC
router.put('/:id', 
  authenticate || authenticateWarehouse, 
  packageController.updatePackage
);

// Delete Package - API SPEC
router.delete('/:id', 
  authenticate || authenticateWarehouse, 
  packageController.deletePackage
);

// Update Package Status - API SPEC
router.post('/:id/status', 
  authenticate || authenticateWarehouse, 
  packageController.updatePackageStatus
);

// Bulk Upload Packages - API SPEC
router.post('/bulk-upload', 
  authenticate || authenticateWarehouse, 
  packageController.bulkUploadPackages
);

export default router;
