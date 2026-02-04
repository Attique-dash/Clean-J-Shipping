import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouse extends Document {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isActive: boolean;
  isDefault: boolean;
  
  // Shipping method addresses
  airAddress?: string;
  seaAddress?: string;
  chinaAddress?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<IWarehouse>({
  code: {
    type: String,
    required: [true, 'Warehouse code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{3,6}$/, 'Warehouse code must be 3-6 uppercase letters']
  },
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true,
    maxlength: [100, 'Warehouse name cannot exceed 100 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  zipCode: {
    type: String,
    required: [true, 'Zip code is required'],
    trim: true,
    maxlength: [20, 'Zip code cannot exceed 20 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country cannot exceed 100 characters'],
    default: 'USA'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  
  // Shipping method addresses
  airAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'Air address cannot exceed 500 characters']
  },
  seaAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'Sea address cannot exceed 500 characters']
  },
  chinaAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'China address cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
warehouseSchema.index({ code: 1 });
warehouseSchema.index({ name: 1 });
warehouseSchema.index({ isActive: 1 });
warehouseSchema.index({ city: 1 });
warehouseSchema.index({ state: 1 });
warehouseSchema.index({ isDefault: 1 });
warehouseSchema.index({ createdAt: -1 });

export const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);
