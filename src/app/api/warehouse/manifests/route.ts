import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Manifest } from "@/models/Manifest";
import { ApiKey, hashApiKey } from "@/models/ApiKey";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("id") || "";

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
      // Verify API key via hash lookup and active/expiry, require manifests:read permission
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
    if (!keyRecord || !keyRecord.permissions.includes("manifests:read")) {
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

    const requestUrl = new URL(req.url);
    const queryLimit = parseInt(requestUrl.searchParams.get("limit") || "100");
    const skip = parseInt(requestUrl.searchParams.get("skip") || "0");

    const manifests = await Manifest.find()
      .sort({ updatedAt: -1 })
      .limit(queryLimit)
      .skip(skip)
      .lean();

    const res = NextResponse.json({ manifests });
    res.headers.set("X-RateLimit-Limit", String(limit));
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.resetAt));
    return res;
  } catch (error) {
    console.error("Manifests GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch manifests" },
      { status: 500 }
    );
  }
}

