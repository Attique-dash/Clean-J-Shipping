// my-app/src/app/api/admin/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Invoice, { IInvoice, IInvoiceItem } from '@/models/Invoice';
import { Types } from 'mongoose';

// Get all invoices with pagination and filters
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'issueDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> & { issueDate?: { $gte?: Date; $lte?: Date } } = {};
    
    if (status) {
      query.status = status;
    }
    
    if (customerId) {
      query['customer.id'] = customerId;
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) {
        query.issueDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.issueDate.$lte = new Date(endDate);
      }
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate('package', 'trackingNumber userCode')
        .populate('shipment', 'trackingNumber status')
        .lean(),
      Invoice.countDocuments(query)
    ]);

    // Format invoices for frontend with ALL fields
    const formattedInvoices = invoices.map((inv: any) => ({
      _id: inv._id?.toString() || '',
      invoiceNumber: inv.invoiceNumber || '',
      status: inv.status || 'draft',
      issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString() : new Date().toISOString(),
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : new Date().toISOString(),
      currency: inv.currency || 'USD',
      // Financial fields - ensure they're numbers
      subtotal: Number(inv.subtotal) || 0,
      taxTotal: Number(inv.taxTotal) || 0,
      discountAmount: Number(inv.discountAmount) || 0,
      total: Number(inv.total) || 0,
      amountPaid: Number(inv.amountPaid) || 0,
      balanceDue: Number(inv.balanceDue) || 0,
      // Customer details
      customer: inv.customer ? {
        id: inv.customer.id || '',
        name: inv.customer.name || '',
        email: inv.customer.email || '',
        address: inv.customer.address || '',
        phone: inv.customer.phone || '',
        city: inv.customer.city || '',
        country: inv.customer.country || ''
      } : undefined,
      // Items array
      items: Array.isArray(inv.items) ? inv.items.map((item: any) => ({
        description: item.description || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
        amount: Number(item.amount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        total: Number(item.total) || 0
      })) : [],
      // Package info
      package: inv.package ? {
        trackingNumber: inv.package.trackingNumber || inv.package.tracking_number,
        userCode: inv.package.userCode || inv.package.user_code
      } : undefined,
      // Payment history
      paymentHistory: Array.isArray(inv.paymentHistory) ? inv.paymentHistory.map((payment: any) => ({
        amount: Number(payment.amount) || 0,
        date: payment.date ? new Date(payment.date).toISOString() : new Date().toISOString(),
        method: payment.method || '',
        reference: payment.reference || ''
      })) : [],
      // Notes
      notes: inv.notes || '',
      // Timestamps
      createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : new Date().toISOString()
    }));

    return NextResponse.json({
      data: formattedInvoices,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// Create a new invoice
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    // Validate required fields
    if (!data.customer || !data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Customer and at least one item are required' },
        { status: 400 }
      );
    }

    // Calculate subtotal from items
    const subtotal = data.items.reduce((sum: number, item: IInvoiceItem) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return sum + (qty * price);
    }, 0);

    // Calculate discount amount properly
    let discountAmount = 0;
    if (data.discount && typeof data.discount === 'object') {
      if (data.discount.type === 'percentage') {
        const discountValue = Number(data.discount.value) || 0;
        discountAmount = subtotal * (discountValue / 100);
      } else if (data.discount.type === 'fixed') {
        discountAmount = Number(data.discount.value) || 0;
      }
    } else if (typeof data.discountAmount === 'number' && !isNaN(data.discountAmount) && isFinite(data.discountAmount)) {
      discountAmount = data.discountAmount;
    }
    discountAmount = (isNaN(discountAmount) || !isFinite(discountAmount)) ? 0 : Math.max(0, discountAmount);
    discountAmount = Number(discountAmount) || 0;

    // Calculate tax amounts for items
    const itemsWithTax = data.items.map((item: IInvoiceItem) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const amount = qty * price;
      const taxAmount = amount * (taxRate / 100);
      return {
        description: item.description,
        quantity: qty,
        unitPrice: price,
        taxRate: taxRate,
        amount: Number(amount) || 0,
        taxAmount: Number(taxAmount) || 0,
        total: Number(amount + taxAmount) || 0,
      };
    });

    // Ensure dueDate is set
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const paymentTerms = Number(data.paymentTerms) || 30;
    let dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
    if (!dueDate) {
      dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);
    }

    // Create invoice data
    const invoiceData: Partial<IInvoice> = {
      userId: data.customer.id, // Set userId for easier customer access
      customer: data.customer,
      items: itemsWithTax,
      status: data.status || 'draft',
      issueDate: issueDate,
      dueDate: dueDate,
      paymentTerms: paymentTerms,
      currency: data.currency || 'USD',
      exchangeRate: Number(data.exchangeRate) || 1,
      amountPaid: Number(data.amountPaid) || 0,
      notes: data.notes || undefined,
      discountAmount: discountAmount,
    };

    if (data.discount && typeof data.discount === 'object') {
      invoiceData.discount = data.discount;
    }

    if (data.package) {
      try {
        invoiceData.package = new Types.ObjectId(data.package);
      } catch {
        console.warn('Invalid package ID provided:', data.package);
      }
    }

    const invoice = new Invoice(invoiceData);
    invoice.calculateTotals();
    
    // Ensure all numeric fields are valid
    invoice.discountAmount = Number(invoice.discountAmount) || 0;
    invoice.subtotal = Number(invoice.subtotal) || 0;
    invoice.taxTotal = Number(invoice.taxTotal) || 0;
    invoice.total = Number(invoice.total) || 0;
    invoice.amountPaid = Number(invoice.amountPaid) || 0;
    invoice.balanceDue = Number(invoice.balanceDue) || 0;
    
    await invoice.save();

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating invoice:', error);
    
    let errorMessage = 'Failed to create invoice';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'errors' in error) {
      const errorObj = error as { errors: Record<string, { message: string }> };
      const errorFields = Object.keys(errorObj.errors);
      const errorMessages = errorFields.map(field => {
        return `${field}: ${errorObj.errors[field].message}`;
      });
      errorMessage = errorMessages.join(', ');
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}