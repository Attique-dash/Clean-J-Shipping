// src/app/api/kcd/packages/[trackingNumber]/route.ts
// KCD Logistics endpoint for get/update package by tracking number

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { validateApiKey } from "@/lib/api-key-validation";
import {
  normalizeKcdBody,
  validateUserCode,
  validationFailedResponse,
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

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * POST /api/kcd/packages/{trackingNumber}
 * Update package by tracking number (KCD PascalCase body)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const requestId = crypto.randomUUID();
  const trackingParam = decodeURIComponent(params.trackingNumber || '').trim();

  try {
    let body: Record<string, unknown>;
    let bodyToken: string | null = null;
    try {
      const rawBody = await req.text();
      body = JSON.parse(rawBody);
      bodyToken = (body as { token?: string })?.token || null;
      req = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: rawBody,
      });
    } catch {
      return validationFailedResponse([
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    body = normalizeKcdBody(body);
    const userCodeErr = validateUserCode(
      asString(body.UserCode),
      { required: false }
    );
    if (userCodeErr) {
      return validationFailedResponse([userCodeErr]);
    }

    const headerApiKey = req.headers.get('x-api-key');
    const validation = await validateApiKey(headerApiKey, bodyToken);
    if (!validation.valid) {
      return kcdErrorResponse(`Unauthorized - ${validation.error}`, 401);
    }

    await dbConnect();

    const existingPackage = await Package.findOne(
      trackingNumberQuery(trackingParam)
    );

    if (!existingPackage) {
      return kcdErrorResponse('Package not found', 404, {
        TrackingNumber: trackingParam.toUpperCase(),
      });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.Weight !== undefined) {
      updateData.Weight = asNumber(body.Weight);
      updateData.weight = asNumber(body.Weight);
    }
    if (body.Shipper !== undefined) {
      updateData.Shipper = asString(body.Shipper);
      updateData.shipper = asString(body.Shipper);
    }
    if (body.Description !== undefined) {
      updateData.Description = asString(body.Description);
      updateData.description = asString(body.Description);
      updateData.itemDescription = asString(body.Description);
    }
    if (body.PackageStatus !== undefined || body.status !== undefined) {
      const statusVal = body.PackageStatus ?? body.status;
      updateData.PackageStatus = asNumber(statusVal);
      updateData.status = asString(statusVal);
    }
    const receivedAt = body.EntryDateTime ?? body.EntryDate;
    if (receivedAt !== undefined) {
      const receivedDate = new Date(asString(receivedAt));
      updateData.EntryDate = receivedDate;
      updateData.EntryDateTime = receivedDate;
      updateData.dateReceived = receivedDate;
      updateData.receivedAt = receivedDate;
    }
    if (body.ControlNumber !== undefined) {
      updateData.ControlNumber = asString(body.ControlNumber);
      updateData.controlNumber = asString(body.ControlNumber);
    }
    if (body.PackageID !== undefined) {
      updateData.PackageID = asString(body.PackageID);
      updateData.kcdPackageId = asString(body.PackageID);
    }
    if (body.CourierID !== undefined) {
      updateData.CourierID = asString(body.CourierID);
      updateData.kcdCourierId = asString(body.CourierID);
    }
    if (body.ManifestID !== undefined) {
      updateData.ManifestID = asString(body.ManifestID);
      updateData.kcdManifestId = asString(body.ManifestID);
      updateData.manifestId = asString(body.ManifestID);
    }
    if (body.CollectionID !== undefined) {
      updateData.CollectionID = asString(body.CollectionID);
      updateData.kcdCollectionId = asString(body.CollectionID);
    }
    if (body.EntryStaff !== undefined) {
      updateData.EntryStaff = asString(body.EntryStaff);
      updateData.entryStaff = asString(body.EntryStaff);
    }
    if (body.Branch !== undefined) {
      updateData.Branch = asString(body.Branch);
      updateData.branch = asString(body.Branch);
    }
    if (body.Pieces !== undefined) {
      updateData.Pieces = asNumber(body.Pieces);
      updateData.pieces = asNumber(body.Pieces);
    }
    if (body.Cubes !== undefined) {
      updateData.Cubes = asNumber(body.Cubes);
      updateData.cubes = asNumber(body.Cubes);
    }
    if (body.FirstName !== undefined) {
      updateData.FirstName = asString(body.FirstName);
      updateData.receiverFirstName = asString(body.FirstName);
    }
    if (body.LastName !== undefined) {
      updateData.LastName = asString(body.LastName);
      updateData.receiverLastName = asString(body.LastName);
    }

    updateData.source = 'kcd_webhook';
    updateData.sourceDetails = {
      syncedAt: new Date(),
      syncStatus: 'updated',
      apiEndpoint: '/api/kcd/packages/[trackingNumber]',
    };

    const updatedPackage = await Package.findByIdAndUpdate(
      existingPackage._id,
      { $set: updateData },
      { new: true }
    );

    const kcdPkg = toPublicKcdPackage(updatedPackage!.toObject());

    return kcdPackageSuccessResponse(
      [kcdPkg],
      'Package updated successfully'
    );
  } catch (error) {
    console.error(`[KCD Update ${requestId}] Error:`, error);
    return kcdErrorResponse('Internal server error', 500, { requestId });
  }
}

/**
 * GET /api/kcd/packages/{trackingNumber}
 * Get package by tracking number — returns KCD PascalCase array in `data`
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const requestId = crypto.randomUUID();
  const trackingParam = decodeURIComponent(params.trackingNumber || '').trim();

  try {
    const apiKey = req.headers.get('x-api-key');
    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      return kcdErrorResponse(`Unauthorized - ${validation.error}`, 401);
    }

    await dbConnect();

    const pkg = await Package.findOne(
      trackingNumberQuery(trackingParam)
    ).lean();

    if (!pkg) {
      return kcdErrorResponse('Package not found', 404, {
        TrackingNumber: trackingParam.toUpperCase(),
      });
    }

    const kcdPkg = toPublicKcdPackage(pkg as Record<string, unknown>);

    return kcdPackageSuccessResponse([kcdPkg], 'Package found');
  } catch (error) {
    console.error(`[KCD Get ${requestId}] Error:`, error);
    return kcdErrorResponse('Internal server error', 500, { requestId });
  }
}
