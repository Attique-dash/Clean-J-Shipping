import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { getAllowedWarehouseKeys, verifyWarehouseKeyFromRequest } from "@/lib/rbac";
import { getServiceTypeName, getExternalStatusLabel } from "@/lib/mappings";

// Narrowing helper for extracting APIToken from arbitrary JSON
function hasStringApiToken(x: unknown): x is { APIToken: string } {
  const token = (x as any)?.APIToken;
  return typeof token === "string" && token.trim().length > 0;
}

// This endpoint ingests an array of package objects in the external format and upserts them into our system.
// URL: /api/warehouse/addpackage/subdir
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
      const tokenInBody = arr.find(hasStringApiToken)?.APIToken.trim();
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
  let payload: unknown;
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

      const initial: Partial<IPackage> = {
        trackingNumber,
        userCode: customer.userCode,
        customer: customer._id as any,
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
        cubes: Number.isFinite(Number(item?.Cubes)) ? Number(item?.Cubes) : undefined,
        length: Number.isFinite(Number(item?.Length)) ? Number(item?.Length) : undefined,
        width: Number.isFinite(Number(item?.Width)) ? Number(item?.Width) : undefined,
        height: Number.isFinite(Number(item?.Height)) ? Number(item?.Height) : undefined,
        pieces: Number.isFinite(Number(item?.Pieces)) ? Number(item?.Pieces) : undefined,
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
      results.push({ trackingNumber: String((item as any)?.TrackingNumber || ""), ok: false, error: message });
    }
  }

  // Spec says response payload N/A; we'll return a small summary for observability.
  return NextResponse.json({ ok: true, processed: results.length, results });
}
