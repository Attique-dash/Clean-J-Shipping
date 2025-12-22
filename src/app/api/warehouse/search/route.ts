// src/app/api/warehouse/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Package from '@/models/Package';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query) {
      return new NextResponse(JSON.stringify({ results: [] }), { status: 200 });
    }

    await connectToDatabase();

    // Search packages
    const packages = await Package.find({
      $or: [
        { trackingNumber: { $regex: query, $options: 'i' } },
        { 'sender.name': { $regex: query, $options: 'i' } },
        { 'sender.email': { $regex: query, $options: 'i' } },
        { 'recipient.name': { $regex: query, $options: 'i' } },
        { 'recipient.email': { $regex: query, $options: 'i' } },
        { 'recipient.shippingId': { $regex: query, $options: 'i' } },
      ],
    })
      .limit(10)
      .lean();

    // Search customers
    const customers = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { shippingId: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ],
      role: 'customer',
    })
      .limit(10)
      .lean();

    // Format results
    const results = [
      ...packages.map(pkg => ({
        _id: pkg._id.toString(),
        type: 'package' as const,
        trackingNumber: pkg.trackingNumber,
        status: pkg.status,
      })),
      ...customers.map(customer => ({
        _id: customer._id.toString(),
        type: 'customer' as const,
        name: customer.name,
        email: customer.email,
        shippingId: customer.shippingId,
      })),
    ];

    return new NextResponse(JSON.stringify({ results }), { status: 200 });
  } catch (error) {
    console.error('Search error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to perform search' }),
      { status: 500 }
    );
  }
}