// src/app/api/admin/api-keys/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { ApiKey, calculateExpirationDate } from '@/models/ApiKey';

// DELETE /api/admin/api-keys/[id] - Revoke API key
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) return authError;

    const { id } = params;

    await dbConnect();

    const apiKey = await ApiKey.findByIdAndDelete(id);

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys/[id]/refresh - Refresh API key expiration
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) return authError;

    const { id } = params;

    await dbConnect();

    const newExpiresAt = calculateExpirationDate(30); // Extend by 30 days

    const apiKey = await ApiKey.findByIdAndUpdate(
      id,
      { 
        expiresAt: newExpiresAt,
        active: true, // Reactivate if expired
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: apiKey._id,
        name: apiKey.name,
        expiresAt: apiKey.expiresAt,
        active: apiKey.active,
      },
      message: 'API key refreshed successfully. New expiration: 30 days from now.',
    });
  } catch (error) {
    console.error('Error refreshing API key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
