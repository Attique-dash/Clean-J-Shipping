import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { ApiKey, hashApiKey } from "@/models/ApiKey";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("id") || ""; // APITOKEN expected via ?id=

  if (!token || (!token.startsWith("wh_live_") && !token.startsWith("wh_test_"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  // Verify API key via hash lookup and active/expiry, require customers:read permission
  const hashed = hashApiKey(token);
  const keyRecord = await ApiKey.findOne({
    key: hashed,
    active: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  }).select("keyPrefix permissions");
  if (!keyRecord || !keyRecord.permissions.includes("customers:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-key rate limit: 200 req/min for pulls
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

  const customers = await User.find({ role: "customer" })
    .select("userCode firstName lastName branch serviceTypeIDs")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  // Map to required payload shape (array of objects)
  const payload = customers.map((c) => ({
    UserCode: c.userCode || "",
    FirstName: c.firstName || "",
    LastName: c.lastName || "",
    Branch: c.branch || "",
    CustomerServiceTypeID: "", // Not tracked; left empty as per example
    CustomerLevelInstructions: "", // Not tracked; left empty as per example
    CourierServiceTypeID: "", // Not tracked; left empty as per example
    CourierLevelInstructions: "", // Not tracked; left empty as per example
  }));

  const res = NextResponse.json(payload);
  res.headers.set("X-RateLimit-Limit", String(limit));
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  res.headers.set("X-RateLimit-Reset", String(rl.resetAt));
  return res;
}
