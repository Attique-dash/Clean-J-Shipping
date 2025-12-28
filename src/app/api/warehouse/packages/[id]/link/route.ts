// src/app/api/warehouse/packages/[id]/link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Package from '@/models/Package';
import User from '@/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { customerId } = await request.json();

    if (!customerId) {
      return new NextResponse(
        JSON.stringify({ error: 'Customer ID is required' }),
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the customer
    const customer = await User.findById(customerId);
    if (!customer) {
      return new NextResponse(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404 }
      );
    }

    // Update the package with customer information
    const pkg = await Package.findById(id);
    if (!pkg) {
      return new NextResponse(
        JSON.stringify({ error: 'Package not found' }),
        { status: 404 }
      );
    }

    // Update recipient information
    pkg.recipient = {
      name: customer.name,
      email: customer.email,
      shippingId: customer.shippingId,
      phone: customer.phone,
      address: customer.address?.street,
    };

    // Update status to received
    pkg.status = 'received';

    // Add to history
    if (!Array.isArray(pkg.history)) pkg.history = [];
    pkg.history.push({
      status: 'received',
      at: new Date(),
      note: 'Package linked to customer',
    });

    await pkg.save();

    return new NextResponse(JSON.stringify(pkg), { status: 200 });
  } catch (error) {
    console.error('Error linking package to customer:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to link package to customer' }),
      { status: 500 }
    );
  }
}