// src/app/api/kcd/packages/[trackingNumber]/manifest/route.ts
// KCD Logistics endpoint for updating package manifest/shipment info

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import ShipmentManifest from "@/models/ShipmentManifest";
import { validateApiKey } from "@/lib/api-key-validation";
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
 * POST /api/kcd/packages/{trackingNumber}/manifest
 * Update package manifest/shipment information
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();
  const { trackingNumber } = params;

  console.log(`[KCD Manifest ${requestId}] Received request for ${trackingNumber} at ${timestamp}`);

  try {
    // Verify API Key
    const apiKey = req.headers.get('x-api-key');
    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Unauthorized - ${validation.error}` },
        { status: 401 }
      );
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      console.log(`[KCD Manifest ${requestId}] Body:`, JSON.stringify(body, null, 2));
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find package
    const existingPackage = await Package.findOne({ 
      trackingNumber: trackingNumber.toUpperCase() 
    });

    if (!existingPackage) {
      return NextResponse.json(
        { error: "Package not found", trackingNumber },
        { status: 404 }
      );
    }

    // Build update data for manifest-related fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update manifest/shipment fields if provided
    if (body.manifestId !== undefined) {
      updateData.manifestId = asString(body.manifestId);
    }
    if (body.batchNumber !== undefined) {
      updateData.batchNumber = asString(body.batchNumber);
    }
    if (body.shipmentMode !== undefined) {
      updateData.shipmentMode = asString(body.shipmentMode);
      updateData.serviceMode = asString(body.shipmentMode);
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

    // Handle manifest association if manifestId provided
    if (body.manifestId) {
      const manifestId = asString(body.manifestId);
      const manifest = await ShipmentManifest.findOne({ manifestId });
      
      if (manifest) {
        // Check if package is already in manifest
        const existingShipment = manifest.shipments.find(
          (s: { trackingNumber?: string }) => s.trackingNumber === trackingNumber.toUpperCase()
        );

        if (!existingShipment) {
          // Add package to manifest
          manifest.shipments.push({
            trackingNumber: trackingNumber.toUpperCase(),
            status: existingPackage.status || 'pending',
            weight: existingPackage.weight,
            notes: asString(body.notes) || 'Added via KCD manifest API'
          });
          manifest.totalItems = manifest.shipments.length;
          manifest.totalWeight = manifest.shipments.reduce(
            (sum: number, s: { weight?: number }) => sum + (s.weight || 0), 0
          );
          manifest.updatedAt = new Date();
          await manifest.save();
          console.log(`[KCD Manifest ${requestId}] Added package to manifest ${manifestId}`);
        }

        updateData.shipmentManifestId = manifest._id;
      }
    }

    // Track source
    updateData.source = 'kcd_webhook';
    updateData.sourceDetails = {
      syncedAt: new Date(),
      syncStatus: 'manifest_updated',
      apiEndpoint: '/api/kcd/packages/[trackingNumber]/manifest'
    };

    // Update package
    const updatedPackage = await Package.findByIdAndUpdate(
      existingPackage._id,
      { $set: updateData },
      { new: true }
    );

    console.log(`[KCD Manifest ${requestId}] Package manifest updated: ${updatedPackage._id}`);

    return NextResponse.json({
      success: true,
      message: "Package manifest updated successfully",
      package: {
        id: updatedPackage._id,
        trackingNumber: updatedPackage.trackingNumber,
        userCode: updatedPackage.userCode,
        manifestId: updatedPackage.manifestId,
        batchNumber: updatedPackage.batchNumber,
        shipmentMode: updatedPackage.shipmentMode,
        currentLocation: updatedPackage.currentLocation,
        updatedAt: updatedPackage.updatedAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error(`[KCD Manifest ${requestId}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}
