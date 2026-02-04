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
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  senderName: string;
  recipientName: string;
  senderAddress: IShippingAddress;
  recipientAddress: IShippingAddress;
  weight: number;
  dimensions: IDimensions;
  status: string;
  description?: string;
  value?: number;
  currency?: string;
  insurance?: boolean;
  signatureRequired?: boolean;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  trackingHistory: Array<{
    timestamp: Date;
    status: string;
    location: string;
    description?: string;
  }>;
  cost?: number;
  shippingMethod?: string;
  priority?: 'standard' | 'express' | 'overnight';
  fragile?: boolean;
  hazardous?: boolean;
  specialInstructions?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
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
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient ID is required']
  },
  senderName: {
    type: String,
    required: [true, 'Sender name is required'],
    trim: true,
    maxlength: [100, 'Sender name cannot exceed 100 characters']
  },
  recipientName: {
    type: String,
    required: [true, 'Recipient name is required'],
    trim: true,
    maxlength: [100, 'Recipient name cannot exceed 100 characters']
  },
  senderAddress: {
    type: shippingAddressSchema,
    required: [true, 'Sender address is required']
  },
  recipientAddress: {
    type: shippingAddressSchema,
    required: [true, 'Recipient address is required']
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be positive']
  },
  dimensions: {
    type: dimensionsSchema,
    required: [true, 'Dimensions are required']
  },
  status: {
    type: String,
    enum: Object.values(PACKAGE_STATUSES),
    default: PACKAGE_STATUSES.PENDING
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  value: {
    type: Number,
    min: [0, 'Value must be positive']
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  insurance: {
    type: Boolean,
    default: false
  },
  signatureRequired: {
    type: Boolean,
    default: false
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  trackingHistory: [trackingHistorySchema],
  cost: {
    type: Number,
    min: [0, 'Cost must be positive']
  },
  shippingMethod: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['standard', 'express', 'overnight'],
    default: 'standard'
  },
  fragile: {
    type: Boolean,
    default: false
  },
  hazardous: {
    type: Boolean,
    default: false
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Special instructions cannot exceed 1000 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
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

// Indexes
packageSchema.index({ trackingNumber: 1 });
packageSchema.index({ senderId: 1 });
packageSchema.index({ recipientId: 1 });
packageSchema.index({ status: 1 });
packageSchema.index({ createdAt: -1 });
packageSchema.index({ estimatedDelivery: 1 });
packageSchema.index({ 'recipientAddress.zipCode': 1 });
packageSchema.index({ 'senderAddress.zipCode': 1 });

// Virtual for volume
packageSchema.virtual('volume').get(function() {
  return this.dimensions.length * this.dimensions.width * this.dimensions.height;
});

export const Package = mongoose.model<IPackage>('Package', packageSchema);
