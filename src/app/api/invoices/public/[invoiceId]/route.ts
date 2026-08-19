// Public Invoice API - for payment page access
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Invoice from '@/models/Invoice';
import { validatePaymentToken } from '@/lib/payment-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    // Validate token (basic validation for now)
    if (!validatePaymentToken(token, invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 403 }
      );
    }

    // Find invoice
    const invoice = await Invoice.findById(invoiceId)
      .populate('userId', 'firstName lastName email')
      .lean();

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const invoiceData = {
      id: (invoice as any)._id,
      invoiceNumber: (invoice as any).invoiceNumber,
      customer: {
        name: (invoice as any).customer?.name || `${(invoice as any).userId?.firstName || ''} ${(invoice as any).userId?.lastName || ''}`.trim(),
        email: (invoice as any).customer?.email || (invoice as any).userId?.email || ''
      },
      items: (invoice as any).items || [],
      total: (invoice as any).total || 0,
      currency: (invoice as any).currency || 'JMD',
      status: (invoice as any).status || 'draft',
      issueDate: (invoice as any).issueDate,
      dueDate: (invoice as any).dueDate,
      trackingNumber: (invoice as any).tracking_number
    };

    return NextResponse.json(invoiceData);

  } catch (error) {
    console.error('Error fetching public invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
