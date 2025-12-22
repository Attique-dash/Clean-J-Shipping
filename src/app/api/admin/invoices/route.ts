import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Invoice, { IInvoice, IInvoiceItem } from '@/models/Invoice';
import { Types } from 'mongoose';

// Create a new invoice
export async function POST(req: NextRequest) {
  try {
    // ... (rest of the code remains the same)
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

    // Calculate discount amount properly (handle NaN and missing values)
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
    // Ensure discountAmount is a valid number (never NaN or Infinity)
    discountAmount = (isNaN(discountAmount) || !isFinite(discountAmount)) ? 0 : Math.max(0, discountAmount);
    // Convert to number explicitly to avoid any type issues
    discountAmount = Number(discountAmount) || 0;

    // Calculate tax amounts for items if taxRate is provided
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

    // Ensure dueDate is set (required field)
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const paymentTerms = Number(data.paymentTerms) || 30;
    let dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
    if (!dueDate) {
      dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);
    }

    // Create invoice data with proper calculations
    const invoiceData: Partial<IInvoice> = {
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
      discountAmount: discountAmount, // Always a valid number (0 or positive)
    };

    // Only add discount if it exists
    if (data.discount && typeof data.discount === 'object') {
      invoiceData.discount = data.discount;
    }

    // Only add package if it exists and is a valid ObjectId
    if (data.package) {
      try {
        invoiceData.package = new Types.ObjectId(data.package);
      } catch {
        // Invalid ObjectId, skip it
        console.warn('Invalid package ID provided:', data.package);
      }
    }

    // Create a new invoice (the pre-save hook will generate the invoice number)
    const invoice = new Invoice(invoiceData);

    // Calculate totals (this will recalculate everything properly)
    invoice.calculateTotals();
    
    // Ensure all numeric fields are valid before saving
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
    
    // Provide more detailed error message
    let errorMessage = 'Failed to create invoice';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'errors' in error) {
      // Mongoose validation errors
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

    // Format invoices for frontend
    const formattedInvoices = invoices.map((inv: Record<string, unknown>) => ({
      _id: (inv._id as Types.ObjectId)?.toString() || '',
      invoiceNumber: (inv.invoiceNumber as string) || '',
      status: (inv.status as string) || 'draft',
      issueDate: inv.issueDate ? new Date(inv.issueDate as Date).toISOString() : new Date().toISOString(),
      dueDate: inv.dueDate ? new Date(inv.dueDate as Date).toISOString() : new Date().toISOString(),
      currency: (inv.currency as string) || 'USD',
      total: (inv.total as number) || 0,
      amountPaid: (inv.amountPaid as number) || 0,
      balanceDue: (inv.balanceDue as number) || (inv.total as number) || 0,
      customer: inv.customer ? {
        id: ((inv.customer as Record<string, unknown>).id as string) || '',
        name: ((inv.customer as Record<string, unknown>).name as string) || '',
        email: ((inv.customer as Record<string, unknown>).email as string) || ''
      } : undefined,
      package: inv.package ? {
        trackingNumber: ((inv.package as Record<string, unknown>).trackingNumber as string) || ((inv.package as Record<string, unknown>).tracking_number as string),
        userCode: ((inv.package as Record<string, unknown>).userCode as string) || ((inv.package as Record<string, unknown>).user_code as string)
      } : undefined
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
