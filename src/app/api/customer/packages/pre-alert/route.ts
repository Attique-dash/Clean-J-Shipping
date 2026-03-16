// src/app/api/customer/packages/pre-alert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';

const WAREHOUSE_BACKEND_URL = process.env.WAREHOUSE_BACKEND_URL || 'http://localhost:5000';

// POST /api/customer/packages/pre-alert - Create a pre-alert
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'customer');
    if (authError) return authError;

    const body = await req.json();

    // Forward to warehouse backend
    const response = await fetch(`${WAREHOUSE_BACKEND_URL}/api/customer/packages/pre-alert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        userId: auth?.id,
        userCode: auth?.userCode,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create pre-alert' }));
      return NextResponse.json({ success: false, error: error.message }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating pre-alert:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/customer/packages/pre-alert - Get customer's pre-alerts
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'customer');
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const response = await fetch(
      `${WAREHOUSE_BACKEND_URL}/api/customer/packages/pre-alert?page=${page}&limit=${limit}&userId=${auth?.id}`,
      {
        headers: {
          'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch pre-alerts' }));
      return NextResponse.json({ success: false, error: error.message }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching pre-alerts:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
