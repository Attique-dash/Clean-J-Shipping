// src/app/api/warehouse/packages/unknown/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Package from '@/models/Package';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await connectToDatabase();
    
    // Find packages with unknown status or missing recipient
    const packages = await Package.find({
      $or: [
        { status: 'unknown' },
        { 'recipient.shippingId': { $exists: false } }
      ]
    }).sort({ receivedAt: -1 });

    return new NextResponse(JSON.stringify({ packages }), { status: 200 });
  } catch (error) {
    console.error('Error fetching unknown packages:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch unknown packages' }),
      { status: 500 }
    );
  }
}