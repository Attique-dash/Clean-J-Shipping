// src/app/api/warehouse/manifests/[id]/packages/[packageId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/rbac';

const WAREHOUSE_BACKEND_URL = process.env.WAREHOUSE_BACKEND_URL || 'http://localhost:5000';

// DELETE /api/warehouse/manifests/[id]/packages/[packageId] - Remove package from manifest
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || !['admin', 'warehouse'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, packageId } = await params;

    const response = await fetch(
      `${WAREHOUSE_BACKEND_URL}/api/warehouse/manifests/${id}/packages/${packageId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to remove package from manifest' }));
      return NextResponse.json({ success: false, error: error.message }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: 'Package removed from manifest' });
  } catch (error) {
    console.error('Error removing package from manifest:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
