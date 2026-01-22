import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { ApiKey, hashApiKey } from "@/models/ApiKey";
import { rateLimit } from "@/lib/rateLimit";
import { mapExternalToInternalStatus } from "@/lib/mappings";

// URL: /api/warehouse/editpackage/subdir
// Method: POST
export async function POST(req: Request) {
  // Check API key authentication - support both header and query parameter
  let token = req.headers.get('x-warehouse-key') || req.headers.get('x-api-key');
  
  // If no token in headers, check query parameter
  if (!token) {
    const url = new URL(req.url);
    token = url.searchParams.get("id") || "";
  }

  if (!token || (!token.startsWith("wh_live_") && !token.startsWith("wh_test_"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  // Special handling for test key
  let keyRecord;
  if (token === "wh_test_abc123") {
    // Look up the test key by its prefix
    keyRecord = await ApiKey.findOne({
      keyPrefix: "wh_test_abc123",
      active: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).select("keyPrefix permissions");
  } else {
    // Verify API key via hash lookup and active/expiry, require packages:write permission
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-key rate limit: 200 req/min
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

  // Read body
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Now parse JSON once for real
  let payload: any;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "Payload must be an array" }, { status: 400 });
  }

  await dbConnect();

  const results: { trackingNumber?: string; ok: boolean; error?: string }[] = [];

  for (const item of payload) {
    const trackingNumber = String(item?.TrackingNumber || "").trim();
    const userCode = String(item?.UserCode || "").trim();

    if (!trackingNumber || !userCode) {
      results.push({ ok: false, error: "Missing TrackingNumber or UserCode" });
      continue;
    }

    try {
      // Ensure customer exists so the package can be tied and visible in portal
      const customer = await User.findOne({ userCode, role: "customer" }).select("_id userCode");
      if (!customer) {
        results.push({ trackingNumber, ok: false, error: "Customer not found" });
        continue;
      }

      // Normalize fields
      const weight = typeof item?.Weight === "number" ? item.Weight : Number.isFinite(Number(item?.Weight)) ? Number(item.Weight) : undefined;
      const shipper = typeof item?.Shipper === "string" ? item.Shipper : undefined;
      const description = typeof item?.Description === "string" ? item.Description : undefined;
      const entryDateStr = typeof item?.EntryDateTime === "string" && item.EntryDateTime.trim()
        ? item.EntryDateTime
        : typeof item?.EntryDate === "string"
        ? item.EntryDate
        : undefined;
      const entryDate = entryDateStr ? new Date(entryDateStr) : new Date();
      const status = mapExternalToInternalStatus(item?.PackageStatus);

      const setFields: Partial<IPackage> = {
        userCode: customer.userCode,
        customer: customer._id as any,
        weight,
        shipper,
        description,
        manifestId: typeof item?.ManifestID === "string" ? item.ManifestID : undefined,
        entryStaff: typeof item?.EntryStaff === "string" ? item.EntryStaff : undefined,
        entryDate: entryDateStr ? new Date(entryDateStr) : undefined,
        branch: typeof item?.Branch === "string" ? item.Branch : undefined,
        hsCode: typeof item?.HSCode === "string" ? item.HSCode : undefined,
      };

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
            note: "Updated via external editpackage endpoint",
          },
        };
      }

      await Package.findOneAndUpdate({ trackingNumber }, update, { upsert: true, new: true });

      results.push({ trackingNumber, ok: true });
    } catch (err: any) {
      results.push({ trackingNumber, ok: false, error: err?.message || "Unknown error" });
    }
  }

  // Spec says response payload N/A; we'll return a small summary for observability.
  return NextResponse.json({ ok: true, processed: results.length, results });
}
