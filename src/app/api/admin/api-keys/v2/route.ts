// src/app/api/admin/api-keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { ApiKey, generateApiKey, calculateExpirationDate, isKeyExpired } from '@/models/ApiKey';

// GET /api/admin/api-keys - List all API keys
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) return authError;

    await dbConnect();

    const keys = await ApiKey.find({}).sort({ createdAt: -1 }).lean();

    // Add expired flag to each key
    const keysWithExpiration = keys.map((key: any) => ({
      ...key,
      isExpired: isKeyExpired(key.expiresAt),
      daysUntilExpiry: key.expiresAt 
        ? Math.ceil((new Date(key.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return NextResponse.json({ success: true, data: keysWithExpiration });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys - Generate new API key
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) return authError;

    const body = await req.json();
    const { name, description, type = 'general', courierCode } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const { key, hash, prefix } = generateApiKey();
    const expiresAt = calculateExpirationDate(30); // 30 days expiration

    const apiKey = await ApiKey.create({
      key: hash,
      keyPrefix: prefix,
      name,
      description,
      type,
      active: true,
      expiresAt,
      createdBy: auth?.email || auth?.id,
      courierCode,
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: apiKey._id,
        key, // Return the full key only once
        name: apiKey.name,
        description: apiKey.description,
        type: apiKey.type,
        active: apiKey.active,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      message: 'API key generated successfully. Copy it now - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
