import mongoose, { Schema, Document } from 'mongoose';
import { PACKAGE_STATUSES } from '../utils/constants';

export interface IDimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

export interface IShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IPackage extends Document {
  trackingNumber: string;
  userCode: string;
  userId: mongoose.Types.ObjectId;
  
  // Package details
  weight: number;
  dimensions?: { length: number; width: number; height: number; unit: string };
  shipper?: string;
  description?: string;
  itemDescription?: string;
  
  // Service
  serviceMode: 'air' | 'ocean' | 'local';
  status: string;
  
  // Sender
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderAddress?: string;
  senderCountry?: string;
  
  // Recipient
  recipient?: {
    name: string;
    email: string;
    shippingId: string;
    phone: string;
    address: string;
  };
  
  // Warehouse
  warehouseLocation?: string;
  dateReceived?: Date;
  manifestId?: mongoose.Types.ObjectId;
  
  // Customs
  customsRequired: boolean;
  customsStatus: 'not_required' | 'pending' | 'cleared';
  
  // Payment
  shippingCost: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'partially_paid';
  
  // Flags
  isFragile: boolean;
  isHazardous: boolean;
  requiresSignature: boolean;
  
  // Additional
  specialInstructions?: string;
  history?: Array<{ status: string; at: Date; note: string }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const dimensionsSchema = new Schema<IDimensions>({
  length: {
    type: Number,
    required: [true, 'Length is required'],
    min: [0, 'Length must be positive']
  },
  width: {
    type: Number,
    required: [true, 'Width is required'],
    min: [0, 'Width must be positive']
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
    min: [0, 'Height must be positive']
  },
  unit: {
    type: String,
    enum: ['cm', 'in'],
    default: 'cm'
  }
}, { _id: false });

const shippingAddressSchema = new Schema<IShippingAddress>({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters']
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
    maxlength: [100, 'Country cannot exceed 100 characters']
  },
  coordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  }
}, { _id: false });

const trackingHistorySchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(PACKAGE_STATUSES),
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, { _id: false });

const packageSchema = new Schema<IPackage>({
  trackingNumber: {
    type: String,
    required: [true, 'Tracking number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{10,20}$/, 'Tracking number must be 10-20 alphanumeric characters']
  },
  userCode: {
    type: String,
    required: [true, 'User code is required'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{2}-\d{3,4}$/, 'User code must be in format XX-123']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  
  // Package details
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be positive']
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: { type: String, enum: ['cm', 'in'], default: 'cm' }
  },
  shipper: {
    type: String,
    trim: true,
    maxlength: [100, 'Shipper name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  itemDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Item description cannot exceed 500 characters']
  },
  
  // Service
  serviceMode: {
    type: String,
    enum: ['air', 'ocean', 'local'],
    default: 'local'
  },
  status: {
    type: String,
    enum: ['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned'],
    default: 'received'
  },
  
  // Sender
  senderName: {
    type: String,
    trim: true,
    maxlength: [100, 'Sender name cannot exceed 100 characters']
  },
  senderEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  senderPhone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,20}$/, 'Please enter a valid phone number']
  },
  senderAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'Sender address cannot exceed 500 characters']
  },
  senderCountry: {
    type: String,
    trim: true,
    maxlength: [100, 'Sender country cannot exceed 100 characters']
  },
  
  // Recipient
  recipient: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Recipient name cannot exceed 100 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    shippingId: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]{10,20}$/, 'Please enter a valid phone number']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Recipient address cannot exceed 500 characters']
    }
  },
  
  // Warehouse
  warehouseLocation: {
    type: String,
    trim: true,
    maxlength: [100, 'Warehouse location cannot exceed 100 characters']
  },
  dateReceived: {
    type: Date,
    default: Date.now
  },
  manifestId: {
    type: Schema.Types.ObjectId,
    ref: 'Manifest'
  },
  
  // Customs
  customsRequired: {
    type: Boolean,
    default: false
  },
  customsStatus: {
    type: String,
    enum: ['not_required', 'pending', 'cleared'],
    default: 'not_required'
  },
  
  // Payment
  shippingCost: {
    type: Number,
    min: [0, 'Shipping cost must be positive'],
    default: 0
  },
  totalAmount: {
    type: Number,
    min: [0, 'Total amount must be positive'],
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially_paid'],
    default: 'pending'
  },
  
  // Flags
  isFragile: {
    type: Boolean,
    default: false
  },
  isHazardous: {
    type: Boolean,
    default: false
  },
  requiresSignature: {
    type: Boolean,
    default: false
  },
  
  // Additional
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Special instructions cannot exceed 1000 characters']
  },
  history: [{
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, trim: true }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
packageSchema.index({ trackingNumber: 1 });
packageSchema.index({ userCode: 1 });
packageSchema.index({ userId: 1 });
packageSchema.index({ status: 1 });
packageSchema.index({ serviceMode: 1 });
packageSchema.index({ customsStatus: 1 });
packageSchema.index({ paymentStatus: 1 });
packageSchema.index({ dateReceived: -1 });
packageSchema.index({ manifestId: 1 });
packageSchema.index({ createdAt: -1 });

// Compound indexes for common queries
packageSchema.index({ status: 1, createdAt: -1 });
packageSchema.index({ userId: 1, status: 1 });
packageSchema.index({ userCode: 1, status: 1 });

export const Package = mongoose.model<IPackage>('Package', packageSchema);

// Virtual for volume
packageSchema.virtual('volume').get(function() {
  if (!this.dimensions) return 0;
  return this.dimensions.length * this.dimensions.width * this.dimensions.height;
});
