import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getAllowedWarehouseKeys, verifyWarehouseKeyFromRequest } from "@/lib/rbac";

// External-style Delete Package endpoint alias
// URL: /api/warehouse/deletepackage/subdir
// Method: POST
// Accepts either a single object or an array of objects. Each object should contain TrackingNumber.
// Auth via x-api-key/x-warehouse-key or APIToken in the body.
export async function POST(req: Request) {
  let authorized = verifyWarehouseKeyFromRequest(req);
  let bodyText = "";

  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!authorized) {
    try {
      const maybe = JSON.parse(bodyText);
      let token: string | undefined;
      if (Array.isArray(maybe)) {
        token = maybe.find((x: any) => typeof x?.APIToken === "string" && x.APIToken.trim())?.APIToken?.trim();
      } else if (maybe && typeof maybe === "object") {
        token = typeof maybe.APIToken === "string" ? maybe.APIToken.trim() : undefined;
      }
      if (token) {
        const allowed = getAllowedWarehouseKeys();
        if (allowed.includes(token)) authorized = true;
      }
    } catch {
      // ignore parse errors; will fall through to unauthorized
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
