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
    // Parse body first to extract token (Askenish portal sends token in body)
    let body: Record<string, unknown>;
    let bodyToken: string | null = null;
    try {
      const rawBody = await req.text();
      body = JSON.parse(rawBody);
      bodyToken = (body as any)?.token || null;
      console.log(`[KCD Update ${requestId}] Token from body:`, bodyToken ? '[PRESENT]' : '[MISSING]');
      
      // Re-create request with body for later use
      req = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: rawBody,
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    
    // Verify API Key using header or body token
    const headerApiKey = req.headers.get('x-api-key');
    const validation = await validateApiKey(headerApiKey, bodyToken);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Unauthorized - ${validation.error}` },
        { status: 401 }
      );
    }
    
    console.log(`[KCD Update ${requestId}] Body:`, JSON.stringify(body, null, 2));

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

    // Build update data - Support both old field names and Tasoko PDF field names (PascalCase)
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update fields if provided (handle both camelCase and PascalCase)
    const weight = body.weight !== undefined ? body.weight : body.Weight;
    if (weight !== undefined) {
      updateData.weight = asNumber(weight);
    }
    
    const shipper = body.shipper !== undefined ? body.shipper : body.Shipper;
    if (shipper !== undefined) {
      updateData.shipper = asString(shipper);
    }
    
    const description = body.description !== undefined ? body.description : body.Description;
    if (description !== undefined) {
      updateData.description = asString(description);
      updateData.itemDescription = asString(description);
    }
    
    // Support both status and PackageStatus
    const status = body.status !== undefined ? body.status : body.PackageStatus;
    if (status !== undefined) {
      updateData.status = asString(status);
    }
    
    // Support receivedAt, EntryDate, or EntryDateTime
    const receivedAt = body.receivedAt !== undefined ? body.receivedAt : (body.EntryDate !== undefined ? body.EntryDate : body.EntryDateTime);
    if (receivedAt !== undefined) {
      const receivedDate = new Date(asString(receivedAt));
      updateData.dateReceived = receivedDate;
      updateData.entryDate = receivedDate;
      updateData.receivedAt = receivedDate;
    }
    
    // Support houseNumber or ControlNumber
    const houseNumber = body.houseNumber !== undefined ? body.houseNumber : body.ControlNumber;
    if (houseNumber !== undefined) {
      updateData.controlNumber = asString(houseNumber);
    }
    
    // Additional Tasoko PDF fields
    if (body.PackageID !== undefined || body.packageId !== undefined) {
      updateData.kcdPackageId = asString(body.PackageID || body.packageId);
    }
    if (body.CourierID !== undefined || body.courierId !== undefined) {
      updateData.kcdCourierId = asString(body.CourierID || body.courierId);
    }
    if (body.ManifestID !== undefined || body.manifestId !== undefined) {
      updateData.kcdManifestId = asString(body.ManifestID || body.manifestId);
    }
    if (body.CollectionID !== undefined || body.collectionId !== undefined) {
      updateData.kcdCollectionId = asString(body.CollectionID || body.collectionId);
    }
    if (body.EntryStaff !== undefined || body.entryStaff !== undefined) {
      updateData.entryStaff = asString(body.EntryStaff || body.entryStaff);
    }
    if (body.Branch !== undefined || body.branch !== undefined) {
      updateData.branch = asString(body.Branch || body.branch);
    }
    if (body.Pieces !== undefined || body.pieces !== undefined) {
      updateData.pieces = asNumber(body.Pieces || body.pieces);
    }
    if (body.Cubes !== undefined || body.cubes !== undefined) {
      updateData.cubes = asNumber(body.Cubes || body.cubes);
    }
    if (body.FirstName !== undefined || body.firstName !== undefined) {
      updateData.receiverFirstName = asString(body.FirstName || body.firstName);
    }
    if (body.LastName !== undefined || body.lastName !== undefined) {
      updateData.receiverLastName = asString(body.LastName || body.lastName);
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
