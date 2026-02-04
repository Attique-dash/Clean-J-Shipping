import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validateCreateInventory, validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as inventoryController from '../../controllers/warehouse/inventoryController';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

// Inventory CRUD operations
router.get('/', validatePagination, asyncHandler(inventoryController.getInventory));
router.get('/:id', validateMongoId, asyncHandler(inventoryController.getInventoryById));
router.post('/', authorize('admin', 'warehouse_staff'), validateCreateInventory, asyncHandler(inventoryController.createInventory));
router.put('/:id', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(inventoryController.updateInventory));
router.delete('/:id', authorize('admin'), validateMongoId, asyncHandler(inventoryController.deleteInventory));

// Inventory operations
router.post('/:id/adjust', authorize('admin', 'warehouse_staff'), validateMongoId, asyncHandler(inventoryController.adjustInventory));
router.get('/:id/transactions', validateMongoId, validatePagination, asyncHandler(inventoryController.getInventoryTransactions));
router.get('/low-stock', asyncHandler(inventoryController.getLowStockItems));

export default router;
