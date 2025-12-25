// src/app/api/customer/packages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Package } from '@/models/Package';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    console.log('Customer packages API called');
    
    // CRITICAL FIX: Always await getAuthFromRequest
    const auth = await getAuthFromRequest(req);
    
    console.log('Auth result:', auth ? 'Authenticated' : 'Not authenticated');
    
    // Check if user is authorized
    const authError = requireRole(auth, 'customer');
    if (authError) {
      console.log('Auth error:', authError);
      return authError;
    }

    // TypeScript now knows auth is not null - use consistent ID extraction
    const userId = auth!.id || auth!._id || auth!.uid;
    
    console.log('User ID extracted:', userId);

    if (!userId) {
      console.error('User ID not found in auth payload');
      return NextResponse.json(
        { error: 'User ID not found in authentication' },
        { status: 400 }
      );
    }

    console.log('Fetching packages for user:', userId);

    // Connect to database
    await dbConnect();

    // Fetch packages for this customer using userId
    const packages = await Package.find({
      userId: userId,
    })
    .select('trackingNumber status itemDescription weight senderName currentLocation receiverName updatedAt createdAt estimatedDelivery shippingCost totalAmount lastScan actualDelivery')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

    console.log(`Found ${packages.length} packages for user ${userId}`);

    // Get user information to include shippingId (userCode) in response
    const user = await User.findById(userId).select('shippingId').lean();
    const userCode = user?.shippingId || '';

    // Map to response format
    const mapped = packages.map((p) => ({
      id: p._id,
      tracking_number: p.trackingNumber,
      trackingNumber: p.trackingNumber,
      status: p.status,
      description: p.itemDescription,
      weight_kg: p.weight,
      weight: p.weight ? `${p.weight} kg` : undefined,
      userCode: userCode,
      shipper: p.senderName,
      current_location: p.currentLocation,
      destination: p.receiverName || 'Receiver name only available',
      updated_at: p.updatedAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      created_at: p.createdAt?.toISOString(),
      createdAt: p.createdAt?.toISOString(),
      estimated_delivery: p.estimatedDelivery?.toISOString(),
      invoice_status: 'pending', // Default since paymentStatus field not available
      shipping_cost: p.shippingCost,
      total_amount: p.totalAmount,
      last_scan: p.lastScan?.toISOString(),
      actual_delivery: p.actualDelivery?.toISOString(),
    }));

    console.log('Successfully mapped packages and sending response');

    return NextResponse.json({
      packages: mapped,
      total_packages: mapped.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching packages:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch packages',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    );
  }
}