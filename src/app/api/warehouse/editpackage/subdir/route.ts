import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { getAllowedWarehouseKeys, verifyWarehouseKeyFromRequest } from "@/lib/rbac";
import { mapExternalToInternalStatus, getExternalStatusLabel, getServiceTypeName } from "@/lib/mappings";

// URL: /api/warehouse/editpackage/subdir
// Method: POST
export async function POST(req: Request) {
  // Prefer header-based key (x-warehouse-key or x-api-key)
  let authorized = verifyWarehouseKeyFromRequest(req);
  let bodyText = "";

  // Read body so we can also check APIToken field if header is not set
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!authorized) {
    try {
      const maybeJson = JSON.parse(bodyText);
      const arr = Array.isArray(maybeJson) ? maybeJson : [];
      const tokenInBody = arr.find((x: any) => typeof x?.APIToken === "string" && x.APIToken.trim())?.APIToken?.trim();
      if (tokenInBody) {
        const allowed = getAllowedWarehouseKeys();
        if (allowed.includes(tokenInBody)) authorized = true;
      }
    } catch {
      // ignore, will fall through to unauthorized
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        externalPackageId: typeof item?.PackageID === "string" ? item.PackageID : undefined,
        courierId: typeof item?.CourierID === "string" ? item.CourierID : undefined,
        collectionId: typeof item?.CollectionID === "string" ? item.CollectionID : undefined,
        controlNumber: typeof item?.ControlNumber === "string" ? item.ControlNumber : undefined,
        firstName: typeof item?.FirstName === "string" ? item.FirstName : undefined,
        lastName: typeof item?.LastName === "string" ? item.LastName : undefined,
        entryStaff: typeof item?.EntryStaff === "string" ? item.EntryStaff : undefined,
        entryDate: entryDateStr ? new Date(entryDateStr) : undefined,
        entryDateTime: entryDateStr ? new Date(entryDateStr) : undefined,
        branch: typeof item?.Branch === "string" ? item.Branch : undefined,
        claimed: typeof item?.Claimed === "boolean" ? item.Claimed : undefined,
        showControls: typeof item?.ShowControls === "boolean" ? item.ShowControls : undefined,
        hsCode: typeof item?.HSCode === "string" ? item.HSCode : undefined,
        unknown: typeof item?.Unknown === "boolean" ? item.Unknown : undefined,
        aiProcessed: typeof item?.AIProcessed === "boolean" ? item.AIProcessed : undefined,
        originalHouseNumber: typeof item?.OriginalHouseNumber === "string" ? item.OriginalHouseNumber : undefined,
        cubes: Number.isFinite(Number(item?.Cubes)) ? Number(item.Cubes) : undefined,
        length: Number.isFinite(Number(item?.Length)) ? Number(item.Length) : undefined,
        width: Number.isFinite(Number(item?.Width)) ? Number(item.Width) : undefined,
        height: Number.isFinite(Number(item?.Height)) ? Number(item.Height) : undefined,
        pieces: Number.isFinite(Number(item?.Pieces)) ? Number(item.Pieces) : undefined,
        discrepancy: typeof item?.Discrepancy === "boolean" ? item.Discrepancy : undefined,
        discrepancyDescription: typeof item?.DiscrepancyDescription === "string" ? item.DiscrepancyDescription : undefined,
        serviceTypeId: typeof item?.ServiceTypeID === "string" ? item.ServiceTypeID : undefined,
        serviceTypeName: getServiceTypeName(item?.ServiceTypeID),
        externalStatusLabel: getExternalStatusLabel(item?.PackageStatus),
        hazmatCodeId: typeof item?.HazmatCodeID === "string" ? item.HazmatCodeID : undefined,
        coloaded: typeof item?.Coloaded === "boolean" ? item.Coloaded : undefined,
        coloadIndicator: typeof item?.ColoadIndicator === "string" ? item.ColoadIndicator : undefined,
        packagePayments: typeof item?.PackagePayments === "string" ? item.PackagePayments : undefined,
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
