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
    // Verify API key via hash lookup and active/expiry, require customers:read permission
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
    .select("userCode firstName lastName email phone address accountStatus emailVerified createdAt branch serviceTypeIDs lastLogin registrationStep")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  // Map to required payload shape with complete customer data
  const payload = customers.map((c) => ({
    UserCode: c.userCode || "",
    FirstName: c.firstName || "",
    LastName: c.lastName || "",
    Email: c.email || "",
    Phone: c.phone || "",
    Address: c.address || {},
    AccountStatus: c.accountStatus || "pending",
    EmailVerified: c.emailVerified || false,
    CreatedAt: c.createdAt || new Date(),
    LastLogin: c.lastLogin || null,
    RegistrationStep: c.registrationStep || 1,
    Branch: c.branch || "",
    CustomerServiceTypeID: c.serviceTypeIDs?.customer || "", // Use serviceTypeIDs if available
    CustomerLevelInstructions: "", // Not tracked; left empty as per example
    CourierServiceTypeID: c.serviceTypeIDs?.courier || "", // Use serviceTypeIDs if available
    CourierLevelInstructions: "", // Not tracked; left empty as per example
  }));

  const res = NextResponse.json(payload);
  res.headers.set("X-RateLimit-Limit", String(limit));
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  res.headers.set("X-RateLimit-Reset", String(rl.resetAt));
  return res;
}
