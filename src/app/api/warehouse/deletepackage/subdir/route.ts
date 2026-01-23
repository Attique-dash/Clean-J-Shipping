// Warehouse Delete Package Endpoint
// URL: /api/warehouse/deletepackage/subdir
// Method: POST
// Accepts array of package objects with complete warehouse data structure

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { ApiKey, hashApiKey } from "@/models/ApiKey";
import { rateLimit } from "@/lib/rateLimit";

interface WarehousePackage {
  PackageID: string;
  CourierID: string;
  ManifestID: string;
  CollectionID: string;
  TrackingNumber: string;
  ControlNumber: string;
  FirstName: string;
  LastName: string;
  UserCode: string;
  Weight: number;
  Shipper: string;
  EntryStaff: string;
  EntryDate: string;
  EntryDateTime: string;
  Branch: string;
  Claimed: boolean;
  APIToken: string;
  ShowControls: boolean;
  Description: string;
  HSCode: string;
  Unknown: boolean;
  AIProcessed: boolean;
  OriginalHouseNumber: string;
  Cubes: number;
  Length: number;
  Width: number;
  Height: number;
  Pieces: number;
  Discrepancy: boolean;
  DiscrepancyDescription: string;
  ServiceTypeID: string;
  HazmatCodeID: string;
  Coloaded: boolean;
  ColoadIndicator: string;
  PackageStatus: number;
  PackagePayments: string;
}

export async function POST(req: Request) {
  const requestId = Date.now().toString(36);
  
  // CORS headers for external API calls
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
  };

  console.log(`[${requestId}] 📦 Warehouse Delete Package API Request:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Check API key authentication
  let token = req.headers.get('x-warehouse-key') || req.headers.get('x-api-key');
  
  if (!token) {
    const url = new URL(req.url);
    token = url.searchParams.get("id") || "";
  }

  if (!token || (!token.startsWith("wh_live_") && !token.startsWith("wh_test_"))) {
    console.log(`[${requestId}] ❌ Unauthorized request - no valid API key`);
    return NextResponse.json(
      { 
        error: "Unauthorized",
        message: "API key required in headers (x-warehouse-key or x-api-key) or query parameter (id)"
      }, 
      { status: 401, headers }
    );
  }

  await dbConnect();

  // Verify API key
  let keyRecord;
  if (token === "wh_test_abc123") {
    keyRecord = await ApiKey.findOne({
      keyPrefix: "wh_test_abc123",
      active: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).select("keyPrefix permissions");
  } else {
    const hashed = hashApiKey(token);
    keyRecord = await ApiKey.findOne({
      key: hashed,
      active: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).select("keyPrefix permissions");
  }
  
  if (!keyRecord || !keyRecord.permissions.includes("packages:write")) {
    console.log(`[${requestId}] ❌ Invalid API key or insufficient permissions`);
    return NextResponse.json(
      { 
        error: "Unauthorized",
        message: "Invalid API key or insufficient permissions (requires packages:write)"
      }, 
      { status: 401, headers }
    );
  }

  // Rate limiting
  const limit = 200;
  const rl = rateLimit(keyRecord.keyPrefix, { windowMs: 60 * 1000, maxRequests: limit });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: rl.retryAfter,
        resetAt: new Date(rl.resetAt).toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(rl.retryAfter ?? 60),
        },
      }
    );
  }

  let bodyText = "";

  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400, headers });
  }

  let payload: any;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const items: any[] = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? [payload] : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Payload must be an object or array with TrackingNumber" }, { status: 400, headers });
  }

  // Extract tracking numbers and store complete warehouse data
  const trackingNumbers = items
    .map((x) => (typeof x?.TrackingNumber === "string" ? x.TrackingNumber.trim() : ""))
    .filter((t) => !!t);

  if (trackingNumbers.length === 0) {
    return NextResponse.json({ error: "No TrackingNumber values found" }, { status: 400, headers });
  }

  await dbConnect();
  const now = new Date();

  // Perform soft-delete (status: Deleted) and add a history entry
  const results: { trackingNumber: string; ok: boolean; error?: string }[] = [];

  for (const item of items) {
    const trackingNumber = String(item?.TrackingNumber || "").trim();
    
    if (!trackingNumber) {
      results.push({ trackingNumber: '', ok: false, error: "Missing TrackingNumber" });
      continue;
    }

    try {
      // Store warehouse data before deletion
      const warehouseData = JSON.stringify({
        PackageID: item.PackageID,
        CourierID: item.CourierID,
        ManifestID: item.ManifestID,
        CollectionID: item.CollectionID,
        ControlNumber: item.ControlNumber,
        FirstName: item.FirstName,
        LastName: item.LastName,
        UserCode: item.UserCode,
        Shipper: item.Shipper,
        EntryStaff: item.EntryStaff,
        EntryDate: item.EntryDate,
        EntryDateTime: item.EntryDateTime,
        Branch: item.Branch,
        Claimed: item.Claimed,
        APIToken: item.APIToken,
        ShowControls: item.ShowControls,
        Description: item.Description,
        HSCode: item.HSCode,
        Unknown: item.Unknown,
        AIProcessed: item.AIProcessed,
        OriginalHouseNumber: item.OriginalHouseNumber,
        Cubes: item.Cubes,
        Length: item.Length,
        Width: item.Width,
        Height: item.Height,
        Pieces: item.Pieces,
        Discrepancy: item.Discrepancy,
        DiscrepancyDescription: item.DiscrepancyDescription,
        ServiceTypeID: item.ServiceTypeID,
        HazmatCodeID: item.HazmatCodeID,
        Coloaded: item.Coloaded,
        ColoadIndicator: item.ColoadIndicator,
        PackageStatus: item.PackageStatus,
        PackagePayments: item.PackagePayments,
        deleted_at: now.toISOString()
      });

      const res = await Package.findOneAndUpdate(
        { trackingNumber },
        {
          $set: { 
            status: "Deleted", 
            updatedAt: now,
            packagePayments: warehouseData // Store complete warehouse data
          },
          $push: { 
            history: { 
              status: "Deleted", 
              at: now, 
              note: `Deleted via external warehouse deletepackage endpoint - PackageID: ${item.PackageID}` 
            } 
          },
        },
        { new: true }
      );
      
      if (!res) {
        results.push({ trackingNumber, ok: false, error: "Package not found" });
      } else {
        results.push({ trackingNumber, ok: true });
      }
    } catch (err: any) {
      results.push({ trackingNumber, ok: false, error: err?.message || "Unknown error" });
    }
  }

  return NextResponse.json({ 
    ok: true, 
    processed: results.length, 
    results,
    message: "Warehouse packages deleted successfully",
    _meta: {
      request_id: requestId,
      api_version: "v1"
    }
  }, { headers });
}
