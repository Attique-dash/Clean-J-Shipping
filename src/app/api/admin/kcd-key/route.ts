// src/app/api/admin/kcd-key/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';

const WAREHOUSE_BACKEND_URL = process.env.WAREHOUSE_BACKEND_URL || 'http://localhost:5000';

// GET /api/admin/kcd-key - Get KCD API key
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) return authError;

    // Call the correct warehouse-backend endpoint: /api/admin/get-kcd-key
    const response = await fetch(`${WAREHOUSE_BACKEND_URL}/api/admin/get-kcd-key`, {
      headers: {
        'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch KCD key' }));
      return NextResponse.json(
        { success: false, error: error.message },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching KCD key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/kcd-key - Generate new KCD API key
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));

    // Call the correct warehouse-backend endpoint: /api/admin/api-keys/kcd
    const response = await fetch(`${WAREHOUSE_BACKEND_URL}/api/admin/api-keys/kcd`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to generate KCD key' }));
      return NextResponse.json(
        { success: false, error: error.message },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating KCD key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
