import { NextResponse } from 'next/server';

// Proxy registration to the Express backend so we reuse
// its validation, warehouse-aware emails, and default data creation.
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support both the new frontend payload and the older fullName style
    let payload: Record<string, unknown>;

    if (body.firstName && body.lastName) {
      payload = {
        firstName: String(body.firstName).trim(),
        lastName: String(body.lastName).trim(),
        email: String(body.email || '').toLowerCase(),
        password: String(body.password || ''),
        phone: body.phone ? String(body.phone) : undefined,
        role: body.role || 'customer',
        branch: body.branch || 'Down Town',
        address: body.address ?? undefined,
      };
    } else if (body.fullName) {
      const nameParts = String(body.fullName).trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      payload = {
        firstName,
        lastName,
        email: String(body.email || '').toLowerCase(),
        password: String(body.password || ''),
        phone: body.phone ? String(body.phone) : undefined,
        role: 'customer',
        branch: body.branch || 'Down Town',
        address: body.address ?? undefined,
      };
    } else {
      return NextResponse.json(
        { error: 'firstName and lastName are required' },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.BACKEND_BASE_URL?.replace(/\/$/, '') ||
      'https://cleanjshipping.vercel.app';

    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res
      .json()
      .catch(() => ({ error: 'Invalid response from backend' }));

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Register API Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to contact registration service' },
      { status: 502 }
    );
  }
}
