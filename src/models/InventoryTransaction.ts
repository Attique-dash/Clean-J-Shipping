import { Schema, model, models, Document } from "mongoose";

export interface IInventoryTransaction extends Document {
  inventoryId: string; // Reference to inventory item
  transactionType: 'consumption' | 'restock' | 'adjustment' | 'damage' | 'return';
  quantity: number; // Positive for restock, negative for consumption
  referenceType: 'package' | 'manifest' | 'manual' | 'system';
  referenceId?: string; // Package ID, manifest ID, etc.
  reason: string;
  location?: string;
  userId?: string; // Who performed the transaction
  previousStock: number;
  newStock: number;
  createdAt: Date;
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>({
  inventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true, index: true },
  transactionType: {
    type: String,
    enum: ['consumption', 'restock', 'adjustment', 'damage', 'return'],
    required: true
  },
  quantity: { type: Number, required: true },
  referenceType: {
    type: String,
    enum: ['package', 'manifest', 'manual', 'system'],
    required: true
  },
  referenceId: { type: String, index: true },
  reason: { type: String, required: true },
  location: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for querying transactions
InventoryTransactionSchema.index({ inventoryId: 1, createdAt: -1 });
InventoryTransactionSchema.index({ transactionType: 1, createdAt: -1 });
InventoryTransactionSchema.index({ referenceType: 1, referenceId: 1 });

export const InventoryTransaction = models.InventoryTransaction || model<IInventoryTransaction>("InventoryTransaction", InventoryTransactionSchema);
