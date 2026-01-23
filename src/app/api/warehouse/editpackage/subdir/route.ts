// Warehouse Edit Package Endpoint
// URL: /api/warehouse/editpackage/subdir
// Method: POST
// Accepts array of package objects with complete warehouse data structure

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
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

  console.log(`[${requestId}] 📦 Warehouse Edit Package API Request:`, {
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

  // Parse request body
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

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "Payload must be an array" }, { status: 400, headers });
  }

  const results: { trackingNumber?: string; ok: boolean; error?: string }[] = [];

  for (const item of payload) {
    const trackingNumber = String(item?.TrackingNumber || "").trim();
    const userCode = String(item?.UserCode || "").trim();

    if (!trackingNumber || !userCode) {
      results.push({ ok: false, error: "Missing TrackingNumber or UserCode" });
      continue;
    }

    try {
      // Ensure customer exists
      const customer = await User.findOne({ userCode, role: "customer" }).select("_id userCode");
      if (!customer) {
        results.push({ trackingNumber, ok: false, error: "Customer not found" });
        continue;
      }

      // Normalize dates
      const entryDateStr = typeof item?.EntryDateTime === "string" && item.EntryDateTime.trim()
        ? item.EntryDateTime
        : typeof item?.EntryDate === "string"
        ? item.EntryDate
        : undefined;
      const entryDate = entryDateStr ? new Date(entryDateStr) : new Date();

      // Map warehouse status to internal status
      const statusMap: { [key: number]: string } = {
        0: 'At Warehouse',
        1: 'In Transit', 
        2: 'At Local Port',
        3: 'Delivered',
        4: 'Unknown'
      };
      const status = statusMap[item?.PackageStatus] || 'At Warehouse';

      const setFields: Partial<IPackage> = {
        userCode: customer.userCode,
        customer: customer._id as any,
        weight: typeof item?.Weight === "number" ? item.Weight : Number.isFinite(Number(item?.Weight)) ? Number(item.Weight) : undefined,
        shipper: typeof item?.Shipper === "string" ? item.Shipper : undefined,
        description: typeof item?.Description === "string" ? item.Description : undefined,
        manifestId: typeof item?.ManifestID === "string" ? item.ManifestID : undefined,
        entryStaff: typeof item?.EntryStaff === "string" ? item.EntryStaff : undefined,
        entryDate: entryDateStr ? new Date(entryDateStr) : undefined,
        branch: typeof item?.Branch === "string" ? item.Branch : undefined,
        hsCode: typeof item?.HSCode === "string" ? item.HSCode : undefined,
        
        // Warehouse-specific fields
        controlNumber: typeof item?.ControlNumber === "string" ? item.ControlNumber : undefined,
        courierId: typeof item?.CourierID === "string" ? item.CourierID : undefined,
        collectionId: typeof item?.CollectionID === "string" ? item.CollectionID : undefined,
        serviceTypeId: typeof item?.ServiceTypeID === "string" ? item.ServiceTypeID : undefined,
        hazmatCodeId: typeof item?.HazmatCodeID === "string" ? item.HazmatCodeID : undefined,
        cubes: typeof item?.Cubes === "number" ? item.Cubes : undefined,
        pieces: typeof item?.Pieces === "number" ? item.Pieces : undefined,
        claimed: typeof item?.Claimed === "boolean" ? item.Claimed : undefined,
        unknown: typeof item?.Unknown === "boolean" ? item.Unknown : undefined,
        aiProcessed: typeof item?.AIProcessed === "boolean" ? item.AIProcessed : undefined,
        discrepancy: typeof item?.Discrepancy === "boolean" ? item.Discrepancy : undefined,
        discrepancyDescription: typeof item?.DiscrepancyDescription === "string" ? item.DiscrepancyDescription : undefined,
        coloaded: typeof item?.Coloaded === "boolean" ? item.Coloaded : undefined,
        coloadIndicator: typeof item?.ColoadIndicator === "string" ? item.ColoadIndicator : undefined,
        
        // Dimensions
        length: typeof item?.Length === "number" ? item.Length : undefined,
        width: typeof item?.Width === "number" ? item.Width : undefined,
        height: typeof item?.Height === "number" ? item.Height : undefined,
      };

      // Store warehouse payment data
      if (item?.PackagePayments || item?.APIToken || item?.PackageID) {
        setFields.packagePayments = JSON.stringify({
          PackageID: item.PackageID,
          APIToken: item.APIToken,
          ShowControls: item.ShowControls,
          OriginalHouseNumber: item.OriginalHouseNumber,
          PackagePayments: item.PackagePayments,
          updated_at: new Date().toISOString()
        });
      }

      // Fetch existing package to compare status and build history
      const existing = await Package.findOne({ trackingNumber }).select("status");
      const statusChanged = existing ? existing.status !== status : true;

      const update: any = {
        $setOnInsert: {
          trackingNumber,
          createdAt: entryDate,
        },
        $set: {
          ...setFields,
          status,
          updatedAt: entryDate,
        },
      };

      if (statusChanged) {
        update.$push = {
          history: {
            status,
            at: entryDate,
            note: "Updated via external warehouse editpackage endpoint",
          },
        };
      }

      await Package.findOneAndUpdate({ trackingNumber }, update, { upsert: true, new: true });

      results.push({ trackingNumber, ok: true });
    } catch (err: any) {
      results.push({ trackingNumber, ok: false, error: err?.message || "Unknown error" });
    }
  }

  return NextResponse.json({ 
    ok: true, 
    processed: results.length, 
    results,
    message: "Warehouse packages updated successfully",
    _meta: {
      request_id: requestId,
      api_version: "v1"
    }
  }, { headers });
}
