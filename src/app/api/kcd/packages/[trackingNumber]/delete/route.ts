// src/app/api/kcd/packages/[trackingNumber]/delete/route.ts
// KCD Logistics endpoint for deleting packages

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import Invoice from "@/models/Invoice";
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
 * POST /api/kcd/packages/{trackingNumber}/delete
 * Delete package by tracking number
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();
  const { trackingNumber } = params;

  console.log(`[KCD Delete ${requestId}] Received request for ${trackingNumber} at ${timestamp}`);

  try {
    // Parse body first to extract token (Askenish portal sends token in body)
    let bodyToken: string | null = null;
    try {
      const rawBody = await req.text();
      const body = JSON.parse(rawBody);
      bodyToken = body?.token || null;
      console.log(`[KCD Delete ${requestId}] Token from body:`, bodyToken ? '[PRESENT]' : '[MISSING]');
      
      // Re-create request with body for later use if needed
      req = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: rawBody,
      });
    } catch {
      // Body might not be JSON or empty, continue with header check
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

    const packageId = existingPackage._id;
    const userCode = existingPackage.userCode;

    // Delete related invoices
    try {
      const invoiceDeleteResult = await Invoice.deleteMany({
        $or: [
          { 'package.trackingNumber': trackingNumber },
          { packageId: packageId }
        ]
      });
      console.log(`[KCD Delete ${requestId}] Deleted ${invoiceDeleteResult.deletedCount} related invoices`);
    } catch (invoiceError) {
      console.error(`[KCD Delete ${requestId}] Failed to delete invoices:`, invoiceError);
      // Continue with package deletion even if invoice deletion fails
    }

    // Delete package
    await Package.findByIdAndDelete(packageId);

    console.log(`[KCD Delete ${requestId}] Package deleted: ${packageId}`);

    return NextResponse.json({
      success: true,
      message: "Package deleted successfully",
      deleted: {
        id: packageId,
        trackingNumber: trackingNumber,
        userCode: userCode
      }
    }, { status: 200 });

  } catch (error) {
    console.error(`[KCD Delete ${requestId}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}
