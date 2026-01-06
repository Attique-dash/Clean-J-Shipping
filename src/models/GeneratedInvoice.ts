import mongoose, { Schema, Document } from 'mongoose';

export interface IGeneratedInvoice extends Document {
  invoiceNumber?: string;
  customerId?: string;
  total?: number;
  paidAmount?: number;
  balance?: number;
  currency?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const GeneratedInvoiceSchema: Schema = new Schema({
  invoiceNumber: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  customerId: {
    type: String,
    required: false
  },
  total: {
    type: Number,
    required: false,
    default: 0
  },
  paidAmount: {
    type: Number,
    required: false,
    default: 0
  },
  balance: {
    type: Number,
    required: false,
    default: 0
  },
  currency: {
    type: String,
    required: false,
    default: "USD"
  },
  status: {
    type: String,
    required: false,
    default: "pending"
  }
}, {
  timestamps: true
});

export const GeneratedInvoice = mongoose.models.GeneratedInvoice || mongoose.model<IGeneratedInvoice>('GeneratedInvoice', GeneratedInvoiceSchema);
export default GeneratedInvoice;
