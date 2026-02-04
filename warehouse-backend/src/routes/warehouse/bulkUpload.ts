import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bulkUploadPackages, getBulkUploadTemplate, getBulkUploadHistory, uploadFile } from '../../controllers/warehouse/bulkUploadController';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Upload and process bulk packages
router.post('/packages', 
  uploadFile,
  bulkUploadPackages
);

// Get bulk upload template
router.get('/template', getBulkUploadTemplate);

// Get bulk upload history
router.get('/history', getBulkUploadHistory);

export default router;
