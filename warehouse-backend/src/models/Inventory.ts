import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  name: string;
  description?: string;
  sku: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  currency: string;
  location?: {
    warehouse: mongoose.Types.ObjectId;
    aisle?: string;
    shelf?: string;
    bin?: string;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  weight?: {
    value: number;
    unit: string;
  };
  tags?: string[];
  isActive: boolean;
  lowStockAlert: boolean;
  lastRestocked?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const dimensionsSchema = new Schema({
  length: { type: Number, min: 0 },
  width: { type: Number, min: 0 },
  height: { type: Number, min: 0 },
  unit: {
    type: String,
    enum: ['cm', 'in'],
    default: 'cm'
  }
}, { _id: false });

const weightSchema = new Schema({
  value: { type: Number, min: 0 },
  unit: {
    type: String,
    enum: ['kg', 'lb', 'g', 'oz'],
    default: 'kg'
  }
}, { _id: false });

const locationSchema = new Schema({
  warehouse: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  aisle: {
    type: String,
    trim: true,
    maxlength: 10
  },
  shelf: {
    type: String,
    trim: true,
    maxlength: 10
  },
  bin: {
    type: String,
    trim: true,
    maxlength: 10
  }
}, { _id: false });

const inventorySchema = new Schema<IInventory>({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9-]{5,20}$/, 'SKU must be 5-20 alphanumeric characters and hyphens']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  minStockLevel: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock level cannot be negative'],
    default: 10
  },
  maxStockLevel: {
    type: Number,
    required: [true, 'Maximum stock level is required'],
    min: [0, 'Maximum stock level cannot be negative'],
    default: 1000
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price must be positive']
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD'
  },
  location: locationSchema,
  dimensions: dimensionsSchema,
  weight: weightSchema,
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lowStockAlert: {
    type: Boolean,
    default: true
  },
  lastRestocked: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantity <= 0) return 'out-of-stock';
  if (this.quantity <= this.minStockLevel) return 'low-stock';
  if (this.quantity >= this.maxStockLevel) return 'overstock';
  return 'in-stock';
});

// Indexes
inventorySchema.index({ sku: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ 'location.warehouse': 1 });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ isActive: 1 });
inventorySchema.index({ lowStockAlert: 1 });
inventorySchema.index({ createdAt: -1 });

export const Inventory = mongoose.model<IInventory>('Inventory', inventorySchema);
