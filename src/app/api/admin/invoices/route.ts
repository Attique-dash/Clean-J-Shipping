import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Invoice, { IInvoice } from '@/models/Invoice';
import { Types } from 'mongoose';

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

    // Create a new invoice (the pre-save hook will generate the invoice number)
    const invoice = new Invoice({
      ...data,
      status: data.status || 'draft',
      currency: data.currency || 'USD',
      exchangeRate: data.exchangeRate || 1,
      amountPaid: data.amountPaid || 0,
    });

    // Calculate totals
    invoice.calculateTotals();
    
    await invoice.save();

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
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

    const query: any = {};
    
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
        .populate('package', 'tracking_number user_code')
        .populate('shipment', 'trackingNumber status')
        .lean(),
      Invoice.countDocuments(query)
    ]);

    return NextResponse.json({
      data: invoices,
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
