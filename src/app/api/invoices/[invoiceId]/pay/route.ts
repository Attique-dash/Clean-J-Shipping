// Invoice Payment API
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Invoice from '@/models/Invoice';
import { validatePaymentToken } from '@/lib/payment-service';
import { emailService } from '@/lib/email-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    await dbConnect();
    
    const body = await request.json();
    const { token, paymentMethod, amount } = body;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    // Validate token
    if (!validatePaymentToken(token, invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 403 }
      );
    }

    // Find invoice
    const invoice = await Invoice.findById(invoiceId)
      .populate('userId', 'firstName lastName email');

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      );
    }

    // Validate amount
    if (Math.abs(amount - (invoice as any).total) > 0.01) {
      return NextResponse.json(
        { error: 'Payment amount does not match invoice total' },
        { status: 400 }
      );
    }

    // Update invoice status
    (invoice as any).status = 'paid';
    (invoice as any).amountPaid = amount;
    (invoice as any).balanceDue = 0;
    (invoice as any).paidAt = new Date();
    (invoice as any).paymentMethod = paymentMethod;
    
    // Add to payment history
    if (!(invoice as any).paymentHistory) {
      (invoice as any).paymentHistory = [];
    }
    
    (invoice as any).paymentHistory.push({
      amount,
      date: new Date(),
      method: paymentMethod,
      reference: `PAY-${Date.now()}`
    });

    await invoice.save();

    // Send payment confirmation email
    if ((invoice as any).userId?.email) {
      await emailService.sendPaymentConfirmation({
        to: (invoice as any).userId.email,
        customerName: `${(invoice as any).userId.firstName} ${(invoice as any).userId.lastName}`,
        amount,
        currency: (invoice as any).currency || 'JMD',
        transactionId: (invoice as any).paymentHistory[(invoice as any).paymentHistory.length - 1]?.reference || '',
        date: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      invoiceNumber: (invoice as any).invoiceNumber,
      transactionId: (invoice as any).paymentHistory[(invoice as any).paymentHistory.length - 1]?.reference
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
