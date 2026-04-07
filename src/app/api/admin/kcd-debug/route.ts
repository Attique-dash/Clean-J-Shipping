// src/app/api/admin/kcd-debug/route.ts
// Debug endpoint to check KCD API key configuration

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { ApiKey } from '@/models/ApiKey';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify admin access
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) return authError;

    await dbConnect();

    // Get all API keys from database
    const dbKeys = await ApiKey.find({}).select('name keyPrefix active expiresAt lastUsedAt usageCount').lean();

    // Check environment variable (masked)
    const envKey = process.env.KCD_API_KEY;
    const envKeyPreview = envKey ? `${envKey.substring(0, 12)}...${envKey.substring(envKey.length - 4)}` : null;

    return NextResponse.json({
      environment: {
        KCD_API_KEY: envKeyPreview,
        KCD_API_KEY_LENGTH: envKey?.length || 0,
        NODE_ENV: process.env.NODE_ENV,
      },
      database: {
        keyCount: dbKeys.length,
        keys: dbKeys.map(k => ({
          name: k.name,
          prefix: k.keyPrefix,
          active: k.active,
          expiresAt: k.expiresAt,
          lastUsedAt: k.lastUsedAt,
          usageCount: k.usageCount,
        })),
      },
      curlTest: envKey ? 
        `curl -X POST https://www.cleanjshipping.com/api/kcd/packages/add \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: ${envKey}" \\\n  -d '{"trackingNumber":"TEST123","customerMailbox":"CLEAN-0001","weight":2.5,"shipper":"Test"}'` :
        'KCD_API_KEY not set in environment',
    });
  } catch (error) {
    console.error('KCD Debug Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
