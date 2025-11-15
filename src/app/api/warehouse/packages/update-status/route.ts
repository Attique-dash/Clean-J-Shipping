import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage, type PackageStatus } from "@/models/Package";
import { User } from "@/models/User";
import { isWarehouseAuthorized, getAuthFromRequest, verifyWarehouseApiKey } from "@/lib/rbac";
import { updatePackageSchema } from "@/lib/validators";
import { sendStatusUpdateEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

function isValidStatus(s: unknown): s is PackageStatus {
  return ["Unknown", "At Warehouse", "In Transit", "At Local Port", "Delivered", "Deleted"].includes(
    s as PackageStatus
  );
}

function uiToInternalStatus(ui?: string): PackageStatus | undefined {
  switch (ui) {
    case "in_transit":
      return "In Transit";
    case "ready_for_pickup":
      return "At Local Port";
    case "delivered":
      return "Delivered";
    case "pending":
      return "At Warehouse";
    default:
      return undefined;
  }
}

function internalToUiStatus(s: PackageStatus): "in_transit" | "ready_for_pickup" | "delivered" | "pending" {
  switch (s) {
    case "In Transit":
      return "in_transit";
    case "At Local Port":
      return "ready_for_pickup";
    case "Delivered":
      return "delivered";
    case "Unknown":
    case "At Warehouse":
    default:
      return "pending";
  }
}

export async function POST(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try to derive a stable identifier for rate limiting
  let identifier = "warehouse";
  try {
    const { valid, keyInfo } = await verifyWarehouseApiKey(req);
    if (valid && keyInfo?.keyPrefix) identifier = keyInfo.keyPrefix;
    else {
      const payload = getAuthFromRequest(req);
      const fromCookie = (payload?.uid as string | undefined) || (payload?.email as string | undefined) || (payload?.userCode as string | undefined);
      if (fromCookie) identifier = `wh_${fromCookie}`;
    }
  } catch {}
  const rl = rateLimit(identifier, { windowMs: 60_000, maxRequests: 100 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter ?? 60) }
    });
  }

  await dbConnect();

  // We accept at minimum trackingNumber + status + optional note; we also allow
  // additional fields weight/shipper/userCode/manifestId/description for convenience.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updatePackageSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trackingNumber, status: statusIn, note, statusUi, location } = parsed.data as {
    trackingNumber: string;
    status: PackageStatus;
    note?: string;
    statusUi?: "in_transit" | "ready_for_pickup" | "delivered" | "pending";
    location?: string;
  };

  // Determine final internal status (UI overrides if provided)
  const uiMapped = uiToInternalStatus(statusUi);
  const status = (uiMapped ?? statusIn) as PackageStatus;
  if (!isValidStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const body = raw as Partial<IPackage> & { manifestId?: string };
  const update: Partial<IPackage> = {};
  if (typeof body.weight === "number") update.weight = body.weight;
  if (typeof body.shipper === "string") update.shipper = body.shipper;
  if (typeof body.userCode === "string") update.userCode = body.userCode;
  if (typeof body.manifestId === "string") update.manifestId = body.manifestId;
  if (typeof body.description === "string") update.description = body.description;
  if (typeof location === "string" && location.trim()) (update as any).branch = location.trim();

  const now = new Date();

  const pkg = await Package.findOneAndUpdate(
    { trackingNumber: trackingNumber.trim() },
    {
      $setOnInsert: {
        trackingNumber: trackingNumber.trim(),
        createdAt: now,
      },
      $set: {
        ...update,
        status,
        updatedAt: now,
      },
      $push: {
        history: {
          status,
          at: now,
          note: note?.trim(),
        },
      },
    },
    { upsert: true, new: true }
  );

  // Notify customer on key status transitions
  if (pkg && (status === "In Transit" || status === "Delivered")) {
    // find customer by userCode; fall back to customer ObjectId if needed
    const customer = await User.findOne({ userCode: pkg.userCode, role: "customer" }).select(
      "email firstName"
    );
    if (customer?.email) {
      // send asynchronously, do not await
      sendStatusUpdateEmail({
        to: customer.email,
        firstName: ((customer as unknown) as { firstName?: string } | null)?.firstName || "",
        trackingNumber: pkg.trackingNumber,
        status,
        note,
      }).catch(() => {});
    }
  }

  const payload = getAuthFromRequest(req);
  const updated_by = (payload?.userCode as string) || (payload?.email as string) || "warehouse";
  const new_status_ui = internalToUiStatus(status);
  const finalLocation = location || (pkg?.branch as string | undefined);

  return NextResponse.json({
    tracking_number: trackingNumber,
    new_status: new_status_ui,
    location: finalLocation || null,
    notes: note ?? null,
    updated_by,
    timestamp: now.toISOString(),
  });
}
