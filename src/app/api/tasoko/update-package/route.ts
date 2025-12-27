import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type PackageStatus } from "@/models/Package";
import { tasokoUpdatePackageSchema } from "@/lib/validators";
import { isWarehouseAuthorized } from "@/lib/rbac";

export async function POST(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = tasokoUpdatePackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tracking_number, new_status, update_date, location, notes, additional_data } = parsed.data;

  // Normalize update_date
  let at = new Date();
  if (update_date) {
    at = /^\d{4}-\d{2}-\d{2}$/.test(update_date)
      ? new Date(`${update_date}T00:00:00.000Z`)
      : new Date(update_date);
  }

  // Map Tasoko status to internal status
  const mapToInternal = (s: string): PackageStatus => {
    switch (s) {
      case "in_transit":
        return "In Transit";
      case "ready_for_pickup":
        return "At Local Port";
      case "delivered":
        return "Delivered";
      case "pending":
      case "received":
        return "At Warehouse";
      case "cleared_customs":
        return "In Transit";
      case "in_customs":
        return "Unknown";
      default:
        return "Unknown";
    }
  };
  const internalStatus = mapToInternal(new_status);

  // Optionally merge additional_data into packagePayments JSON
  const pkg = await Package.findOne({ trackingNumber: tracking_number });
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  let packagePaymentsObj: Record<string, unknown> = {};
  try {
    if (pkg.packagePayments) packagePaymentsObj = JSON.parse(pkg.packagePayments);
  } catch {
    packagePaymentsObj = {};
  }
  if (additional_data) {
    packagePaymentsObj = { ...packagePaymentsObj, tasoko_additional: additional_data };
  }

  pkg.status = internalStatus;
  if (location && location.trim()) pkg.branch = location.trim();
  pkg.updatedAt = at;
  if (Object.keys(packagePaymentsObj).length) {
    pkg.packagePayments = JSON.stringify(packagePaymentsObj);
  }
  if (!Array.isArray(pkg.history)) pkg.history = [];
  pkg.history.push({ status: internalStatus, at, note: notes });
  await pkg.save();

  return NextResponse.json({
    tracking_number,
    new_status,
    update_date: at.toISOString(),
    location: location ?? null,
    notes: notes ?? null,
    additional_data: additional_data ?? {},
    integration_source: "tasoko",
  });
}
