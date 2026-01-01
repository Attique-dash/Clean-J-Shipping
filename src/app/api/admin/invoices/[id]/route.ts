// my-app/src/app/api/admin/invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Invoice from '@/models/Invoice';
import { Types } from 'mongoose';

 type InvoicePaymentHistoryLean = {
   amount?: unknown;
   date?: unknown;
   method?: unknown;
   reference?: unknown;
 };

 type InvoiceItemLean = {
   description?: unknown;
   quantity?: unknown;
   unitPrice?: unknown;
   taxRate?: unknown;
   amount?: unknown;
   taxAmount?: unknown;
   total?: unknown;
 };

 type InvoiceLean = {
   _id?: { toString: () => string } | string;
   invoiceNumber?: unknown;
   status?: unknown;
   issueDate?: unknown;
   dueDate?: unknown;
   currency?: unknown;
   subtotal?: unknown;
   taxTotal?: unknown;
   discountAmount?: unknown;
   total?: unknown;
   amountPaid?: unknown;
   balanceDue?: unknown;
   customer?: {
     id?: unknown;
     name?: unknown;
     email?: unknown;
     address?: unknown;
     phone?: unknown;
     city?: unknown;
     country?: unknown;
   };
   items?: InvoiceItemLean[];
   package?: {
     trackingNumber?: unknown;
     tracking_number?: unknown;
     userCode?: unknown;
     user_code?: unknown;
   };
   paymentHistory?: InvoicePaymentHistoryLean[];
   notes?: unknown;
   createdAt?: unknown;
   updatedAt?: unknown;
 };

// Delete an invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    // Find and delete the invoice
    const invoice = await Invoice.findByIdAndDelete(id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Invoice deleted successfully',
      invoiceNumber: invoice.invoiceNumber 
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}

// Get a single invoice
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const invoice = await Invoice.findById(id)
      .populate('package', 'trackingNumber userCode')
      .populate('shipment', 'trackingNumber status')
      .lean();
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const inv = invoice as unknown as InvoiceLean;
    const now = new Date();
    const totalAmount = Number(inv.total) || 0;
    const paidFromHistory = Array.isArray(inv.paymentHistory)
      ? inv.paymentHistory.reduce((sum: number, p) => sum + (Number(p?.amount) || 0), 0)
      : 0;
    const paidAmount = paidFromHistory > 0 ? paidFromHistory : (Number(inv.amountPaid) || 0);
    const outstanding = Math.max(0, totalAmount - paidAmount);

    // Format invoice with all fields
    const formattedInvoice = {
      _id: typeof inv._id === 'string' ? inv._id : inv._id?.toString() || '',
      invoiceNumber: String(inv.invoiceNumber || ''),
      status: (() => {
        if (String(inv.status || '') === 'cancelled') return 'cancelled';
        if (String(inv.status || 'draft') === 'draft') return 'draft';
        if (outstanding <= 0) return 'paid';
        if (paidAmount > 0) return 'partially_paid';
        if (inv.dueDate && now > new Date(String(inv.dueDate))) return 'overdue';
        return 'unpaid';
      })(),
      issueDate: inv.issueDate ? new Date(String(inv.issueDate)).toISOString() : new Date().toISOString(),
      dueDate: inv.dueDate ? new Date(String(inv.dueDate)).toISOString() : new Date().toISOString(),
      currency: String(inv.currency || 'JMD'),
      subtotal: Number(inv.subtotal) || 0,
      taxTotal: Number(inv.taxTotal) || 0,
      discountAmount: Number(inv.discountAmount) || 0,
      total: Number(inv.total) || 0,
      amountPaid: paidAmount,
      balanceDue: outstanding,
      customer: inv.customer ? {
        id: String(inv.customer.id || ''),
        name: String(inv.customer.name || ''),
        email: String(inv.customer.email || ''),
        address: String(inv.customer.address || ''),
        phone: String(inv.customer.phone || ''),
        city: String(inv.customer.city || ''),
        country: String(inv.customer.country || '')
      } : undefined,
      items: Array.isArray(inv.items) ? inv.items.map((item) => ({
        description: String(item.description || ''),
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
        amount: Number(item.amount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        total: Number(item.total) || 0
      })) : [],
      package: inv.package ? {
        trackingNumber: String(inv.package.trackingNumber || inv.package.tracking_number || ''),
        userCode: String(inv.package.userCode || inv.package.user_code || '')
      } : undefined,
      paymentHistory: Array.isArray(inv.paymentHistory) ? inv.paymentHistory.map((payment) => ({
        amount: Number(payment.amount) || 0,
        date: payment.date ? new Date(String(payment.date)).toISOString() : new Date().toISOString(),
        method: String(payment.method || ''),
        reference: String(payment.reference || '')
      })) : [],
      notes: String(inv.notes || ''),
      createdAt: inv.createdAt ? new Date(String(inv.createdAt)).toISOString() : new Date().toISOString(),
      updatedAt: inv.updatedAt ? new Date(String(inv.updatedAt)).toISOString() : new Date().toISOString()
    };

    return NextResponse.json(formattedInvoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}