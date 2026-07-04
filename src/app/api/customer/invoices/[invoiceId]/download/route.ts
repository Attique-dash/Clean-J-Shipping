// src/app/api/customer/invoices/[invoiceId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import Invoice from '@/models/Invoice';
import Package from '@/models/Package';
import { Types } from 'mongoose';

function normalizeInvoiceAddress(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.values(parsed)
          .filter((part) => typeof part === 'string' && part.trim())
          .join(', ');
      }
    } catch {
      // not JSON
    }
    return trimmed;
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .filter((part) => typeof part === 'string' && part.trim())
      .join(', ');
  }
  return String(value);
}

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { invoiceId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'pdf';
    
    // Authenticate user
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (auth as { id?: string; _id?: string; uid?: string }).id || 
                  (auth as { id?: string; _id?: string; uid?: string })._id;
    const userRole = auth.role;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find invoice by invoiceNumber or _id
    const invoice = await Invoice.findOne({
      $or: [
        { invoiceNumber: invoiceId },
        { _id: Types.ObjectId.isValid(invoiceId) ? new Types.ObjectId(invoiceId) : null }
      ]
    }).populate('userId', 'firstName lastName email address phone').lean();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if user owns the invoice or is admin
    const invoiceUserId = (invoice as any).userId?._id?.toString() || (invoice as any).userId?.toString();
    if (userRole !== 'admin' && invoiceUserId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to view this invoice" },
        { status: 403 }
      );
    }

    // Get tracking number from package if available
    let trackingNumber = (invoice as any).tracking_number || (invoice as any).trackingNumber;
    
    // If invoice has a package reference, try to get tracking number from package
    if (!trackingNumber && (invoice as any).package) {
      const pkg = await Package.findById((invoice as any).package).select('TrackingNumber trackingNumber').lean();
      if (pkg) {
        trackingNumber = (pkg as any).TrackingNumber || (pkg as any).trackingNumber;
      }
    }

    // Transform invoice data for export
    const invoiceData = {
      invoice: {
        invoiceNumber: (invoice as any).invoiceNumber,
        issueDate: (invoice as any).issueDate || new Date(),
        dueDate: (invoice as any).dueDate || new Date(),
        status: (invoice as any).status || 'draft',
        currency: (invoice as any).currency || 'USD',
        subtotal: Number((invoice as any).subtotal) || 0,
        taxTotal: Number((invoice as any).taxTotal) || 0,
        discountAmount: Number((invoice as any).discountAmount) || 0,
        total: Number((invoice as any).total) || 0,
        amountPaid: Number((invoice as any).amountPaid) || 0,
        balanceDue: Number((invoice as any).balanceDue) || 0,
        notes: (invoice as any).notes || '',
        paymentHistory: ((invoice as any).paymentHistory || []).map((payment: any) => ({
          amount: Number(payment.amount) || 0,
          date: payment.date || new Date(),
          method: payment.method || 'Unknown',
          reference: payment.reference || ''
        })),
        customer: {
          name: (invoice as any).customer?.name || `${(invoice as any).userId?.firstName || ''} ${(invoice as any).userId?.lastName || ''}`.trim() || 'N/A',
          email: (invoice as any).customer?.email || (invoice as any).userId?.email || 'N/A',
          address: normalizeInvoiceAddress((invoice as any).customer?.address || (invoice as any).userId?.address || ''),
          phone: (invoice as any).customer?.phone || (invoice as any).userId?.phone || ''
        },
        items: ((invoice as any).items || []).map((item: any) => ({
          description: item.description || 'Service',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          taxRate: Number(item.taxRate) || 0,
          amount: Number(item.amount) || 0,
          taxAmount: Number(item.taxAmount) || 0,
          total: Number(item.total) || 0
        })),
        // Add tracking number to invoice data
        trackingNumber: trackingNumber || 'N/A'
      },
      // Add excel data if format is excel
      excelData: format === 'excel' ? {
        summary: {
          'Invoice Number': (invoice as any).invoiceNumber,
          'Customer Name': (invoice as any).customer?.name || `${(invoice as any).userId?.firstName || ''} ${(invoice as any).userId?.lastName || ''}`.trim() || 'N/A',
          'Customer Email': (invoice as any).customer?.email || (invoice as any).userId?.email || 'N/A',
          'Customer Phone': (invoice as any).customer?.phone || (invoice as any).userId?.phone || 'N/A',
          'Customer Address': normalizeInvoiceAddress((invoice as any).customer?.address || (invoice as any).userId?.address || '') || 'N/A',
          'Tracking Number': trackingNumber || 'N/A',
          'Issue Date': new Date((invoice as any).issueDate || new Date()).toLocaleDateString(),
          'Due Date': new Date((invoice as any).dueDate || new Date()).toLocaleDateString(),
          'Status': ((invoice as any).status || 'draft').toUpperCase(),
          'Currency': (invoice as any).currency || 'USD',
          'Subtotal': `$${(Number((invoice as any).subtotal) || 0).toFixed(2)}`,
          'Tax Total': `$${(Number((invoice as any).taxTotal) || 0).toFixed(2)}`,
          'Discount': `$${(Number((invoice as any).discountAmount) || 0).toFixed(2)}`,
          'Total Amount': `$${(Number((invoice as any).total) || 0).toFixed(2)}`,
          'Amount Paid': `$${(Number((invoice as any).amountPaid) || 0).toFixed(2)}`,
          'Balance Due': `$${(Number((invoice as any).balanceDue) || 0).toFixed(2)}`,
          'Notes': (invoice as any).notes || 'N/A'
        },
        items: ((invoice as any).items || []).map((item: any, index: number) => ({
          'Item #': index + 1,
          'Description': item.description || 'Service',
          'Quantity': Number(item.quantity) || 1,
          'Unit Price': `$${Number(item.unitPrice || 0).toFixed(2)}`,
          'Amount': `$${Number(item.amount || 0).toFixed(2)}`,
          'Tax Rate': `${Number(item.taxRate || 0)}%`,
          'Tax Amount': `$${Number(item.taxAmount || 0).toFixed(2)}`,
          'Line Total': `$${Number(item.total || 0).toFixed(2)}`
        }))
      } : null
    };

    return NextResponse.json(invoiceData);

  } catch (error) {
    console.error('Error fetching invoice for download:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice data' },
      { status: 500 }
    );
  }
}
