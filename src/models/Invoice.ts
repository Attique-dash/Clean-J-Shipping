import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  taxAmount: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paymentTerms: number; // in days
  currency: string;
  exchangeRate?: number;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    country: string;
    taxId?: string;
  };
  items: IInvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  discountAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  terms?: string;
  paymentInstructions?: string;
  signature?: {
    url: string;
    signedAt: Date;
    signedBy: string;
  };
  package: mongoose.Types.ObjectId;
  shipment?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  amount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  total: { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { 
      type: String, 
      required: false, // Pre-save hook will generate this, so it's not required at creation
      unique: true,
      index: true 
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft'
    },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: false }, // Pre-save hook will set this if not provided
    paymentTerms: { type: Number, default: 15 }, // 15 days
    currency: { type: String, default: 'USD' },
    exchangeRate: { type: Number, default: 1 },
    customer: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      address: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
      taxId: String
    },
    items: [invoiceItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0 },
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: false
      },
      value: { type: Number, min: 0, required: false }
    },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    notes: String,
    terms: String,
    paymentInstructions: String,
    signature: {
      url: String,
      signedAt: Date,
      signedBy: String
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: false // Made optional to support invoices created from generator
    },
    shipment: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      required: false
    }
  },
  { timestamps: true }
);

// Generate invoice number before saving
invoiceSchema.pre('save', async function(next) {
  if (this.isNew) {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const lastInvoice = await mongoose.model('Invoice')
      .findOne({ invoiceNumber: new RegExp(`^${prefix}-${year}-\\d{4}$`) })
      .sort({ invoiceNumber: -1 })
      .limit(1);

    let sequence = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0', 10);
      sequence = lastNumber + 1;
    }
    
    this.invoiceNumber = `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
    
    // Set default due date if not set
    if (!this.dueDate) {
      const dueDate = new Date(this.issueDate);
      dueDate.setDate(dueDate.getDate() + (this.paymentTerms || 15));
      this.dueDate = dueDate;
    }
    
    // Calculate totals
    this.calculateTotals();
  }
  
  next();
});

// Calculate invoice totals
invoiceSchema.methods.calculateTotals = function() {
  // Calculate items total
  this.subtotal = this.items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const amount = qty * price;
    const taxAmount = amount * (taxRate / 100);
    item.amount = Number(amount) || 0;
    item.taxAmount = Number(taxAmount) || 0;
    item.total = Number(amount + taxAmount) || 0;
    return sum + item.total;
  }, 0);
  this.subtotal = Number(this.subtotal) || 0;

  // Calculate discount
  let discountAmount = 0;
  if (this.discount) {
    if (this.discount.type === 'percentage') {
      const discountValue = Number(this.discount.value) || 0;
      discountAmount = this.subtotal * (discountValue / 100);
    } else {
      const discountValue = Number(this.discount.value) || 0;
      discountAmount = Math.min(discountValue, this.subtotal);
    }
  }
  // Use existing discountAmount if already set and valid
  if (this.discountAmount && !isNaN(this.discountAmount) && isFinite(this.discountAmount)) {
    discountAmount = Number(this.discountAmount);
  }
  this.discountAmount = Number(discountAmount) || 0;

  // Calculate tax total
  this.taxTotal = this.items.reduce((sum, item) => {
    return sum + (Number(item.taxAmount) || 0);
  }, 0);
  this.taxTotal = Number(this.taxTotal) || 0;
  
  // Calculate grand total
  this.total = this.subtotal + this.taxTotal - this.discountAmount;
  this.total = Number(this.total) || 0;
  
  // Update balance due
  const amountPaid = Number(this.amountPaid) || 0;
  this.balanceDue = this.total - amountPaid;
  this.balanceDue = Number(this.balanceDue) || 0;
  
  // Update status based on payment
  if (this.balanceDue <= 0 && this.total > 0) {
    this.status = 'paid';
  } else if (this.status === 'sent' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
};

// Create a text index for search
invoiceSchema.index({
  'invoiceNumber': 'text',
  'customer.name': 'text',
  'customer.email': 'text',
  'customer.taxId': 'text'
});

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);

