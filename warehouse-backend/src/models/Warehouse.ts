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
  
  // Shipping method addresses - NEW FEATURE for Clean J Shipping
  airAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
    email?: string;
    instructions?: string;
  };
  
  seaAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
    email?: string;
    instructions?: string;
  };
  
  chinaAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
    email?: string;
    instructions?: string;
  };
  
  // Company settings
  companyAbbreviation?: string; // e.g., "CLEAN" for Clean J Shipping
  
  createdAt: Date;
  updatedAt: Date;
}

const shippingAddressSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Street cannot exceed 500 characters']
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: [20, 'Zip code cannot exceed 20 characters']
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Country cannot exceed 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Instructions cannot exceed 1000 characters']
  }
}, { _id: false });

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
  airAddress: shippingAddressSchema,
  seaAddress: shippingAddressSchema,
  chinaAddress: shippingAddressSchema,
  
  // Company settings
  companyAbbreviation: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{2,5}$/, 'Company abbreviation must be 2-5 uppercase letters'],
    default: 'CLEAN' // Clean J Shipping
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to get formatted addresses
warehouseSchema.virtual('formattedAirAddress').get(function() {
  if (!this.airAddress) return null;
  return {
    fullAddress: `${this.airAddress.name}\n${this.airAddress.street}\n${this.airAddress.city}, ${this.airAddress.state} ${this.airAddress.zipCode}\n${this.airAddress.country}`,
    ...this.airAddress
  };
});

warehouseSchema.virtual('formattedSeaAddress').get(function() {
  if (!this.seaAddress) return null;
  return {
    fullAddress: `${this.seaAddress.name}\n${this.seaAddress.street}\n${this.seaAddress.city}, ${this.seaAddress.state} ${this.seaAddress.zipCode}\n${this.seaAddress.country}`,
    ...this.seaAddress
  };
});

warehouseSchema.virtual('formattedChinaAddress').get(function() {
  if (!this.chinaAddress) return null;
  return {
    fullAddress: `${this.chinaAddress.name}\n${this.chinaAddress.street}\n${this.chinaAddress.city}, ${this.chinaAddress.state} ${this.chinaAddress.zipCode}\n${this.chinaAddress.country}`,
    ...this.chinaAddress
  };
});

// Indexes
warehouseSchema.index({ code: 1 });
warehouseSchema.index({ name: 1 });
warehouseSchema.index({ isActive: 1 });
warehouseSchema.index({ isDefault: 1 });
warehouseSchema.index({ createdAt: -1 });

export const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);