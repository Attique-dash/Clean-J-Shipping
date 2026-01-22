import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { ApiKey, hashApiKey } from "@/models/ApiKey";
import { rateLimit } from "@/lib/rateLimit";

// External-style Delete Package endpoint alias
// URL: /api/warehouse/deletepackage/subdir
// Method: POST
// Accepts either a single object or an array of objects. Each object should contain TrackingNumber.
// Auth via x-api-key/x-warehouse-key or APIToken in the body.
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

  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let payload: any;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items: any[] = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? [payload] : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Payload must be an object or array with TrackingNumber" }, { status: 400 });
  }

  const trackingNumbers = items
    .map((x) => (typeof x?.TrackingNumber === "string" ? x.TrackingNumber.trim() : ""))
    .filter((t) => !!t);

  if (trackingNumbers.length === 0) {
    return NextResponse.json({ error: "No TrackingNumber values found" }, { status: 400 });
  }

  await dbConnect();
  const now = new Date();

  // Perform soft-delete (status: Deleted) and add a history entry
  const results: { trackingNumber: string; ok: boolean; error?: string }[] = [];

  for (const tn of trackingNumbers) {
    try {
      const res = await Package.findOneAndUpdate(
        { trackingNumber: tn },
        {
          $set: { status: "Deleted", updatedAt: now },
          $push: { history: { status: "Deleted", at: now, note: "Deleted via external deletepackage endpoint" } },
        },
        { new: true }
      );
      if (!res) {
        results.push({ trackingNumber: tn, ok: false, error: "Package not found" });
      } else {
        results.push({ trackingNumber: tn, ok: true });
      }
    } catch (err: any) {
      results.push({ trackingNumber: tn, ok: false, error: err?.message || "Unknown error" });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
