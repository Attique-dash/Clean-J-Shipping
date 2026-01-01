// src/models/Package.ts
import mongoose, { Document, Schema } from 'mongoose';

export type PackageStatus =
  | 'pending'
  | 'At Warehouse'
  | 'pre_alerted'
  | 'received'
  | 'in_storage'
  | 'in_processing'
  | 'ready_to_ship'
  | 'shipped'
  | 'in_transit'
  | 'customs_pending'
  | 'customs_cleared'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'
  | 'returned'
  | 'lost'
  | 'damaged'
  | 'unknown'
  | 'At Warehouse'
  | 'In Transit'
  | 'At Local Port'
  | 'Delivered'
  | 'Unknown'
  | 'Deleted';
export type PackageType = 'document' | 'parcel' | 'freight' | 'pallet';
export type ServiceType = 'standard' | 'express' | 'overnight' | 'same_day';
export type ServiceMode = 'air' | 'ocean' | 'local';
export type DeliveryType = 'pickup' | 'delivery' | 'door_to_door' | 'warehouse_pickup';
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'cancelled';
export type CustomsStatus = 'not_required' | 'pending' | 'cleared';

export interface IPackage extends Document {
  // Basic Information
  trackingNumber: string;
  referenceNumber?: string;
  barcode?: string;
  
  // Customer Information
  userId: mongoose.Types.ObjectId;
  customerNotes?: string;
  
  // Sender Information
  senderType: string;
  senderName: string;
  senderCompany?: string;
  senderPhone: string;
  senderEmail?: string;
  senderAddress: string;
  senderCity: string;
  senderState: string;
  senderZipCode: string;
  senderCountry: string;
  
  // Receiver Information
  receiverName: string;
  receiverCompany?: string;
  receiverPhone: string;
  receiverEmail?: string;
  receiverAddress: string;
  receiverCity: string;
  receiverState: string;
  receiverZipCode: string;
  receiverCountry: string;
  
  // Package Details
  weight: number;
  volumetricWeight?: number;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit: string;
  weightUnit: string;
  itemDescription: string;
  itemCategory?: string;
  itemQuantity: number;
  itemValue?: number;
  hsCode?: string;
  
  // Service Details
  packageType: PackageType;
  serviceType: ServiceType;
  deliveryType: DeliveryType;
  shippingMethod?: string;
  
  // Consolidation
  isConsolidated: boolean;
  consolidationId?: string;
  originalPackages?: string[];
  
  // Warehouse Details
  warehouseLocation?: string;
  dateReceived?: Date;
  receivedBy?: string;

  mailboxNumber?: string;
  serviceMode?: ServiceMode;
  
  // Customs Information
  isInternational: boolean;
  customsValue?: number;
  dutiesAndTaxes?: number;
  invoiceNumber?: string;

  customsRequired?: boolean;
  customsStatus?: CustomsStatus;
  customsClearanceDate?: Date;
  dutyAmount?: number;
  customsDocuments?: Array<{
    name?: string;
    url?: string;
    uploadedAt?: Date;
  }>;
  
  // Payment & Pricing
  shippingCost: number;
  insurance: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentDueDate?: Date;

  amountPaid?: number;
  deliveryFee?: number;
  additionalFees?: Array<{
    label?: string;
    amount?: number;
  }>;
  
  // Status & Tracking
  status: PackageStatus;
  statusReason?: string;
  currentLocation?: string;
  lastScan?: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  pickupDate?: Date;
  
  // Additional Information
  specialInstructions?: string;
  signatureRequired: boolean;
  signatureImage?: string;
  proofOfDelivery?: string;
  damageNotes?: string;
  returnReason?: string;

  condition?: 'good' | 'damaged';
  photos?: Array<{
    url?: string;
    caption?: string;
    uploadedAt?: Date;
    uploadedBy?: string;
  }>;

  internalNotes?: Array<{
    text: string;
    createdAt: Date;
    createdBy?: string;
  }>;
  
  // Flags
  isFragile: boolean;
  isHazardous: boolean;
  requiresSignature: boolean;
  isPriority: boolean;
  
  // Missing fields from errors
  userCode?: string;
  customer?: mongoose.Types.ObjectId;
  entryDate?: Date;
  description?: string;
  origin?: {
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
    address?: string;
  };
  destination?: {
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
    address?: string;
  };
  carrier?: string;
  shipper?: string;
  invoiceRecords?: Array<{
    invoiceNumber?: string;
    invoiceDate?: Date | string;
    currency?: string;
    totalValue?: number;
    status?: string;
    amountPaid?: number;
    lastPaymentDate?: Date;
    paymentMethod?: string;
    paypalOrderId?: string;
    paymentDate?: Date;
  }>;
  invoiceDocuments?: unknown[];
  packagePayments?: string;
  history?: Array<{
    status: string;
    at: Date;
    note?: string;
  }>;
  recipient?: {
    name: string;
    email?: string;
    shippingId?: string;
    phone?: string;
    address?: string;
  };
  sender?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    weight?: number;
    weightUnit?: string;
  };
  contents?: string;
  value?: number;
  manifestId?: string;
  branch?: string;
  entryStaff?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PackageSchema = new Schema<IPackage>(
  {
    // Basic Information
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    referenceNumber: { type: String, trim: true },
    barcode: { type: String, trim: true },
    
    // Customer Information
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerNotes: { type: String, trim: true },
    
    // Sender Information
    senderType: { type: String, enum: ['customer', 'warehouse', 'third_party'], default: 'customer' },
    senderName: { type: String, required: true, trim: true },
    senderCompany: { type: String, trim: true },
    senderPhone: { type: String, required: true, trim: true },
    senderEmail: { type: String, trim: true, lowercase: true },
    senderAddress: { type: String, required: true, trim: true },
    senderCity: { type: String, required: true, trim: true },
    senderState: { type: String, required: true, trim: true },
    senderZipCode: { type: String, required: true, trim: true },
    senderCountry: { type: String, default: 'Jamaica' },
    
    // Receiver Information
    receiverName: { type: String, required: true, trim: true },
    receiverCompany: { type: String, trim: true },
    receiverPhone: { type: String, required: true, trim: true },
    receiverEmail: { type: String, trim: true, lowercase: true },
    receiverAddress: { type: String, required: true, trim: true },
    receiverCity: { type: String, required: true, trim: true },
    receiverState: { type: String, required: true, trim: true },
    receiverZipCode: { type: String, required: true, trim: true },
    receiverCountry: { type: String, default: 'Jamaica' },
    
    // Package Details
    weight: { type: Number, required: true, min: 0 },
    volumetricWeight: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    dimensionUnit: { type: String, enum: ['cm', 'in'], default: 'cm' },
    weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },
    itemDescription: { type: String, required: true, trim: true },
    itemCategory: { type: String, trim: true },
    itemQuantity: { type: Number, default: 1, min: 1 },
    itemValue: { type: Number, min: 0 },
    hsCode: { type: String, trim: true },
    
    // Service Details
    packageType: { type: String, enum: ['document', 'parcel', 'freight', 'pallet'], default: 'parcel' },
    serviceType: { type: String, enum: ['standard', 'express', 'overnight', 'same_day'], default: 'standard' },
    deliveryType: { type: String, enum: ['pickup', 'delivery', 'door_to_door', 'warehouse_pickup'], default: 'door_to_door' },
    shippingMethod: { type: String, trim: true },
    
    // Consolidation
    isConsolidated: { type: Boolean, default: false },
    consolidationId: { type: Schema.Types.ObjectId, ref: 'Package' },
    originalPackages: [{ type: Schema.Types.ObjectId, ref: 'Package' }],
    
    // Warehouse Details
    warehouseLocation: { type: String, trim: true },
    dateReceived: { type: Date },
    receivedBy: { type: String, trim: true },

    mailboxNumber: { type: String, trim: true },
    serviceMode: { type: String, enum: ['air', 'ocean', 'local'], default: 'air' },
    
    // Customs Information
    isInternational: { type: Boolean, default: false },
    customsValue: { type: Number, min: 0 },
    dutiesAndTaxes: { type: Number, min: 0 },
    invoiceNumber: { type: String, trim: true },

    customsRequired: { type: Boolean, default: false },
    customsStatus: { type: String, enum: ['not_required', 'pending', 'cleared'], default: 'not_required' },
    customsClearanceDate: { type: Date },
    dutyAmount: { type: Number, min: 0 },
    customsDocuments: [{
      name: { type: String, trim: true },
      url: { type: String, trim: true },
      uploadedAt: { type: Date },
    }],
    
    // Payment & Pricing
    shippingCost: { type: Number, required: true, min: 0 },
    insurance: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, trim: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'partially_paid', 'refunded', 'cancelled'], default: 'pending' },
    paymentDueDate: { type: Date },

    amountPaid: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    additionalFees: [{
      label: { type: String, trim: true },
      amount: { type: Number, min: 0 },
    }],
    
    // Status & Tracking
    status: { 
      type: String, 
      enum: [
        'pending',
        'At Warehouse',
        'pre_alerted',
        'received',
        'in_storage',
        'in_processing',
        'ready_to_ship',
        'shipped',
        'in_transit',
        'customs_pending',
        'customs_cleared',
        'ready_for_delivery',
        'out_for_delivery',
        'delivered',
        'exception',
        'returned',
        'lost',
        'damaged',
        'unknown',
        'At Warehouse',
        'In Transit',
        'At Local Port',
        'Delivered',
        'Unknown',
        'Deleted',
      ],
      default: 'received',
      required: true 
    },
    statusReason: { type: String, trim: true },
    currentLocation: { type: String, trim: true },
    lastScan: { type: Date },
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date },
    pickupDate: { type: Date },
    
    // Additional Information
    specialInstructions: { type: String, trim: true },
    signatureRequired: { type: Boolean, default: false },
    signatureImage: { type: String, trim: true },
    proofOfDelivery: { type: String, trim: true },
    damageNotes: { type: String, trim: true },
    returnReason: { type: String, trim: true },

    condition: { type: String, enum: ['good', 'damaged'], default: 'good' },
    photos: [{
      url: { type: String, trim: true },
      caption: { type: String, trim: true },
      uploadedAt: { type: Date },
      uploadedBy: { type: String, trim: true },
    }],
    internalNotes: [{
      text: { type: String, required: true, trim: true },
      createdAt: { type: Date, required: true },
      createdBy: { type: String, trim: true },
    }],
    
    // Flags
    isFragile: { type: Boolean, default: false },
    isHazardous: { type: Boolean, default: false },
    requiresSignature: { type: Boolean, default: false },
    isPriority: { type: Boolean, default: false },
    
    // Additional fields for warehouse form
    userCode: { type: String, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User' },
    entryDate: { type: Date },
    description: { type: String, trim: true },
    shipper: { type: String, trim: true },
    history: [{
      status: { type: String, required: true },
      at: { type: Date, required: true },
      note: { type: String, trim: true }
    }],
    recipient: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      shippingId: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true }
    },
    sender: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true }
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, enum: ['cm', 'in'], default: 'cm' },
      weight: { type: Number, min: 0 },
      weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' }
    },
    contents: { type: String, trim: true },
    value: { type: Number, min: 0 },
    manifestId: { type: Schema.Types.ObjectId, ref: 'Manifest' },
    branch: { type: String, trim: true },
    entryStaff: { type: String, trim: true },
  },
  { timestamps: true }
);

// Add indexes (remove duplicates - unique trackingNumber is already defined in schema)
PackageSchema.index({ userId: 1 });
PackageSchema.index({ status: 1 });
PackageSchema.index({ createdAt: -1 });
PackageSchema.index({ currentLocation: 1 });

const PackageModel =
  (mongoose.models.Package as mongoose.Model<IPackage>) ||
  mongoose.model<IPackage>('Package', PackageSchema);

export { PackageModel as Package };
export default PackageModel;