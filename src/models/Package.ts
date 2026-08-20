// src/models/Package.ts — KCD / Tasoko PascalCase package schema
import { Schema, model, models, Document, Types } from "mongoose";

export interface IPackage extends Document {
  PackageID?: string;
  CourierID?: string;
  ManifestID?: string;
  CollectionID?: string;
  TrackingNumber: string;
  ControlNumber?: string;
  FirstName?: string;
  LastName?: string;
  UserCode?: string;
  Weight?: number;
  Shipper?: string;
  EntryStaff?: string;
  EntryDate?: Date;
  EntryDateTime?: Date;
  Branch?: string;
  Claimed?: boolean;
  APIToken?: string;
  ShowControls?: boolean;
  ManifestCode?: string;
  CollectionCode?: string;
  Description?: string;
  HSCode?: string;
  Unknown?: boolean;
  AIProcessed?: boolean;
  OriginalHouseNumber?: string;
  Cubes?: number;
  Length?: number;
  Width?: number;
  Height?: number;
  Pieces?: number;
  Discrepancy?: boolean;
  DiscrepancyDescription?: string;
  ServiceTypeID?: string;
  HazmatCodeID?: string;
  Coloaded?: boolean;
  ColoadIndicator?: string;
  PackageStatus?: number;
  PackagePayments?: string;

  /** Payment-related fields */
  paymentStatus?: 'pending' | 'paid' | 'partially_paid';
  amountPaid?: number;
  paymentMethod?: 'cash' | 'card' | 'paypal' | 'bank_transfer';
  totalAmount?: number;
  paidAt?: Date;
  paidBy?: string;
  paymentHistory?: Array<{
    timestamp: Date;
    status: string;
    amountPaid: number;
    paymentMethod: string;
    note?: string;
    updatedBy: string;
  }>;

  /** Manual charge fields for invoice calculation */
  regularCharge?: number;
  customCharge?: number;
  chargeCurrency?: string;

  /** Invoice-related fields for customer invoice upload system */
  invoiceUploaded?: boolean;
  invoiceStatus?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'billed';
  invoiceFiles?: Array<{
    url?: string;
    publicId?: string;
    filename?: string;
    size?: number;
    type?: string;
    path?: string;
  }>;
  invoiceSubmittedAt?: Date;
  pricePaid?: number;
  pricePaidCurrency?: string;
  billingInvoiceId?: Types.ObjectId;
  customerInvoice?: {
    amount: number;
    currency: string;
    description: string;
    files: Array<{
      url?: string;
      publicId?: string;
      filename?: string;
      size?: number;
      type?: string;
    }>;
    submittedAt: Date;
  };

  /** Internal relations — not part of KCD webhook payload */
  userId?: Types.ObjectId;
  customer?: Types.ObjectId;
  source?: 'manual' | 'kcd_webhook' | 'api' | 'bulk_upload';
  sourceDetails?: {
    webhookId?: string;
    apiEndpoint?: string;
    syncedAt?: Date;
    syncStatus?: 'pending' | 'synced' | 'failed';
    lastSyncError?: string;
  };

  /** Legacy camelCase aliases (strict:false schema; used by admin/warehouse routes during migration) */
  trackingNumber?: string;
  userCode?: string;
  weight?: number;
  shipper?: string;
  description?: string;
  status?: PackageStatus | string;
  length?: number;
  width?: number;
  height?: number;
  branch?: string;
  entryDate?: Date;
  entryStaff?: string;
  cubes?: number;
  pieces?: number;
  hsCode?: string;
  manifestId?: string;
  controlNumber?: string;
  courierId?: string;
  collectionId?: string;
  claimed?: boolean;
  unknown?: boolean;
  aiProcessed?: boolean;
  discrepancy?: boolean;
  discrepancyDescription?: string;
  coloaded?: boolean;
  coloadIndicator?: string;
  packagePayments?: string;
  history?: Array<{ status: string; at: Date; note?: string }>;

  createdAt: Date;
  updatedAt: Date;
}

/** @deprecated Use numeric PackageStatus on KCD packages */
export type PackageStatus =
  | 'pending'
  | 'received'
  | 'in_transit'
  | 'delivered'
  | 'At Warehouse'
  | 'At Local Port'
  | 'In Transit'
  | 'Delivered'
  | 'Unknown';

const PackageSchema = new Schema<IPackage>(
  {
    PackageID: { type: String, trim: true },
    CourierID: { type: String, trim: true },
    ManifestID: { type: String, trim: true },
    CollectionID: { type: String, trim: true },
    TrackingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    ControlNumber: { type: String, trim: true },
    FirstName: { type: String, trim: true },
    LastName: { type: String, trim: true },
    UserCode: { type: String, trim: true, index: true },
    Weight: { type: Number, min: 0, default: 0 },
    Shipper: { type: String, trim: true },
    EntryStaff: { type: String, trim: true },
    EntryDate: { type: Date },
    EntryDateTime: { type: Date },
    Branch: { type: String, trim: true },
    Claimed: { type: Boolean, default: false },
    APIToken: { type: String, trim: true },
    ShowControls: { type: Boolean, default: false },
    ManifestCode: { type: String, trim: true },
    CollectionCode: { type: String, trim: true },
    Description: { type: String, trim: true },
    HSCode: { type: String, trim: true },
    Unknown: { type: Boolean, default: false },
    AIProcessed: { type: Boolean, default: false },
    OriginalHouseNumber: { type: String, trim: true },
    Cubes: { type: Number, min: 0, default: 0 },
    Length: { type: Number, min: 0, default: 0 },
    Width: { type: Number, min: 0, default: 0 },
    Height: { type: Number, min: 0, default: 0 },
    Pieces: { type: Number, min: 0, default: 1 },
    Discrepancy: { type: Boolean, default: false },
    DiscrepancyDescription: { type: String, trim: true },
    ServiceTypeID: { type: String, trim: true },
    HazmatCodeID: { type: String, trim: true },
    Coloaded: { type: Boolean, default: false },
    ColoadIndicator: { type: String, trim: true },
    PackageStatus: { type: Number, default: 0 },
    PackagePayments: { type: String, trim: true, default: '' },

    // Payment-related fields
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partially_paid'],
      default: 'pending'
    },
    amountPaid: { type: Number, min: 0, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'paypal', 'bank_transfer'],
      default: 'cash'
    },
    totalAmount: { type: Number, min: 0, default: 0 },
    paidAt: { type: Date },
    paidBy: { type: String, trim: true },
    paymentHistory: [{
      timestamp: { type: Date, default: Date.now },
      status: { type: String },
      amountPaid: { type: Number },
      paymentMethod: { type: String },
      note: { type: String },
      updatedBy: { type: String }
    }],

    // Manual charge fields for invoice calculation
    regularCharge: { type: Number, min: 0, default: 0 },
    customCharge: { type: Number, min: 0, default: 0 },
    chargeCurrency: { type: String, trim: true, default: 'JMD' },

    // Invoice-related fields for customer invoice upload system
    invoiceUploaded: { type: Boolean, default: false },
    invoiceStatus: { 
      type: String, 
      enum: ['pending', 'submitted', 'approved', 'rejected', 'billed'],
      default: 'pending'
    },
    invoiceFiles: [{
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
      filename: { type: String, trim: true },
      size: { type: Number, min: 0 },
      type: { type: String, trim: true },
      path: { type: String, trim: true }
    }],
    invoiceSubmittedAt: { type: Date },
    pricePaid: { type: Number, min: 0, default: 0 },
    pricePaidCurrency: { type: String, trim: true, default: 'USD' },
    billingInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    customerInvoice: {
      amount: { type: Number, min: 0 },
      currency: { type: String, trim: true },
      description: { type: String, trim: true },
      files: [{
        url: { type: String, trim: true },
        publicId: { type: String, trim: true },
        filename: { type: String, trim: true },
        size: { type: Number, min: 0 },
        type: { type: String, trim: true }
      }],
      submittedAt: { type: Date }
    },

    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    customer: { type: Schema.Types.ObjectId, ref: 'User' },
    source: {
      type: String,
      enum: ['manual', 'kcd_webhook', 'api', 'bulk_upload'],
      default: 'manual',
      trim: true,
    },
    sourceDetails: {
      webhookId: { type: String, trim: true },
      apiEndpoint: { type: String, trim: true },
      syncedAt: { type: Date },
      syncStatus: {
        type: String,
        enum: ['pending', 'synced', 'failed'],
        default: 'synced',
      },
      lastSyncError: { type: String, trim: true },
    },
  },
  { timestamps: true, strict: false }
);

// Pre-save hook to strip hyphens from UserCode and userCode
PackageSchema.pre('save', function(next) {
  if (this.UserCode) {
    this.UserCode = this.UserCode.replace(/-/g, '').toUpperCase();
  }
  if ((this as any).userCode) {
    (this as any).userCode = (this as any).userCode.replace(/-/g, '').toUpperCase();
  }
  next();
});

PackageSchema.index({ userId: 1 });
PackageSchema.index({ PackageStatus: 1 });
PackageSchema.index({ createdAt: -1 });
PackageSchema.index({ Branch: 1 });

const PackageModel =
  (models && models.Package) ||
  model<IPackage>('Package', PackageSchema);

export { PackageModel as Package };
export default PackageModel;
