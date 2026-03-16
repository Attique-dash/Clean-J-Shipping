// src/app/api/customer/shipping/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';

const WAREHOUSE_BACKEND_URL = process.env.WAREHOUSE_BACKEND_URL || 'http://localhost:5000';

// POST /api/customer/shipping/calculate - Calculate shipping cost
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'customer');
    if (authError) return authError;

    const body = await req.json();

    const response = await fetch(`${WAREHOUSE_BACKEND_URL}/api/customer/shipping/calculate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to calculate shipping' }));
      return NextResponse.json({ success: false, error: error.message }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calculating shipping:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/customer/shipping/calculate - Get shipping calculation options
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'customer');
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const weight = searchParams.get('weight');
    const destination = searchParams.get('destination');
    const serviceMode = searchParams.get('serviceMode') || 'air';

    const queryParams = new URLSearchParams();
    if (weight) queryParams.append('weight', weight);
    if (destination) queryParams.append('destination', destination);
    queryParams.append('serviceMode', serviceMode);

    const response = await fetch(
      `${WAREHOUSE_BACKEND_URL}/api/customer/shipping/calculate?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to get shipping rates' }));
      return NextResponse.json({ success: false, error: error.message }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching shipping rates:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
