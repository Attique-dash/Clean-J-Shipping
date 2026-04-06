// src/app/api/kcd/packages/[trackingNumber]/route.ts
// KCD Logistics endpoint for updating packages

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
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
 * POST /api/kcd/packages/{trackingNumber}
 * Update package by tracking number
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();
  const { trackingNumber } = params;

  console.log(`[KCD Update ${requestId}] Received request for ${trackingNumber} at ${timestamp}`);

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
      console.log(`[KCD Update ${requestId}] Body:`, JSON.stringify(body, null, 2));
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

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update fields if provided
    if (body.weight !== undefined) {
      updateData.weight = asNumber(body.weight);
    }
    if (body.shipper !== undefined) {
      updateData.shipper = asString(body.shipper);
    }
    if (body.description !== undefined) {
      updateData.description = asString(body.description);
      updateData.itemDescription = asString(body.description);
    }
    if (body.status !== undefined) {
      updateData.status = asString(body.status);
    }
    if (body.receivedAt !== undefined) {
      const receivedDate = new Date(asString(body.receivedAt));
      updateData.dateReceived = receivedDate;
      updateData.entryDate = receivedDate;
      updateData.receivedAt = receivedDate;
    }
    if (body.houseNumber !== undefined) {
      updateData.controlNumber = asString(body.houseNumber);
    }

    // Track source
    updateData.source = 'kcd_webhook';
    updateData.sourceDetails = {
      syncedAt: new Date(),
      syncStatus: 'updated',
      apiEndpoint: '/api/kcd/packages/[trackingNumber]'
    };

    // Update package
    const updatedPackage = await Package.findByIdAndUpdate(
      existingPackage._id,
      { $set: updateData },
      { new: true }
    );

    console.log(`[KCD Update ${requestId}] Package updated: ${updatedPackage._id}`);

    return NextResponse.json({
      success: true,
      message: "Package updated successfully",
      package: {
        id: updatedPackage._id,
        trackingNumber: updatedPackage.trackingNumber,
        userCode: updatedPackage.userCode,
        status: updatedPackage.status,
        updatedAt: updatedPackage.updatedAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error(`[KCD Update ${requestId}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kcd/packages/{trackingNumber}
 * Get package by tracking number
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const requestId = crypto.randomUUID();
  const { trackingNumber } = params;

  console.log(`[KCD Get ${requestId}] Received request for ${trackingNumber}`);

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

    await dbConnect();

    const pkg = await Package.findOne({ 
      trackingNumber: trackingNumber.toUpperCase() 
    }).lean() as any;

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found", trackingNumber },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      package: {
        id: pkg._id,
        trackingNumber: pkg.trackingNumber,
        userCode: pkg.userCode,
        mailboxNumber: pkg.mailboxNumber,
        status: pkg.status,
        weight: pkg.weight,
        shipper: pkg.shipper,
        description: pkg.description,
        dateReceived: pkg.dateReceived,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error(`[KCD Get ${requestId}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}
