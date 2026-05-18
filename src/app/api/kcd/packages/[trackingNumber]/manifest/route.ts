// src/app/api/kcd/packages/[trackingNumber]/manifest/route.ts

import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import ShipmentManifest from "@/models/ShipmentManifest";
import { validateKcdRequest } from "@/lib/kcd-auth";
import {
  normalizeKcdBody,
  trackingNumberQuery,
  validationFailedResponse,
} from "@/lib/kcd-package-validation";
import { toPublicKcdPackage, getDocTrackingNumber } from "@/lib/package-format";
import { kcdPackageSuccessResponse, kcdErrorResponse } from "@/lib/kcd-api-response";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

/**
 * POST /api/kcd/packages/{trackingNumber}/manifest
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const requestId = crypto.randomUUID();
  const trackingParam = decodeURIComponent(params.trackingNumber || '').trim();

  try {
    let body: Record<string, unknown>;
    try {
      const rawBody = await req.text();
      const parsed = JSON.parse(rawBody);
      body = normalizeKcdBody(
        Array.isArray(parsed) ? (parsed[0] as Record<string, unknown>) : parsed
      );
    } catch {
      return validationFailedResponse([
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    const validation = await validateKcdRequest(req, body);
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

    const tn = getDocTrackingNumber(existingPackage.toObject());
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const manifestId = asString(body.ManifestID || body.manifestId);
    if (manifestId) {
      updateData.ManifestID = manifestId;
      updateData.manifestId = manifestId;
    }
    if (body.batchNumber !== undefined) {
      updateData.batchNumber = asString(body.batchNumber);
    }
    const shipmentMode = asString(
      body.shipmentMode || body.ServiceTypeID || body.serviceMode
    );
    if (shipmentMode) {
      updateData.shipmentMode = shipmentMode;
      updateData.serviceMode = shipmentMode;
    }
    if (body.flightNumber !== undefined) {
      updateData.flightNumber = asString(body.flightNumber);
    }
    if (body.vesselName !== undefined) {
      updateData.vesselName = asString(body.vesselName);
    }
    if (body.etd !== undefined) {
      updateData.etd = new Date(asString(body.etd));
    }
    if (body.eta !== undefined) {
      updateData.eta = new Date(asString(body.eta));
    }
    if (body.departurePort !== undefined) {
      updateData.departurePort = asString(body.departurePort);
    }
    if (body.arrivalPort !== undefined) {
      updateData.arrivalPort = asString(body.arrivalPort);
    }
    if (body.currentLocation !== undefined) {
      updateData.currentLocation = asString(body.currentLocation);
    }
    if (body.warehouseLocation !== undefined) {
      updateData.warehouseLocation = asString(body.warehouseLocation);
    }

    if (manifestId) {
      let manifest = await ShipmentManifest.findOne({ manifestId });

      if (!manifest) {
        manifest = await ShipmentManifest.create({
          manifestId,
          title: `Manifest ${manifestId}`,
          mode: (shipmentMode === 'sea' ? 'sea' : shipmentMode === 'land' ? 'land' : 'air') as 'air' | 'sea' | 'land',
          batchDate: new Date(),
          shipments: [],
          totalItems: 0,
          totalWeight: 0,
          status: 'active',
        });
      }

      const existingShipment = manifest.shipments.find(
        (s: { trackingNumber?: string }) =>
          s.trackingNumber?.toUpperCase() === tn
      );

      if (!existingShipment) {
        manifest.shipments.push({
          trackingNumber: tn,
          status: asString(existingPackage.status || existingPackage.PackageStatus) || 'pending',
          weight: existingPackage.Weight ?? existingPackage.weight,
          notes: asString(body.notes) || 'Added via KCD manifest API',
        });
      }

      manifest.totalItems = manifest.shipments.length;
      manifest.totalWeight = manifest.shipments.reduce(
        (sum: number, s: { weight?: number }) => sum + (s.weight || 0),
        0
      );
      manifest.updatedAt = new Date();
      await manifest.save();

      updateData.shipmentManifestId = manifest._id;
    }

    updateData.source = 'kcd_webhook';
    updateData.sourceDetails = {
      syncedAt: new Date(),
      syncStatus: 'manifest_updated',
      apiEndpoint: '/api/kcd/packages/[trackingNumber]/manifest',
    };

    const updatedPackage = await Package.findByIdAndUpdate(
      existingPackage._id,
      { $set: updateData },
      { new: true }
    );

    const kcdPkg = toPublicKcdPackage(updatedPackage!.toObject());

    return kcdPackageSuccessResponse(
      [kcdPkg],
      'Package manifest updated successfully',
      200,
      { ManifestID: manifestId || kcdPkg.ManifestID }
    );
  } catch (error) {
    console.error(`[KCD Manifest ${requestId}] Error:`, error);
    return kcdErrorResponse('Internal server error', 500, { requestId });
  }
}
