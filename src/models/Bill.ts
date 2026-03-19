// src/models/Bill.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export type BillStatus = 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface IBillPackage {
  packageId: Types.ObjectId;
  trackingNumber: string;
  shipper?: string;
  weight?: number;
  itemValue: number;
  shippingFee: number;
  customsFee: number;
  total: number;
}

export interface IBill extends Document {
  billNumber: string;
  customerId: Types.ObjectId;
  customerName?: string;
  customerEmail?: string;
  packages: IBillPackage[];
  
  // Financial Details
  itemTotal: number;        // Sum of all item values (pricePaid)
  shippingFee: number;      // Admin added shipping fees
  customsFee: number;       // Calculated customs/duty fees
  additionalFees?: Array<{
    label: string;
    amount: number;
  }>;
  totalAmount: number;      // Grand total
  
  // Status & Tracking
  status: BillStatus;
  
  // Payment Information
  paymentUrl?: string;
  paymentGateway?: string;
  paymentId?: string;
  paidAt?: Date;
  paidAmount?: number;
  
  // Invoice Reference
  invoiceId?: Types.ObjectId;
  
  // Notes
  adminNotes?: string;
  customerNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

const BillPackageSchema = new Schema<IBillPackage>({
  packageId: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
  trackingNumber: { type: String, required: true },
  shipper: { type: String, trim: true },
  weight: { type: Number, min: 0 },
  itemValue: { type: Number, required: true, min: 0 },
  shippingFee: { type: Number, required: true, min: 0, default: 0 },
  customsFee: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 }
}, { _id: false });

const BillSchema = new Schema<IBill>({
  billNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerName: { type: String, trim: true },
  customerEmail: { type: String, trim: true, lowercase: true },
  
  packages: {
    type: [BillPackageSchema],
    required: true,
    validate: {
      validator: function(packages: IBillPackage[]) {
        return packages && packages.length > 0;
      },
      message: 'At least one package is required'
    }
  },
  
  // Financial Details
  itemTotal: { type: Number, required: true, min: 0, default: 0 },
  shippingFee: { type: Number, required: true, min: 0, default: 0 },
  customsFee: { type: Number, required: true, min: 0, default: 0 },
  additionalFees: [{
    label: { type: String, trim: true },
    amount: { type: Number, min: 0 }
  }],
  totalAmount: { type: Number, required: true, min: 0, default: 0 },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Payment Information
  paymentUrl: { type: String, trim: true },
  paymentGateway: { type: String, trim: true },
  paymentId: { type: String, trim: true },
  paidAt: { type: Date },
  paidAmount: { type: Number, min: 0, default: 0 },
  
  // Invoice Reference
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  
  // Notes
  adminNotes: { type: String, trim: true },
  customerNotes: { type: String, trim: true }
}, {
  timestamps: true
});

// Indexes for common queries
BillSchema.index({ customerId: 1, status: 1 });
BillSchema.index({ createdAt: -1 });
BillSchema.index({ status: 1, createdAt: -1 });

// Pre-save hook to generate bill number
BillSchema.pre('save', async function(next) {
  if (this.isNew && !this.billNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Find the last bill number for this year/month
    const BillModel = this.constructor as typeof model;
    const lastBill = await (BillModel as any).findOne({
      billNumber: new RegExp(`^BILL-${year}${month}-`)
    }).sort({ billNumber: -1 }).limit(1);

    let nextNumber = 1;
    if (lastBill && lastBill.billNumber) {
      const match = lastBill.billNumber.match(/BILL-\d{6}-(\d{4})/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    this.billNumber = `BILL-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
  }

  // Calculate totals
  if (this.packages && this.packages.length > 0) {
    this.itemTotal = this.packages.reduce((sum, pkg) => sum + (pkg.itemValue || 0), 0);
    this.shippingFee = this.packages.reduce((sum, pkg) => sum + (pkg.shippingFee || 0), 0);
    this.customsFee = this.packages.reduce((sum, pkg) => sum + (pkg.customsFee || 0), 0);
    
    // Calculate package totals
    this.packages.forEach(pkg => {
      pkg.total = (pkg.itemValue || 0) + (pkg.shippingFee || 0) + (pkg.customsFee || 0);
    });
    
    // Calculate grand total
    const additionalFeesTotal = (this.additionalFees || []).reduce((sum, fee) => sum + (fee.amount || 0), 0);
    this.totalAmount = this.itemTotal + this.shippingFee + this.customsFee + additionalFeesTotal;
  }

  next();
});

const BillModel =
  (models && models.Bill) ||
  model<IBill>('Bill', BillSchema);

export { BillModel as Bill };
export default BillModel;
