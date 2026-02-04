import { Inventory, IInventory } from '../models/Inventory';
import { InventoryTransaction, IInventoryTransaction } from '../models/InventoryTransaction';
import { logger } from '../utils/logger';
import { INVENTORY_TRANSACTION_TYPES } from '../utils/constants';

export class InventoryService {
  static async createInventory(inventoryData: Partial<IInventory>, createdBy: string): Promise<IInventory> {
    try {
      const item = new Inventory({
        ...inventoryData,
        createdBy
      });

      await item.save();
      await item.populate('location.warehouse', 'name code');

      logger.info(`Inventory item created: ${item.sku}`);
      return item;
    } catch (error) {
      logger.error('Error creating inventory item:', error);
      throw error;
    }
  }

  static async adjustInventory(
    inventoryId: string,
    type: string,
    quantity: number,
    reason: string,
    performedBy: string
  ): Promise<{ item: IInventory, transaction: IInventoryTransaction }> {
    try {
      const item = await Inventory.findById(inventoryId);
      if (!item) {
        throw new Error('Inventory item not found');
      }

      const previousQuantity = item.quantity;
      let newQuantity = previousQuantity;

      if (type === INVENTORY_TRANSACTION_TYPES.IN) {
        newQuantity += quantity;
      } else if (type === INVENTORY_TRANSACTION_TYPES.OUT) {
        newQuantity = Math.max(0, newQuantity - quantity);
      } else if (type === INVENTORY_TRANSACTION_TYPES.ADJUSTMENT) {
        newQuantity = quantity;
      }

      const transaction = await InventoryTransaction.create({
        inventoryId: item._id,
        type,
        quantity,
        reason,
        performedBy,
        warehouseId: item.location?.warehouse,
        previousQuantity,
        newQuantity
      });

      item.quantity = newQuantity;
      item.lastRestocked = type === INVENTORY_TRANSACTION_TYPES.IN ? new Date() : item.lastRestocked;
      await item.save();

      await item.populate('location.warehouse', 'name code');

      logger.info(`Inventory adjusted: ${item.sku} (${type}: ${quantity})`);
      return { item, transaction };
    } catch (error) {
      logger.error('Error adjusting inventory:', error);
      throw error;
    }
  }

  static async getLowStockItems(): Promise<IInventory[]> {
    try {
      const items = await Inventory.find({
        $expr: { $lte: ['$quantity', '$minStockLevel'] },
        isActive: true
      })
        .populate('location.warehouse', 'name code')
        .sort({ quantity: 1 });

      return items;
    } catch (error) {
      logger.error('Error getting low stock items:', error);
      throw error;
    }
  }

  static async getInventoryByWarehouse(warehouseId: string): Promise<IInventory[]> {
    try {
      const items = await Inventory.find({
        'location.warehouse': warehouseId,
        isActive: true
      })
        .populate('location.warehouse', 'name code')
        .sort({ name: 1 });

      return items;
    } catch (error) {
      logger.error('Error getting inventory by warehouse:', error);
      throw error;
    }
  }

  static async getInventoryTransactions(inventoryId: string, page: number = 1, limit: number = 20): Promise<{ transactions: IInventoryTransaction[], total: number }> {
    try {
      const skip = (page - 1) * limit;

      const transactions = await InventoryTransaction.find({ inventoryId })
        .populate('performedBy', 'name email')
        .populate('warehouseId', 'name code')
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await InventoryTransaction.countDocuments({ inventoryId });

      return { transactions, total };
    } catch (error) {
      logger.error('Error getting inventory transactions:', error);
      throw error;
    }
  }

  static async getInventoryValue(warehouseId?: string): Promise<number> {
    try {
      const matchQuery: any = { isActive: true };
      if (warehouseId) {
        matchQuery['location.warehouse'] = warehouseId;
      }

      const result = await Inventory.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
      ]);

      return result[0]?.totalValue || 0;
    } catch (error) {
      logger.error('Error calculating inventory value:', error);
      throw error;
    }
  }

  static async getCategoryBreakdown(warehouseId?: string): Promise<any[]> {
    try {
      const matchQuery: any = { isActive: true };
      if (warehouseId) {
        matchQuery['location.warehouse'] = warehouseId;
      }

      const breakdown = await Inventory.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } }
          }
        },
        { $sort: { totalValue: -1 } }
      ]);

      return breakdown;
    } catch (error) {
      logger.error('Error getting category breakdown:', error);
      throw error;
    }
  }
}
