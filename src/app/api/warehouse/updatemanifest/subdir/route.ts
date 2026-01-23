// Warehouse Update Manifest Endpoint
// URL: /api/warehouse/updatemanifest/subdir
// Method: POST
// Accepts complete manifest data structure with packages and collection codes

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Manifest } from "@/models/Manifest";
import { Package } from "@/models/Package";
import { ApiKey, hashApiKey } from "@/models/ApiKey";
import { rateLimit } from "@/lib/rateLimit";

interface WarehouseManifest {
  APIToken: string;
  CollectionCodes: string[];
  PackageAWBs: string[];
  Manifest: {
    ManifestID: string;
    CourierID: string;
    ServiceTypeID: string;
    ManifestStatus: string;
    ManifestCode: string;
    FlightDate: string;
    Weight: number;
    ItemCount: number;
    ManifestNumber: number;
    StaffName: string;
    EntryDate: string;
    EntryDateTime: string;
    AWBNumber: string;
  };
}

// Service Type mappings
const SERVICE_TYPE_MAP: { [key: string]: string } = {
  '59cadcd4-7508-450b-85aa-9ec908d168fe': 'AIR STANDARD',
  '25a1d8e5-a478-4cc3-b1fd-a37d0d787302': 'AIR EXPRESS',
  '8df142ca-0573-4ce9-b11d-7a3e5f8ba196': 'AIR PREMIUM',
  '7c9638e8-4bb3-499e-8af9-d09f757a099e': 'SEA STANDARD',
  '': 'UNSPECIFIED'
};

// Manifest Status mappings
const MANIFEST_STATUS_MAP: { [key: string]: string } = {
  '0': 'AT WAREHOUSE',
  '1': 'DELIVERED TO AIRPORT',
  '2': 'IN TRANSIT TO LOCAL PORT',
  '3': 'AT LOCAL PORT',
  '4': 'AT LOCAL SORTING'
};

export async function POST(req: Request) {
  const requestId = Date.now().toString(36);
  
  // CORS headers for external API calls
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
  };

  console.log(`[${requestId}] 📦 Warehouse Update Manifest API Request:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  // Check API key authentication
  let token = req.headers.get('x-warehouse-key') || req.headers.get('x-api-key');
  
  if (!token) {
    const url = new URL(req.url);
    token = url.searchParams.get("id") || "";
  }

  // Parse request body first to check for APIToken
  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400, headers });
  }

  let payload: WarehouseManifest;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  // Check for APIToken in payload if no header token
  if (!token && payload?.APIToken) {
    token = payload.APIToken;
  }

  if (!token || (!token.startsWith("wh_live_") && !token.startsWith("wh_test_") && token !== payload?.APIToken)) {
    console.log(`[${requestId}] ❌ Unauthorized request - no valid API key`);
    return NextResponse.json(
      { 
        error: "Unauthorized",
        message: "API key required in headers (x-warehouse-key or x-api-key), query parameter (id), or APIToken in body"
      }, 
      { status: 401, headers }
    );
  }

  await dbConnect();

  // Verify API key (skip for APIToken in body)
  let keyRecord = null;
  if (token.startsWith("wh_live_") || token.startsWith("wh_test_")) {
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
    
    if (!keyRecord || !keyRecord.permissions.includes("manifests:write")) {
      console.log(`[${requestId}] ❌ Invalid API key or insufficient permissions`);
      return NextResponse.json(
        { 
          error: "Unauthorized",
          message: "Invalid API key or insufficient permissions (requires manifests:write)"
        }, 
        { status: 401, headers }
      );
    }

    // Rate limiting for API key authentication
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
  }

  // Validate payload structure
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Payload must be an object" }, { status: 400, headers });
  }

  const manifestBlock = payload.Manifest || {};
  const manifestId = String(manifestBlock?.ManifestID || "").trim();
  if (!manifestId) {
    return NextResponse.json({ error: "Manifest.ManifestID is required" }, { status: 400, headers });
  }

  // Extract and validate arrays
  const collectionCodes: string[] = Array.isArray(payload.CollectionCodes)
    ? payload.CollectionCodes.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim())
    : [];
    
  const packageAwbs: string[] = Array.isArray(payload.PackageAWBs)
    ? payload.PackageAWBs.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim())
    : [];

  // Normalize dates
  const toDate = (s: any): Date | undefined => {
    if (typeof s === "string" && s.trim()) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    return undefined;
  };

  // Build manifest update fields
  const setFields = {
    // Core manifest fields
    manifestId,
    courierId: typeof manifestBlock?.CourierID === "string" ? manifestBlock.CourierID : undefined,
    serviceTypeId: typeof manifestBlock?.ServiceTypeID === "string" ? manifestBlock.ServiceTypeID : undefined,
    serviceTypeName: SERVICE_TYPE_MAP[manifestBlock?.ServiceTypeID || ''] || 'UNSPECIFIED',
    manifestStatus: typeof manifestBlock?.ManifestStatus === "string" ? manifestBlock.ManifestStatus : String(manifestBlock?.ManifestStatus || "0"),
    manifestStatusLabel: MANIFEST_STATUS_MAP[manifestBlock?.ManifestStatus || '0'] || 'AT WAREHOUSE',
    manifestCode: typeof manifestBlock?.ManifestCode === "string" ? manifestBlock.ManifestCode : undefined,
    flightDate: toDate(manifestBlock?.FlightDate),
    weight: Number.isFinite(Number(manifestBlock?.Weight)) ? Number(manifestBlock.Weight) : undefined,
    itemCount: Number.isFinite(Number(manifestBlock?.ItemCount)) ? Number(manifestBlock.ItemCount) : undefined,
    manifestNumber: Number.isFinite(Number(manifestBlock?.ManifestNumber)) ? Number(manifestBlock.ManifestNumber) : undefined,
    staffName: typeof manifestBlock?.StaffName === "string" ? manifestBlock.StaffName : undefined,
    entryDate: toDate(manifestBlock?.EntryDate),
    entryDateTime: toDate(manifestBlock?.EntryDateTime),
    awbNumber: typeof manifestBlock?.AWBNumber === "string" ? manifestBlock.AWBNumber : undefined,
    
    // Package associations
    collectionCodes,
    packageAwbs,
    
    // Store complete warehouse data
    apiToken: payload.APIToken,
    rawData: payload,
    
    updatedAt: new Date(),
  };

  try {
    console.log(`[${requestId}] 📝 Updating manifest: ${manifestId}`);
    console.log(`[${requestId}] 📦 Collection codes: ${collectionCodes.length}, Package AWBs: ${packageAwbs.length}`);

    // Upsert manifest
    const manifest = await Manifest.findOneAndUpdate(
      { manifestId },
      {
        $setOnInsert: { manifestId, createdAt: new Date() },
        $set: setFields,
      },
      { upsert: true, new: true }
    );

    console.log(`[${requestId}] ✅ Manifest updated: ${manifest._id}`);

    // Link packages to this manifest by trackingNumber (PackageAWBs)
    let linkedByTracking = 0;
    if (packageAwbs.length > 0) {
      const trackingResult = await Package.updateMany(
        { trackingNumber: { $in: packageAwbs } },
        { 
          $set: { 
            manifestId: manifest._id,
            updatedAt: new Date()
          },
          $push: {
            history: {
              status: 'manifest_updated',
              at: new Date(),
              note: `Linked to manifest ${manifestId} via warehouse update`
            }
          }
        }
      );
      linkedByTracking = trackingResult.modifiedCount;
      console.log(`[${requestId}] 📦 Linked ${linkedByTracking} packages by tracking number`);
    }

    // Link packages by controlNumber using CollectionCodes
    let linkedByControl = 0;
    if (collectionCodes.length > 0) {
      const controlResult = await Package.updateMany(
        { controlNumber: { $in: collectionCodes } },
        { 
          $set: { 
            manifestId: manifest._id,
            updatedAt: new Date()
          },
          $push: {
            history: {
              status: 'manifest_updated',
              at: new Date(),
              note: `Linked to manifest ${manifestId} via collection code`
            }
          }
        }
      );
      linkedByControl = controlResult.modifiedCount;
      console.log(`[${requestId}] 📦 Linked ${linkedByControl} packages by control number`);
    }

    return NextResponse.json({
      success: true,
      manifestId,
      manifest: {
        id: manifest._id.toString(),
        manifestId: manifest.manifestId,
        manifestCode: manifest.manifestCode,
        status: manifest.manifestStatus,
        serviceType: manifest.serviceTypeName,
        itemCount: manifest.itemCount,
        weight: manifest.weight
      },
      linkedPackages: {
        byTrackingNumber: linkedByTracking,
        byControlNumber: linkedByControl,
        totalLinked: linkedByTracking + linkedByControl
      },
      processed: {
        collectionCodes: collectionCodes.length,
        packageAwbs: packageAwbs.length
      },
      message: "Manifest updated successfully with package associations",
      _meta: {
        request_id: requestId,
        api_version: "v1"
      }
    }, { headers });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Error updating manifest:`, error);
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error?.message || "Unknown error occurred",
        manifestId,
        request_id: requestId
      }, 
      { status: 500, headers }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
  };
  
  return new NextResponse(null, { status: 200, headers });
}
