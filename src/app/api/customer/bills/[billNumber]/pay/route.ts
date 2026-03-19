// src/app/api/customer/bills/[billNumber]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Bill, IBill } from '@/models/Bill';
import Package from '@/models/Package';
import { Types } from 'mongoose';

// POST - Process payment for a bill
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ billNumber: string }> }
) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billNumber } = await params;
    const paymentData = await req.json();

    await dbConnect();

    // Find the bill without lean so we can update it
    const bill = await Bill.findOne({
      billNumber,
      customerId: new Types.ObjectId(userId),
      status: { $in: ['pending', 'sent', 'overdue'] }
    }) as IBill | null;

    if (!bill) {
      return NextResponse.json({ 
        error: 'Bill not found or already paid' 
      }, { status: 404 });
    }

    // Validate payment data
    const { 
      paymentMethod,
      paymentId,
      paidAmount,
    } = paymentData;

    if (!paymentMethod || !paymentId) {
      return NextResponse.json({ 
        error: 'Payment method and payment ID are required' 
      }, { status: 400 });
    }

    // Verify paid amount matches bill total
    const expectedAmount = bill.totalAmount;
    const actualPaidAmount = paidAmount || expectedAmount;

    if (Math.abs(actualPaidAmount - expectedAmount) > 0.01) {
      return NextResponse.json({ 
        error: `Payment amount mismatch. Expected: ${expectedAmount}, Received: ${actualPaidAmount}` 
      }, { status: 400 });
    }

    // Update bill status
    bill.status = 'paid';
    bill.paidAt = new Date();
    bill.paidAmount = actualPaidAmount;
    bill.paymentId = paymentId;
    bill.paymentGateway = paymentMethod;

    await bill.save();

    // Update all packages in the bill to "Ready for Delivery"
    const packageIds = bill.packages.map((p: IBill['packages'][0]) => p.packageId);
    
    await Package.updateMany(
      { 
        _id: { $in: packageIds },
        userId: new Types.ObjectId(userId)
      },
      {
        $set: {
          status: 'ready_for_delivery',
          paymentStatus: 'paid',
          amountPaid: actualPaidAmount
        },
        $push: {
          history: {
            status: 'ready_for_delivery',
            at: new Date(),
            note: `Payment received via ${paymentMethod}. Bill: ${billNumber}`
          }
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      bill: {
        billNumber: bill.billNumber,
        status: 'paid',
        paidAt: bill.paidAt?.toISOString(),
        paidAmount: bill.paidAmount,
        paymentMethod: bill.paymentGateway
      }
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
