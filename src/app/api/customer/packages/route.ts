import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

function toUiStatus(status: string): "in_transit" | "ready_for_pickup" | "delivered" | "pending" {
  switch (status) {
    case "In Transit":
      return "in_transit";
    case "Delivered":
      return "delivered";
    case "At Local Port":
      return "ready_for_pickup";
    case "At Warehouse":
    case "Unknown":
    default:
      return "pending";
  }
}

export async function GET(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let userCode = payload.userCode as string | undefined;

  if (!userCode && payload._id) {
    const user = await User.findById(payload._id).select("userCode role");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userCode = user.userCode;
  }

  if (!userCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [total_packages, pkgs] = await Promise.all([
    Package.countDocuments({ userCode, status: { $ne: "Deleted" } }),
    Package.find({ userCode, status: { $ne: "Deleted" } })
      .select(
        "trackingNumber status description weight branch entryDate updatedAt createdAt history invoiceDocuments invoiceRecords"
      )
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean<IPackage & { _id?: string | { toString(): string }; branch?: string; entryDate?: Date; updatedAt?: Date; invoiceDocuments?: unknown[]; invoiceRecords?: { status: string; submittedAt?: Date; totalValue?: number }[] }>(),
  ]);

  const packages = pkgs.map((p) => {
    const status = toUiStatus(p.status);
    const current_location = p.branch || undefined;
    const weightNum = typeof p.weight === "number" ? p.weight : undefined;
    const weight = typeof weightNum === "number" ? `${weightNum} kg` : undefined;

    // Invoice status
    const hasDocs = Array.isArray(p.invoiceDocuments) && p.invoiceDocuments.length > 0;
    const hasRecs = Array.isArray(p.invoiceRecords) && p.invoiceRecords.length > 0;
    let invoice_status: string = "none";
    if (hasRecs) {
      const latest = p.invoiceRecords[p.invoiceRecords.length - 1];
      invoice_status = latest?.status || "submitted";
    } else if (hasDocs) {
      invoice_status = "submitted";
    } else {
      invoice_status = "action_required";
    }

    // Ready since: from history last time it became At Local Port
    let ready_since: string | undefined = undefined;
    if (status === "ready_for_pickup" && Array.isArray(p.history)) {
      const lastReady = [...p.history].reverse().find((h: { status: string; at?: Date }) => h.status === "At Local Port");
      if (lastReady?.at) {
        const d = new Date(lastReady.at);
        ready_since = d.toISOString().slice(0, 10);
      }
    }

    // Actions based on status
    const actions_available: string[] = ["view_details"];
    if (status === "in_transit") actions_available.push("track", "upload_document");
    else if (status === "ready_for_pickup") actions_available.push("pay_fees", "schedule_pickup");
    else if (status === "delivered") actions_available.push("track");
    else actions_available.push("upload_document");

    // estimated delivery heuristic
    let estimated_delivery: string | undefined = undefined;
    if (p.entryDate) {
      const base = new Date(p.entryDate);
      if (status === "in_transit") base.setDate(base.getDate() + 7);
      else if (status === "ready_for_pickup") base.setDate(base.getDate() + 1);
      else if (status === "pending") base.setDate(base.getDate() + 10);
      if (!isNaN(base.getTime())) estimated_delivery = base.toISOString().slice(0, 10);
    }

    const id = p._id ? (typeof p._id === "string" ? p._id : p._id.toString()) : undefined;
    return {
      id,
      tracking_number: p.trackingNumber,
      description: p.description || undefined,
      status,
      current_location,
      estimated_delivery,
      weight,
      weight_kg: weightNum,
      invoice_status,
      ready_since,
      updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
    };
  });

  return NextResponse.json({ packages, total_packages });
}
