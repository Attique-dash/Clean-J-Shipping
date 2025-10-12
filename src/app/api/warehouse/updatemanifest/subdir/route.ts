import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAllowedWarehouseKeys, verifyWarehouseKeyFromRequest } from "@/lib/rbac";
import { Manifest } from "@/models/Manifest";
import { Package } from "@/models/Package";
import { getServiceTypeName, getExternalStatusLabel } from "@/lib/mappings";

// URL: /api/warehouse/updatemanifest/subdir
// Method: POST
export async function POST(req: Request) {
  // Prefer header-based key (x-warehouse-key or x-api-key)
  let authorized = verifyWarehouseKeyFromRequest(req);
  let bodyText = "";

  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!authorized) {
    try {
      const maybeJson = JSON.parse(bodyText);
      const tokenInBody = typeof maybeJson?.APIToken === "string" ? maybeJson.APIToken.trim() : "";
      if (tokenInBody) {
        const allowed = getAllowedWarehouseKeys();
        if (allowed.includes(tokenInBody)) authorized = true;
      }
    } catch {
      // ignore
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse JSON for real
  let payload: any;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Payload must be an object" }, { status: 400 });
  }

  const manifestBlock = payload.Manifest || {};
  const manifestId = String(manifestBlock?.ManifestID || "").trim();
  if (!manifestId) {
    return NextResponse.json({ error: "Manifest.ManifestID is required" }, { status: 400 });
  }

  const collectionCodes: string[] = Array.isArray(payload.CollectionCodes)
    ? payload.CollectionCodes.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim())
    : [];
  const packageAwbs: string[] = Array.isArray(payload.PackageAWBs)
    ? payload.PackageAWBs.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim())
    : [];

  // Normalize core fields
  const toDate = (s: any): Date | undefined => {
    if (typeof s === "string" && s.trim()) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    return undefined;
  };

  const setFields = {
    courierId: typeof manifestBlock?.CourierID === "string" ? manifestBlock.CourierID : undefined,
    serviceTypeId: typeof manifestBlock?.ServiceTypeID === "string" ? manifestBlock.ServiceTypeID : undefined,
    serviceTypeName: getServiceTypeName(manifestBlock?.ServiceTypeID),
    manifestStatus: typeof manifestBlock?.ManifestStatus === "string" ? manifestBlock.ManifestStatus : String(manifestBlock?.ManifestStatus || ""),
    manifestStatusLabel: getExternalStatusLabel(manifestBlock?.ManifestStatus),
    manifestCode: typeof manifestBlock?.ManifestCode === "string" ? manifestBlock.ManifestCode : undefined,
    flightDate: toDate(manifestBlock?.FlightDate),
    weight: Number.isFinite(Number(manifestBlock?.Weight)) ? Number(manifestBlock.Weight) : undefined,
    itemCount: Number.isFinite(Number(manifestBlock?.ItemCount)) ? Number(manifestBlock.ItemCount) : undefined,
    manifestNumber: Number.isFinite(Number(manifestBlock?.ManifestNumber)) ? Number(manifestBlock.ManifestNumber) : undefined,
    staffName: typeof manifestBlock?.StaffName === "string" ? manifestBlock.StaffName : undefined,
    entryDate: toDate(manifestBlock?.EntryDate),
    entryDateTime: toDate(manifestBlock?.EntryDateTime),
    awbNumber: typeof manifestBlock?.AWBNumber === "string" ? manifestBlock.AWBNumber : undefined,
    collectionCodes,
    packageAwbs,
    data: payload,
  } as const;

  await dbConnect();

  // Upsert manifest
  await Manifest.findOneAndUpdate(
    { manifestId },
    {
      $setOnInsert: { manifestId, createdAt: new Date() },
      $set: {
        ...setFields,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Attempt to link packages to this manifest by trackingNumber (PackageAWBs)
  if (packageAwbs.length > 0) {
    await Package.updateMany(
      { trackingNumber: { $in: packageAwbs } },
      { $set: { manifestId } }
    );
  }

  // Optionally attempt to link by controlNumber using CollectionCodes if present
  if (collectionCodes.length > 0) {
    await Package.updateMany(
      { controlNumber: { $in: collectionCodes } },
      { $set: { manifestId } }
    );
  }

  // Spec: Response payload N/A; return a small summary for observability
  return NextResponse.json({ ok: true, manifestId, linkedByTracking: packageAwbs.length, linkedByControl: collectionCodes.length });
}
