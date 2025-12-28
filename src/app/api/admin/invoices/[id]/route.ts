// my-app/src/app/api/admin/invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Invoice from '@/models/Invoice';
import { Types } from 'mongoose';

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

    // Format invoice with all fields
    const formattedInvoice = {
      _id: (invoice as any)._id?.toString() || '',
      invoiceNumber: (invoice as any).invoiceNumber || '',
      status: (invoice as any).status || 'draft',
      issueDate: (invoice as any).issueDate ? new Date((invoice as any).issueDate).toISOString() : new Date().toISOString(),
      dueDate: (invoice as any).dueDate ? new Date((invoice as any).dueDate).toISOString() : new Date().toISOString(),
      currency: (invoice as any).currency || 'USD',
      subtotal: Number((invoice as any).subtotal) || 0,
      taxTotal: Number((invoice as any).taxTotal) || 0,
      discountAmount: Number((invoice as any).discountAmount) || 0,
      total: Number((invoice as any).total) || 0,
      amountPaid: Number((invoice as any).amountPaid) || 0,
      balanceDue: Number((invoice as any).balanceDue) || 0,
      customer: (invoice as any).customer ? {
        id: (invoice as any).customer.id || '',
        name: (invoice as any).customer.name || '',
        email: (invoice as any).customer.email || '',
        address: (invoice as any).customer.address || '',
        phone: (invoice as any).customer.phone || '',
        city: (invoice as any).customer.city || '',
        country: (invoice as any).customer.country || ''
      } : undefined,
      items: Array.isArray((invoice as any).items) ? (invoice as any).items.map((item: any) => ({
        description: item.description || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
        amount: Number(item.amount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        total: Number(item.total) || 0
      })) : [],
      package: (invoice as any).package ? {
        trackingNumber: (invoice as any).package.trackingNumber || (invoice as any).package.tracking_number,
        userCode: (invoice as any).package.userCode || (invoice as any).package.user_code
      } : undefined,
      paymentHistory: Array.isArray((invoice as any).paymentHistory) ? (invoice as any).paymentHistory.map((payment: any) => ({
        amount: Number(payment.amount) || 0,
        date: payment.date ? new Date(payment.date).toISOString() : new Date().toISOString(),
        method: payment.method || '',
        reference: payment.reference || ''
      })) : [],
      notes: (invoice as any).notes || '',
      createdAt: (invoice as any).createdAt ? new Date((invoice as any).createdAt).toISOString() : new Date().toISOString(),
      updatedAt: (invoice as any).updatedAt ? new Date((invoice as any).updatedAt).toISOString() : new Date().toISOString()
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