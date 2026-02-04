import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { 
  getStaff, 
  getStaffById, 
  createStaff, 
  updateStaff, 
  deleteStaff, 
  resetStaffPassword, 
  toggleStaffStatus,
  getStaffPermissions,
  getStaffActivity
} from '../../controllers/warehouse/staffController';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Staff management routes
router.get('/', getStaff);
router.get('/permissions', getStaffPermissions);
router.get('/:id', getStaffById);
router.get('/:id/activity', getStaffActivity);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

// Staff specific actions
router.post('/:id/reset-password', resetStaffPassword);
router.patch('/:id/toggle-status', toggleStaffStatus);

export default router;
