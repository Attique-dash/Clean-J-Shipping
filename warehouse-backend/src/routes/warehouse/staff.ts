import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
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

// Apply authentication and role authorization to all routes
router.use(authenticate);
router.use(authorize('warehouse', 'admin'));

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
