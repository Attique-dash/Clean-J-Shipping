// my-app/src/models/Invoice.ts
import { Schema, model, models, Document, Model } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  taxAmount: number;
  total: number;
  packageId?: string;
  trackingNumber?: string;
  serviceType?: string;
}

export interface IInvoice extends Document {
  userId?: any; // Add userId field for easier querying
  invoiceNumber: string;
  invoiceType: 'billing' | 'commercial' | 'system'; // NEW: Invoice type separation
  customer: {
    id: string;
    name: string;
    email: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
  };
  items: IInvoiceItem[];
  status: 'draft' | 'sent' | 'paid' | 'unpaid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paymentTerms: number;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  package?: any;
  shipment?: any;
  paymentHistory?: Array<{
    amount: number;
    date: Date;
    method: string;
    reference?: string;
  }>;
  // Customer invoice upload fields
  tracking_number?: string;
  item_description?: string;
  item_category?: string;
  item_quantity?: number;
  hs_code?: string;
  declared_value?: number;
  supplier_name?: string;
  supplier_address?: string;
  purchase_date?: string;
  files?: Array<{
    originalName?: string;
    filename?: string;
    path?: string;
    size?: number;
    type?: string;
  }>;
  upload_date?: Date;
  createdAt: Date;
  updatedAt: Date;
  calculateTotals(): void;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  amount: { type: Number, required: true, default: 0 },
  taxAmount: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 },
  packageId: { type: String },
  trackingNumber: { type: String },
  serviceType: { type: String }
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // Add userId field
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  invoiceType: {
    type: String,
    enum: ['billing', 'commercial', 'system'],
    default: 'billing',
    required: true
  },
  customer: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  items: {
    type: [InvoiceItemSchema],
    required: true,
    validate: {
      validator: function(items: IInvoiceItem[]) {
        return items && items.length > 0;
      },
      message: 'At least one item is required'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'unpaid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  paymentTerms: { type: Number, default: 30 },
  currency: { type: String, default: 'USD' },
  exchangeRate: { type: Number, default: 1 },
  subtotal: { type: Number, required: true, default: 0 },
  taxTotal: { type: Number, required: true, default: 0 },
  discountAmount: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, required: true, default: 0 },
  notes: String,
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    value: Number
  },
  package: { type: Schema.Types.ObjectId, ref: 'Package' },
  shipment: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  paymentHistory: [{
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    method: { type: String, required: true },
    reference: String
  }],
  // Customer invoice upload fields
  tracking_number: { type: String, trim: true, index: true },
  item_description: { type: String, trim: true },
  item_category: { type: String, trim: true },
  item_quantity: { type: Number, min: 1, default: 1 },
  hs_code: { type: String, trim: true },
  declared_value: { type: Number, min: 0 },
  supplier_name: { type: String, trim: true },
  supplier_address: { type: String, trim: true },
  purchase_date: { type: Date },
  files: [{
    originalName: { type: String, trim: true },
    filename: { type: String, trim: true },
    path: { type: String, trim: true },
    size: { type: Number, min: 0 },
    type: { type: String, trim: true }
  }],
  upload_date: { type: Date }
}, {
  timestamps: true
});

// Index for text search
InvoiceSchema.index({ 
  invoiceNumber: 'text', 
  'customer.name': 'text', 
  'customer.email': 'text' 
});

// Method to calculate totals
InvoiceSchema.methods.calculateTotals = function() {
  // Calculate item totals
  this.items.forEach((item: IInvoiceItem) => {
    item.amount = item.quantity * item.unitPrice;
    item.taxAmount = item.amount * (item.taxRate / 100);
    item.total = item.amount + item.taxAmount;
  });

  // Calculate subtotal (sum of all item amounts before tax)
  this.subtotal = this.items.reduce((sum: number, item: IInvoiceItem) => sum + item.amount, 0);

  // Calculate tax total
  this.taxTotal = this.items.reduce((sum: number, item: IInvoiceItem) => sum + item.taxAmount, 0);

  // Calculate discount amount if discount is set
  if (this.discount) {
    if (this.discount.type === 'percentage') {
      this.discountAmount = this.subtotal * (this.discount.value / 100);
    } else if (this.discount.type === 'fixed') {
      this.discountAmount = this.discount.value;
    }
  }

  // Ensure discountAmount is valid
  this.discountAmount = Number(this.discountAmount) || 0;

  // Calculate total
  this.total = this.subtotal + this.taxTotal - this.discountAmount;

  // Calculate balance due
  this.balanceDue = this.total - this.amountPaid;
};

// Pre-save hook to generate invoice number and calculate totals
InvoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const InvoiceModel = this.constructor as Model<IInvoice>;
    
    // Find the last invoice number for this year
    const lastInvoice = await InvoiceModel.findOne({
      invoiceNumber: new RegExp(`^INV-${year}-`)
    }).sort({ invoiceNumber: -1 }).limit(1);

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-\d{4}-(\d{4})/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    this.invoiceNumber = `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  // Always calculate totals before saving
  this.calculateTotals();
  
  next();
});

// Pre-update hook to recalculate totals
InvoiceSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  
  if (update.$set && update.$set.items) {
    // Calculate item totals
    update.$set.items.forEach((item: IInvoiceItem) => {
      item.amount = item.quantity * item.unitPrice;
      item.taxAmount = item.amount * (item.taxRate / 100);
      item.total = item.amount + item.taxAmount;
    });

    // Calculate subtotal
    const subtotal = update.$set.items.reduce((sum: number, item: IInvoiceItem) => sum + item.amount, 0);
    update.$set.subtotal = subtotal;

    // Calculate tax total
    const taxTotal = update.$set.items.reduce((sum: number, item: IInvoiceItem) => sum + item.taxAmount, 0);
    update.$set.taxTotal = taxTotal;

    // Calculate discount
    let discountAmount = 0;
    if (update.$set.discount) {
      if (update.$set.discount.type === 'percentage') {
        discountAmount = subtotal * (update.$set.discount.value / 100);
      } else if (update.$set.discount.type === 'fixed') {
        discountAmount = update.$set.discount.value;
      }
    }
    update.$set.discountAmount = discountAmount;

    // Calculate total
    const total = subtotal + taxTotal - discountAmount;
    update.$set.total = total;

    // Calculate balance due
    const amountPaid = update.$set.amountPaid || 0;
    update.$set.balanceDue = total - amountPaid;
  }
  
  next();
});

const Invoice = (models && models.Invoice) || model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;