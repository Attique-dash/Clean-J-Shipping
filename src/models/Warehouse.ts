import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouse extends Document {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  isActive: boolean;
  isDefault: boolean;
  location?: any; // GeoJSON
  capacity?: any; // Storage capacity information
  operatingHours?: any; // Operating hours
  notes?: string;
  airAddress?: string; // Address for air shipments
  seaAddress?: string; // Address for sea shipments  
  chinaAddress?: string; // Address for China shipments
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: 'Jamaica' },
  phone: { type: String },
  email: { type: String },
  contactPerson: { type: String },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  location: { type: Schema.Types.Mixed }, // GeoJSON for mapping
  capacity: { type: Schema.Types.Mixed }, // Storage capacity information
  operatingHours: { type: Schema.Types.Mixed }, // Operating hours
  notes: { type: String },
  
  // Shipping method specific addresses
  airAddress: { type: String }, // Address for air shipments
  seaAddress: { type: String }, // Address for sea shipments  
  chinaAddress: { type: String }, // Address for China shipments
}, {
  timestamps: true
});

// Indexes
WarehouseSchema.index({ isActive: 1 });

export const Warehouse = mongoose.models.Warehouse || mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
