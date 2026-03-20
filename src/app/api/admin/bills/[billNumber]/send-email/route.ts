// src/app/api/admin/bills/[billNumber]/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { dbConnect } from '@/lib/db';
import { Bill, IBill } from '@/models/Bill';
import User from '@/models/User';
import { emailService } from '@/lib/email-service';

// POST - Send billing email to customer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ billNumber: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { billNumber } = await params;

    // Find the bill
    const bill = await Bill.findOne({ billNumber }) as IBill | null;
    
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Get customer details
    const customer = await User.findById(bill.customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get customer name from available fields
    const getCustomerName = (customer: any) => {
      if (customer.name) return customer.name;
      if (customer.firstName && customer.lastName) return `${customer.firstName} ${customer.lastName}`;
      if (customer.firstName) return customer.firstName;
      return 'Valued Customer';
    };

    // Generate payment link with correct domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://clean-j-shipping.vercel.app';
    const paymentLink = `${baseUrl}/customer/pay/${billNumber}`;

    // Send billing email with package content/description
    const packagesWithContent = await Promise.all(
      bill.packages.map(async (pkg: IBill['packages'][0]) => {
        // Fetch the full package details to get content/description
        const fullPackage = await (await import('@/models/Package')).default.findById(pkg.packageId);
        
        return {
          trackingNumber: pkg.trackingNumber,
          shipper: pkg.shipper || 'Unknown',
          weight: pkg.weight || 0,
          itemValue: pkg.itemValue,
          shippingFee: pkg.shippingFee,
          customsFee: pkg.customsFee,
          total: pkg.total,
          content: fullPackage?.content || fullPackage?.description || fullPackage?.itemDescription || 'N/A'
        };
      })
    );

    const emailSent = await emailService.sendBillingEmail({
      to: customer.email,
      customerName: getCustomerName(customer),
      billNumber: bill.billNumber,
      packages: packagesWithContent,
      itemTotal: bill.itemTotal,
      shippingFee: bill.shippingFee,
      customsFee: bill.customsFee,
      additionalFees: bill.additionalFees || [],
      totalAmount: bill.totalAmount,
      paymentLink
    });

    if (!emailSent) {
      return NextResponse.json({ 
        error: 'Failed to send billing email',
        billNumber
      }, { status: 500 });
    }

    // Update bill status to 'sent' and record sent time
    bill.status = 'sent';
    bill.sentAt = new Date();
    await bill.save();

    return NextResponse.json({
      success: true,
      message: 'Billing email sent successfully',
      billNumber,
      customerEmail: customer.email
    });

  } catch (error) {
    console.error('Error sending billing email:', error);
    return NextResponse.json(
      { error: 'Failed to send billing email' },
      { status: 500 }
    );
  }
}
