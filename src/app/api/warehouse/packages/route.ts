// src/app/api/warehouse/packages/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Package from '@/models/Package';
import { v4 as uuidv4 } from 'uuid';

// Get all packages
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await connectToDatabase();
    
    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { 'recipient.name': { $regex: search, $options: 'i' } },
        { 'recipient.shippingId': { $regex: search, $options: 'i' } },
        { 'sender.name': { $regex: search, $options: 'i' } },
      ];
    }

    const packages = await Package.find(query)
      .sort({ receivedAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await Package.countDocuments(query);

    return NextResponse.json({
      packages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch packages' }),
      { status: 500 }
    );
  }
}

// Create a new package
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const data = await request.json();
    
    // Generate tracking number if not provided
    if (!data.trackingNumber) {
      // Format: YYMMDD-XXXXXX (6 digits)
      const now = new Date();
      const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      data.trackingNumber = `${datePart}-${randomPart}`;
    }

    // Set received date to now if not provided
    if (!data.receivedAt) {
      data.receivedAt = new Date();
    }

    // Set status to unknown if recipient is not found
    if (!data.recipient || !data.recipient.shippingId) {
      data.status = 'unknown';
    } else {
      // Verify recipient exists
      const User = (await import('@/models/User')).default;
      const user = await User.findOne({ shippingId: data.recipient.shippingId });
      if (!user) {
        data.status = 'unknown';
      } else {
        data.recipient = {
          name: user.name,
          email: user.email,
          shippingId: user.shippingId,
        };
      }
    }

    const newPackage = new Package(data);
    await newPackage.save();

    return new NextResponse(JSON.stringify(newPackage), { status: 201 });
  } catch (error) {
    console.error('Error creating package:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create package' }),
      { status: 500 }
    );
  }
}