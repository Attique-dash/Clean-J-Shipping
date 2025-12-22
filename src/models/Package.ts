// src/models/Package.ts
import mongoose, { Document, Schema } from 'mongoose';

export type PackageStatus = 'pending' | 'received' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'returned' | 'lost' | 'damaged';
export type PackageType = 'document' | 'parcel' | 'freight' | 'pallet';
export type ServiceType = 'standard' | 'express' | 'overnight' | 'same_day';
export type DeliveryType = 'pickup' | 'delivery' | 'door_to_door' | 'warehouse_pickup';
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'cancelled';

export interface IPackage extends Document {
  // Basic Information
  trackingNumber: string;
  referenceNumber?: string;
  barcode?: string;
  
  // Customer Information
  userId: string;
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
  
  // Customs Information
  isInternational: boolean;
  customsValue?: number;
  dutiesAndTaxes?: number;
  invoiceNumber?: string;
  
  // Payment & Pricing
  shippingCost: number;
  insurance: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentDueDate?: Date;
  
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
  
  // Flags
  isFragile: boolean;
  isHazardous: boolean;
  requiresSignature: boolean;
  isPriority: boolean;
  
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
    
    // Customs Information
    isInternational: { type: Boolean, default: false },
    customsValue: { type: Number, min: 0 },
    dutiesAndTaxes: { type: Number, min: 0 },
    invoiceNumber: { type: String, trim: true },
    
    // Payment & Pricing
    shippingCost: { type: Number, required: true, min: 0 },
    insurance: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, trim: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'partially_paid', 'refunded', 'cancelled'], default: 'pending' },
    paymentDueDate: { type: Date },
    
    // Status & Tracking
    status: { 
      type: String, 
      enum: ['pending', 'received', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned', 'lost', 'damaged'],
      default: 'pending',
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
    
    // Flags
    isFragile: { type: Boolean, default: false },
    isHazardous: { type: Boolean, default: false },
    requiresSignature: { type: Boolean, default: false },
    isPriority: { type: Boolean, default: false },
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