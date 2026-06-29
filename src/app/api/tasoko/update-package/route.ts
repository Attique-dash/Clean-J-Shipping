// src/app/api/tasoko/update-package/route.ts
// Tasoko Packing API — Update Package Endpoint
// URL: https://cleanjshipping.com/api/tasoko/update-package
// Method: POST
// Request: [{PackageID, TrackingNumber, UserCode, Weight, Shipper, ...}]

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

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * POST /api/tasoko/update-package
 * Updates package in exact Tasoko Packing API format (PascalCase array or object)
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

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

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

    updateData.source = 'tasoko_webhook';
    updateData.sourceDetails = {
      syncedAt: new Date(),
      syncStatus: 'updated',
      apiEndpoint: '/api/tasoko/update-package',
    };

    const updatedPackage = await Package.findByIdAndUpdate(
      existingPackage._id,
      { $set: updateData },
      { new: true }
    );

    const kcdPkg = toPublicKcdPackage(updatedPackage!.toObject());

    console.log(`[Tasoko UpdatePackage ${requestId}] Updated: ${trackingNumber}`);
    return kcdPackageSuccessResponse([kcdPkg], 'Package updated successfully');
  } catch (error) {
    console.error(`[Tasoko UpdatePackage ${requestId}] Error:`, error);
    return kcdErrorResponse('Internal server error', 500, { requestId });
  }
}

