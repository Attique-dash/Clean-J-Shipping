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
  
  // KCD Integration fields
  courierCode?: string;
  customerId?: mongoose.Types.ObjectId;
  customerCode?: string;
  source?: 'web' | 'kcd-packing-system' | 'api' | 'kcd_webhook';
  warehouseAddress?: string;
  location?: string;
  estimatedDelivery?: Date;
  processedAt?: Date;
  timeline?: Array<{
    status: string;
    timestamp: Date;
    location: string;
    description: string;
  }>;
  
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
  paymentHistory?: Array<{
    timestamp: Date;
    status: string;
    amountPaid: number;
    paymentMethod: string;
    note?: string;
    updatedBy?: string;
  }>;
  paidAt?: Date;
  paidBy?: string;

  // Flags
  isFragile: boolean;
  isHazardous: boolean;
  requiresSignature: boolean;
  
  // Additional
  specialInstructions?: string;
  notes?: string;
  trackingHistory?: Array<{
    timestamp: Date;
    status: string;
    location: string;
    description?: string;
  }>;
  actualDelivery?: Date;
  history?: Array<{ status: string; at: Date; note: string }>;
  
  // Tasoko API fields
  PackageID?: string;           // UUID from Tasoko
  CourierID?: string;          // UUID from Tasoko
  TrackingNumber?: string;     // Alternative tracking number field
  ControlNumber?: string;       // EP0096513 format
  entryStaff?: string;         // Staff who entered package
  entryDate?: Date;            // Entry date (date only)
  entryDateTime?: Date;        // Full timestamp
  branch?: string;             // "Down Town" etc.
  claimed?: boolean;           // Package claimed status
  apiToken?: string;           // API token reference
  showControls?: boolean;      // UI control flag
  hsCode?: string;            // HS tariff code
  unknown?: boolean;          // Unknown package flag
  aiProcessed?: boolean;      // AI processing status
  originalHouseNumber?: string; // Original tracking
  cubes?: number;             // Volume in cubic units
  pieces?: number;            // Number of pieces
  discrepancy?: boolean;      // Discrepancy flag
  discrepancyDescription?: string;
  serviceTypeId?: string;     // From Tasoko spec page 7
  hazmatCodeId?: string;      // From Tasoko spec page 8
  coloaded?: boolean;         // Co-loading flag
  coloadIndicator?: string;   // Co-load indicator
  packageStatus?: number;     // 0-4 status code
  packagePayments?: string;   // Payment reference
  
  // Additional Tasoko fields from JSON example
  FirstName?: string;         // First name from Tasoko
  LastName?: string;          // Last name from Tasoko
  UserCode?: string;         // User code from Tasoko (alternative field)
  Weight?: number;           // Weight from Tasoko (alternative field)
  Shipper?: string;          // Shipper from Tasoko (alternative field)
  EntryStaff?: string;        // Entry staff from Tasoko
  EntryDate?: Date;          // Entry date from Tasoko
  EntryDateTime?: Date;       // Entry datetime from Tasoko
  Branch?: string;            // Branch from Tasoko
  APIToken?: string;         // API token from Tasoko
  ShowControls?: boolean;    // Show controls from Tasoko
  ManifestCode?: string;     // Manifest code from Tasoko
  CollectionCode?: string;   // Collection code from Tasoko
  Description?: string;      // Description from Tasoko
  HSCode?: string;          // HS code from Tasoko
  Unknown?: boolean;         // Unknown flag from Tasoko
  AIProcessed?: boolean;     // AI processed from Tasoko
  OriginalHouseNumber?: string; // Original house number from Tasoko
  Cubes?: number;           // Cubes from Tasoko
  Length?: number;          // Length from Tasoko
  Width?: number;           // Width from Tasoko
  Height?: number;          // Height from Tasoko
  Pieces?: number;          // Pieces from Tasoko
  Discrepancy?: boolean;    // Discrepancy from Tasoko
  DiscrepancyDescription?: string; // Discrepancy description from Tasoko
  ServiceTypeID?: string;   // Service type ID from Tasoko
  HazmatCodeID?: string;    // Hazmat code ID from Tasoko
  Coloaded?: boolean;       // Coloaded from Tasoko
  ColoadIndicator?: string; // Coload indicator from Tasoko
  
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
    match: [/^[A-Z0-9-]{5,30}$/, 'Tracking number must be 5-30 alphanumeric characters (hyphens allowed)']
  },
  userCode: {
    type: String,
    required: [true, 'User code is required'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{2,6}-\d{3,5}$/, 'User code must be in format CLEAN-XXXX (3-5 digits)']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  
  // KCD Integration fields
  courierCode: {
    type: String,
    trim: true,
    uppercase: true,
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    index: true
  },
  customerCode: {
    type: String,
    trim: true,
    uppercase: true,
    index: true
  },
  source: {
    type: String,
    enum: ['web', 'kcd-packing-system', 'api', 'kcd_webhook'],
    default: 'web',
    index: true
  },
  warehouseAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'Warehouse address cannot exceed 500 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  estimatedDelivery: {
    type: Date
  },
  processedAt: {
    type: Date,
    index: true
  },
  timeline: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    location: {
      type: String,
      required: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  
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
    enum: ['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned', 'at_warehouse', 'processing', 'ready_for_pickup', 'processed'],
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
  paymentHistory: [{
    timestamp: { type: Date, default: Date.now },
    status: { type: String, required: true },
    amountPaid: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'cash' },
    note: { type: String, trim: true },
    updatedBy: { type: String }
  }],
  paidAt: { type: Date },
  paidBy: { type: String },

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
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  trackingHistory: [trackingHistorySchema],
  actualDelivery: {
    type: Date
  },
  history: [{
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, trim: true }
  }],
  
  // Tasoko API fields
  PackageID: {
    type: String,
    trim: true
  },
  CourierID: {
    type: String,
    trim: true
  },
  TrackingNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Tracking number cannot exceed 50 characters']
  },
  ControlNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Control number cannot exceed 50 characters']
  },
  FirstName: {
    type: String,
    trim: true,
    maxlength: [100, 'First name cannot exceed 100 characters']
  },
  LastName: {
    type: String,
    trim: true,
    maxlength: [100, 'Last name cannot exceed 100 characters']
  },
  UserCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [50, 'User code cannot exceed 50 characters']
  },
  Weight: {
    type: Number,
    min: [0, 'Weight must be positive']
  },
  Shipper: {
    type: String,
    trim: true,
    maxlength: [100, 'Shipper cannot exceed 100 characters']
  },
  EntryStaff: {
    type: String,
    trim: true,
    maxlength: [100, 'Entry staff name cannot exceed 100 characters']
  },
  EntryDate: {
    type: Date
  },
  EntryDateTime: {
    type: Date
  },
  Branch: {
    type: String,
    trim: true,
    maxlength: [100, 'Branch name cannot exceed 100 characters']
  },
  APIToken: {
    type: String,
    trim: true,
    maxlength: [500, 'API token cannot exceed 500 characters']
  },
  ShowControls: {
    type: Boolean,
    default: false
  },
  ManifestCode: {
    type: String,
    trim: true,
    maxlength: [100, 'Manifest code cannot exceed 100 characters']
  },
  CollectionCode: {
    type: String,
    trim: true,
    maxlength: [100, 'Collection code cannot exceed 100 characters']
  },
  Description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  HSCode: {
    type: String,
    trim: true,
    maxlength: [20, 'HS Code cannot exceed 20 characters']
  },
  Unknown: {
    type: Boolean,
    default: false
  },
  AIProcessed: {
    type: Boolean,
    default: false
  },
  OriginalHouseNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Original house number cannot exceed 100 characters']
  },
  Cubes: {
    type: Number,
    min: [0, 'Cubes must be positive'],
    default: 0
  },
  Length: {
    type: Number,
    min: [0, 'Length must be positive'],
    default: 0
  },
  Width: {
    type: Number,
    min: [0, 'Width must be positive'],
    default: 0
  },
  Height: {
    type: Number,
    min: [0, 'Height must be positive'],
    default: 0
  },
  Pieces: {
    type: Number,
    min: [1, 'Pieces must be at least 1'],
    default: 1
  },
  Discrepancy: {
    type: Boolean,
    default: false
  },
  DiscrepancyDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Discrepancy description cannot exceed 500 characters']
  },
  ServiceTypeID: {
    type: String,
    trim: true,
    maxlength: [100, 'Service type ID cannot exceed 100 characters']
  },
  HazmatCodeID: {
    type: String,
    trim: true,
    maxlength: [100, 'Hazmat code ID cannot exceed 100 characters']
  },
  Coloaded: {
    type: Boolean,
    default: false
  },
  ColoadIndicator: {
    type: String,
    trim: true,
    maxlength: [50, 'Coload indicator cannot exceed 50 characters']
  },
  
  // Legacy Tasoko fields (for backward compatibility)
  // Note: Most legacy fields are now handled by the main Tasoko API fields above
  serviceTypeId: {
    type: String,
    trim: true,
    enum: [
      '59cadcd4-7508-450b-85aa-9ec908d168fe', // AIR STANDARD
      '25a1d8e5-a478-4cc3-b1fd-a37d0d787302', // AIR EXPRESS
      '8df142ca-0573-4ce9-b11d-7a3e5f8ba196', // AIR PREMIUM
      '7c9638e8-4bb3-499e-8af9-d09f757a099e', // SEA STANDARD
      ''                                        // UNSPECIFIED
    ]
  },
  hazmatCodeId: {
    type: String,
    trim: true
  },
  coloaded: {
    type: Boolean,
    default: false
  },
  coloadIndicator: {
    type: String,
    trim: true
  },
  packageStatus: {
    type: Number,
    min: 0,
    max: 4,
    default: 0
  },
  packagePayments: {
    type: String,
    trim: true
  }
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

// KCD-specific indexes
packageSchema.index({ courierCode: 1 });
packageSchema.index({ customerId: 1 });
packageSchema.index({ customerCode: 1 });
packageSchema.index({ source: 1 });
packageSchema.index({ processedAt: -1 });

// Compound indexes for common queries
packageSchema.index({ status: 1, createdAt: -1 });
packageSchema.index({ userId: 1, status: 1 });
packageSchema.index({ userCode: 1, status: 1 });
packageSchema.index({ courierCode: 1, status: 1 });
packageSchema.index({ source: 1, createdAt: -1 });

export const Package = mongoose.model<IPackage>('Package', packageSchema);

// Virtual for volume
packageSchema.virtual('volume').get(function(this: IPackage) {
  if (!this.dimensions) return 0;
  return this.dimensions.length * this.dimensions.width * this.dimensions.height;
});
