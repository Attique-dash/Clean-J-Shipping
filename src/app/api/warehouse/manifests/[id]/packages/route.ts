// src/app/api/warehouse/manifests/[id]/packages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/rbac';

const WAREHOUSE_BACKEND_URL = process.env.WAREHOUSE_BACKEND_URL || 'http://localhost:5000';

// POST /api/warehouse/manifests/[id]/packages - Add package to manifest
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || !['admin', 'warehouse'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const response = await fetch(`${WAREHOUSE_BACKEND_URL}/api/warehouse/manifests/${id}/packages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to add package to manifest' }));
      return NextResponse.json({ success: false, error: error.message }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding package to manifest:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
