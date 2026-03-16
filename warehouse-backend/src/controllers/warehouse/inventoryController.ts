import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Inventory } from '../../models/Inventory';
import { InventoryTransaction } from '../../models/InventoryTransaction';
import { successResponse, errorResponse, getPaginationData, parseQueryParam } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.warehouseId) filter['location.warehouse'] = req.query.warehouseId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const inventory = await Inventory.find(filter)
      .populate('location.warehouse', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(filter);

    successResponse(res, {
      inventory,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting inventory:', error);
    errorResponse(res, 'Failed to get inventory');
  }
};

export const getInventoryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('location.warehouse', 'name code address');

    if (!item) {
      errorResponse(res, 'Inventory item not found', 404);
      return;
    }

    successResponse(res, item);
  } catch (error) {
    logger.error('Error getting inventory item:', error);
    errorResponse(res, 'Failed to get inventory item');
  }
};

export const createInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const inventoryData = {
      ...req.body,
      createdBy: req.user._id
    };

    const item = await Inventory.create(inventoryData);
    await item.populate('location.warehouse', 'name code');

    logger.info(`Inventory item created: ${item.sku}`);
    successResponse(res, item, 'Inventory item created successfully', 201);
  } catch (error: any) {
    logger.error('Error creating inventory item:', error);
    if (error.code === 11000) {
      errorResponse(res, 'SKU already exists', 409);
    } else {
      errorResponse(res, 'Failed to create inventory item');
    }
  }
};

export const updateInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('location.warehouse', 'name code');

    if (!item) {
      errorResponse(res, 'Inventory item not found', 404);
      return;
    }

    logger.info(`Inventory item updated: ${item.sku}`);
    successResponse(res, item, 'Inventory item updated successfully');
  } catch (error) {
    logger.error('Error updating inventory item:', error);
    errorResponse(res, 'Failed to update inventory item');
  }
};

export const deleteInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);

    if (!item) {
      errorResponse(res, 'Inventory item not found', 404);
      return;
    }

    logger.info(`Inventory item deleted: ${item.sku}`);
    successResponse(res, null, 'Inventory item deleted successfully');
  } catch (error) {
    logger.error('Error deleting inventory item:', error);
    errorResponse(res, 'Failed to delete inventory item');
  }
};

export const adjustInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { id } = req.params;
    const { type, quantity, reason } = req.body;

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      errorResponse(res, 'Inventory item not found', 404);
      return;
    }

    const previousQuantity = item.quantity;
    let newQuantity = previousQuantity;

    if (type === 'in') {
      newQuantity += quantity;
    } else if (type === 'out') {
      newQuantity = Math.max(0, newQuantity - quantity);
    } else if (type === 'adjustment') {
      newQuantity = quantity;
    }

    const transaction = await InventoryTransaction.create({
      inventoryId: item._id,
      type,
      quantity,
      reason,
      performedBy: req.user._id,
      warehouseId: item.location?.warehouse,
      previousQuantity,
      newQuantity
    });

    item.quantity = newQuantity;
    item.lastRestocked = type === 'in' ? new Date() : item.lastRestocked;
    await item.save();

    await item.populate('location.warehouse', 'name code');

    logger.info(`Inventory adjusted: ${item.sku} (${type}: ${quantity})`);
    successResponse(res, { item, transaction }, 'Inventory adjusted successfully');
  } catch (error) {
    logger.error('Error adjusting inventory:', error);
    errorResponse(res, 'Failed to adjust inventory');
  }
};

export const getInventoryTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const transactions = await InventoryTransaction.find({ inventoryId: req.params.id })
      .populate('performedBy', 'name email')
      .populate('warehouseId', 'name code')
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await InventoryTransaction.countDocuments({ inventoryId: req.params.id });

    successResponse(res, {
      transactions,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting inventory transactions:', error);
    errorResponse(res, 'Failed to get inventory transactions');
  }
};

export const getLowStockItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await Inventory.find({
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
      isActive: true
    })
      .populate('location.warehouse', 'name code')
      .sort({ quantity: 1 });

    successResponse(res, { items });
  } catch (error) {
    logger.error('Error getting low stock items:', error);
    errorResponse(res, 'Failed to get low stock items');
  }
};
