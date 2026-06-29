// src/app/api/tasoko/delete-package/route.ts
// Tasoko Packing API — Delete Package Endpoint
// URL: https://cleanjshipping.com/api/tasoko/delete-package
// Method: POST
// Request: [{PackageID, TrackingNumber, UserCode, ...}]

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { validateKcdRequest } from "@/lib/kcd-auth";
import {
  normalizeKcdBody,
  trackingNumberQuery,
} from "@/lib/kcd-package-validation";
import { toPublicKcdPackage } from "@/lib/package-format";
import { kcdPackageSuccessResponse, kcdErrorResponse } from "@/lib/kcd-api-response";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

/**
 * POST /api/tasoko/delete-package
 * Marks package as deleted in Tasoko Packing API format
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    let body: Record<string, unknown>;
    try {
      const rawBody = await req.text();
      const parsed = JSON.parse(rawBody);
      body = normalizeKcdBody(
        Array.isArray(parsed) ? (parsed[0] as Record<string, unknown>) : parsed
      );
    } catch {
      return kcdErrorResponse('Request body must be valid JSON', 400);
    }

    const validation = await validateKcdRequest(req, body);
    if (!validation.valid) {
      return kcdErrorResponse(`Unauthorized - ${validation.error}`, 401);
    }

    const trackingNumber = asString(body.TrackingNumber || body.trackingNumber);
    if (!trackingNumber) {
      return kcdErrorResponse('TrackingNumber is required', 400);
    }

    await dbConnect();

    const existingPackage = await Package.findOne(
      trackingNumberQuery(trackingNumber)
    );

    if (!existingPackage) {
      return kcdErrorResponse('Package not found', 404, {
        TrackingNumber: trackingNumber.toUpperCase(),
      });
    }

    existingPackage.status = 'Deleted';
    existingPackage.updatedAt = new Date();
    if (!Array.isArray(existingPackage.history)) existingPackage.history = [];
    existingPackage.history.push({
      status: 'Deleted',
      at: new Date(),
      note: 'Deleted via Tasoko webhook',
    });
    await existingPackage.save();

    const kcdPkg = toPublicKcdPackage(existingPackage.toObject());

    console.log(`[Tasoko DeletePackage ${requestId}] Deleted: ${trackingNumber}`);
    return kcdPackageSuccessResponse([kcdPkg], 'Package deleted successfully');
  } catch (error) {
    console.error(`[Tasoko DeletePackage ${requestId}] Error:`, error);
    return kcdErrorResponse('Internal server error', 500, { requestId });
  }
}
