import mongoose, { Schema, Document } from 'mongoose';
import { INVENTORY_TRANSACTION_TYPES } from '../utils/constants';

export interface IInventoryTransaction extends Document {
  inventoryId: mongoose.Types.ObjectId;
  type: string;
  quantity: number;
  reference?: string;
  reason: string;
  performedBy: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  previousQuantity: number;
  newQuantity: number;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  metadata?: Record<string, any>;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>({
  inventoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Inventory ID is required']
  },
  type: {
    type: String,
    enum: Object.values(INVENTORY_TRANSACTION_TYPES),
    required: [true, 'Transaction type is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity must be positive']
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performed by is required']
  },
  warehouseId: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  previousQuantity: {
    type: Number,
    required: [true, 'Previous quantity is required'],
    min: [0, 'Previous quantity cannot be negative']
  },
  newQuantity: {
    type: Number,
    required: [true, 'New quantity is required'],
    min: [0, 'New quantity cannot be negative']
  },
  unitCost: {
    type: Number,
    min: [0, 'Unit cost must be positive']
  },
  totalCost: {
    type: Number,
    min: [0, 'Total cost must be positive']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  transactionDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
inventoryTransactionSchema.index({ inventoryId: 1 });
inventoryTransactionSchema.index({ type: 1 });
inventoryTransactionSchema.index({ performedBy: 1 });
inventoryTransactionSchema.index({ warehouseId: 1 });
inventoryTransactionSchema.index({ transactionDate: -1 });
inventoryTransactionSchema.index({ createdAt: -1 });

export const InventoryTransaction = mongoose.model<IInventoryTransaction>('InventoryTransaction', inventoryTransactionSchema);
