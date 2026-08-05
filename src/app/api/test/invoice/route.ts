// Test endpoint for invoice generation
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { generateInvoiceForPackage } from '@/app/api/warehouse/addpackage/subdir/invoice-generator';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Find a test customer
    const customer = await User.findOne({ role: 'customer' });
    
    if (!customer) {
      return NextResponse.json(
        { error: 'No test customer found' },
        { status: 404 }
      );
    }

    // Test invoice generation
    const result = await generateInvoiceForPackage(
      {
        trackingNumber: 'TEST-123456',
        userId: customer._id.toString(),
        customer,
        weight: 2.5,
        shipper: 'Amazon',
        description: 'Test package with electronics',
        shippingCost: 0,
        totalAmount: 2700, // regularCharge + customCharge
        entryDate: new Date()
      },
      {
        regularCharge: 1500,
        customCharge: 1200,
        currency: 'JMD',
        includeShipping: false
      }
    );

    return NextResponse.json({
      success: true,
      result,
      customer: {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email
      }
    });

  } catch (error) {
    console.error('Test invoice error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
