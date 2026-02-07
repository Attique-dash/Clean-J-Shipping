import { Router } from 'express';
import { combinedAuth } from '../../middleware/combinedAuth';
import * as packageController from '../../controllers/warehouse/packageController';

const router = Router();

// All routes use combined authentication (JWT or API Key)

// Search/List Packages (Paginated + Filtered) - API SPEC
router.get('/search', 
  combinedAuth, 
  packageController.searchPackages
);

// Get Single Package - API SPEC
router.get('/:id', 
  combinedAuth, 
  packageController.getPackageById
);

// Add New Package - API SPEC
router.post('/add', 
  combinedAuth, 
  packageController.addPackage
);

// Update Package - API SPEC
router.put('/:id', 
  combinedAuth, 
  packageController.updatePackage
);

// Delete Package - API SPEC
router.delete('/:id', 
  combinedAuth, 
  packageController.deletePackage
);

// Update Package Status - API SPEC
router.post('/:id/status', 
  combinedAuth, 
  packageController.updatePackageStatus
);

// Bulk Upload Packages - API SPEC
router.post('/bulk-upload', 
  combinedAuth, 
  packageController.bulkUploadPackages
);

export default router;