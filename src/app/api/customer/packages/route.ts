// src/app/api/customer/packages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // CRITICAL FIX: Always await getAuthFromRequest
    const auth = await getAuthFromRequest(req);
    
    // Check if user is authorized
    const authError = requireRole(auth, 'customer');
    if (authError) {
      return authError;
    }

    // TypeScript now knows auth is not null - use consistent ID extraction
    const userId = auth!.id || auth!._id || auth!.uid;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    // Fetch packages for this customer using userId
    const packages = await prisma.package.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    // Map to response format
    const mapped = packages.map((p) => ({
      id: p.id,
      tracking_number: p.trackingNumber,
      trackingNumber: p.trackingNumber,
      status: p.status,
      description: p.itemDescription,
      weight_kg: p.weight,
      weight: p.weight ? `${p.weight} kg` : undefined,
      userCode: (auth as { userCode?: string }).userCode,
      shipper: p.senderName,
      current_location: p.currentLocation,
      updated_at: p.updatedAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      created_at: p.createdAt?.toISOString(),
      createdAt: p.createdAt?.toISOString(),
      estimated_delivery: p.estimatedDelivery?.toISOString(),
      invoice_status: p.paymentStatus,
    }));

    return NextResponse.json({
      packages: mapped,
      total_packages: mapped.length,
    });
  } catch (error: any) {
    console.error('Error fetching packages:', error);

    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}