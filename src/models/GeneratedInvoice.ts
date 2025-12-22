// my-app/src/models/GeneratedInvoice.ts
import mongoose, { Schema, Document } from "mongoose";

interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IGeneratedInvoice extends Document {
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  issueDate: Date;
  dueDate?: Date;
  items: IInvoiceItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
});

const GeneratedInvoiceSchema = new Schema<IGeneratedInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    notes: { type: String },
    currency: { type: String, default: "USD" },
    status: { 
      type: String, 
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft" 
    },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

GeneratedInvoiceSchema.index({ customerId: 1 });
GeneratedInvoiceSchema.index({ status: 1 });
GeneratedInvoiceSchema.index({ createdAt: -1 });

export const GeneratedInvoice = 
  mongoose.models.GeneratedInvoice || 
  mongoose.model<IGeneratedInvoice>("GeneratedInvoice", GeneratedInvoiceSchema);