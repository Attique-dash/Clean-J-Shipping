import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { verifyWarehouseApiKey } from "@/lib/rbac";
import { getServiceTypeName, getExternalStatusLabel } from "@/lib/mappings";
import { rateLimit } from "@/lib/rateLimit";

// (removed legacy body-token support on purpose)

// This endpoint ingests an array of package objects in the external format and upserts them into our system.
// URL: /api/warehouse/addpackage/subdir
// Method: POST
export async function POST(req: Request) {
  // Strict header-only API key with permission check
  const { valid, keyInfo } = await verifyWarehouseApiKey(req, ["packages:write"]);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Apply per-key rate limiting (1 minute window, 100 requests)
  const limit = 100;
  const rl = rateLimit(keyInfo!.keyPrefix, { windowMs: 60 * 1000, maxRequests: limit });
  if (!rl.allowed) {
    return NextResponse.json({
      error: "Rate limit exceeded",
      retryAfter: rl.retryAfter,
      resetAt: new Date(rl.resetAt).toISOString(),
    }, {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rl.resetAt),
        "Retry-After": String(rl.retryAfter ?? 60),
      },
    });
  }

  // Read and parse JSON body
  let payload: unknown;
  try {
    const bodyText = await req.text();
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "Payload must be an array" }, { status: 400 });
  }

  await dbConnect();

  const results: { trackingNumber?: string; ok: boolean; error?: string }[] = [];

  // After validation above, treat payload as an array of loosely-typed objects
  type ExternalPayloadItem = Record<string, unknown>;
  const payloadArr = payload as ExternalPayloadItem[];

  for (const item of payloadArr) {
    try {
      // Map external fields to our model
      const trackingNumber = String(item?.TrackingNumber || "").trim();
      const userCode = String(item?.UserCode || "").trim();
      if (!trackingNumber || !userCode) {
        results.push({ ok: false, error: "Missing TrackingNumber or UserCode" });
        continue;
      }

      const weight = typeof item?.Weight === "number" ? item.Weight : undefined;
      const shipper = typeof item?.Shipper === "string" ? item.Shipper : undefined;
      const description = typeof item?.Description === "string" ? item.Description : undefined;
      const serviceTypeId = typeof item?.ServiceTypeID === "string" ? item.ServiceTypeID : "";
      const serviceTypeName = getServiceTypeName(serviceTypeId);
      const externalStatusLabel = getExternalStatusLabel(item?.PackageStatus);
      const entryDateStr = typeof item?.EntryDateTime === "string" && item.EntryDateTime.trim()
        ? item.EntryDateTime
        : typeof item?.EntryDate === "string"
        ? item.EntryDate
        : undefined;
      const entryDate = entryDateStr ? new Date(entryDateStr) : new Date();

      // Ensure customer exists
      const customer = await User.findOne({ userCode, role: "customer" }).select("_id userCode");
      if (!customer) {
        results.push({ trackingNumber, ok: false, error: "Customer not found" });
        continue;
      }

      const initial = {
        trackingNumber,
        userCode: customer.userCode,
        userId: customer._id,
        customer: customer._id as unknown as string,
        weight,
        shipper,
        description,
        status: "At Warehouse",
        controlNumber: typeof item?.ControlNumber === "string" ? item.ControlNumber : undefined,
        branch: typeof item?.Branch === "string" ? item.Branch : undefined,
        serviceTypeId,
        serviceTypeName,
        externalStatusLabel,
        firstName: typeof item?.FirstName === "string" ? item.FirstName : undefined,
        lastName: typeof item?.LastName === "string" ? item.LastName : undefined,
        cubes: Number.isFinite(Number(item?.Cubes)) ? Number(item.Cubes) : undefined,
        length: Number.isFinite(Number(item?.Length)) ? Number(item.Length) : undefined,
        width: Number.isFinite(Number(item?.Width)) ? Number(item.Width) : undefined,
        height: Number.isFinite(Number(item?.Height)) ? Number(item.Height) : undefined,
        pieces: Number.isFinite(Number(item?.Pieces)) ? Number(item.Pieces) : undefined,
      };

      await Package.findOneAndUpdate(
        { trackingNumber },
        {
          $setOnInsert: {
            ...initial,
            createdAt: entryDate,
          },
          $set: {
            userCode: initial.userCode,
            userId: initial.userId,
            customer: initial.customer,
            weight: typeof weight === "number" ? weight : undefined,
            shipper: typeof shipper === "string" ? shipper : undefined,
            description: typeof description === "string" ? description : undefined,
            status: "At Warehouse",
            updatedAt: entryDate,
            controlNumber: initial.controlNumber,
            branch: initial.branch,
            serviceTypeId,
            serviceTypeName,
            externalStatusLabel,
            firstName: initial.firstName,
            lastName: initial.lastName,
            cubes: initial.cubes,
            length: initial.length,
            width: initial.width,
            height: initial.height,
            pieces: initial.pieces,
          },
          $push: {
            history: {
              status: "At Warehouse",
              at: entryDate,
              note: "Received via external addpackage endpoint",
            },
          },
        },
        { upsert: true, new: true }
      );

      results.push({ trackingNumber, ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const tnField = (item as Record<string, unknown>)["TrackingNumber"];
      const tnSafe = typeof tnField === "string" ? tnField : "";
      results.push({ trackingNumber: tnSafe, ok: false, error: message });
    }
  }

  // Spec says response payload N/A; we'll return a small summary for observability.
  const res = NextResponse.json({ ok: true, processed: results.length, results });
  res.headers.set("X-RateLimit-Limit", "100");
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  res.headers.set("X-RateLimit-Reset", String(rl.resetAt));
  return res;
}
