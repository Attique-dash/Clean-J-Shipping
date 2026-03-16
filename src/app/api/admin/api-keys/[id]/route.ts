// src/app/api/admin/api-keys/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';

const WAREHOUSE_BACKEND_URL = process.env.WAREHOUSE_BACKEND_URL || 'http://localhost:5000';

// DELETE /api/admin/api-keys/[id] - Revoke API key
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) return authError;

    const { id } = await params;

    const response = await fetch(`${WAREHOUSE_BACKEND_URL}/api/admin/api-keys/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to delete API key' }));
      return NextResponse.json(
        { success: false, error: error.message },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
