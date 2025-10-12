import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

// Map internal PackageStatus to admin UI status keys
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
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = (url.searchParams.get("status") || "").trim().toLowerCase();
  const sort = (url.searchParams.get("sort") || "newest").toLowerCase(); // newest|oldest
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const per_pageRaw = Math.max(parseInt(url.searchParams.get("per_page") || "20", 10) || 20, 1);
  const per_page = Math.min(per_pageRaw, 100);

  const filter: Record<string, unknown> = { status: { $ne: "Deleted" } };
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    (filter as any).$or = [{ trackingNumber: regex }, { userCode: regex }, { controlNumber: regex }];
  }
  // Map UI status filter to internal statuses
  if (status) {
    const map: Record<string, string[]> = {
      in_transit: ["In Transit"],
      ready_for_pickup: ["At Local Port"],
      delivered: ["Delivered"],
      pending: ["Unknown", "At Warehouse"],
    };
    const allowed = map[status];
    if (allowed) (filter as any).status = { $in: allowed };
  }

  const total_count = await Package.countDocuments(filter);
  const sortSpec = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
  const pkgs = await Package.find(filter)
    .sort(sortSpec)
    .skip((page - 1) * per_page)
    .limit(per_page)
    .lean();

  // Load users for names by userCode for current page
  const userCodes = Array.from(new Set(pkgs.map((p: any) => p.userCode).filter(Boolean)));
  const users = await User.find({ userCode: { $in: userCodes } })
    .select("_id userCode firstName lastName")
    .lean();
  const userByCode = new Map<string, { _id: unknown; firstName?: string; lastName?: string }>(
    users.map((u: any) => [u.userCode as string, { _id: u._id, firstName: u.firstName, lastName: u.lastName }])
  );

  const packages = pkgs.map((p: any) => {
    const user = userByCode.get(p.userCode);
    const fname = user?.firstName || p.firstName || "";
    const lname = user?.lastName || p.lastName || "";
    const customer_name = [fname, lname].filter(Boolean).join(" ");
    const dimensions =
      p.length && p.width && p.height ? `${p.length}×${p.width}×${p.height} cm` : undefined;
    const received_date = (p.entryDate || p.createdAt) ? new Date(p.entryDate || p.createdAt).toISOString() : undefined;
    const hasDocs = Array.isArray(p.invoiceDocuments) && p.invoiceDocuments.length > 0;
    const hasRecs = Array.isArray(p.invoiceRecords) && p.invoiceRecords.length > 0;
    const has_invoice = Boolean(hasDocs || hasRecs);
    const invoice_status = hasRecs ? (p.invoiceRecords[p.invoiceRecords.length - 1]?.status || "submitted") : (hasDocs ? "submitted" : "none");
    return {
      tracking_number: p.trackingNumber,
      customer_name,
      customer_id: user?._id ? String(user._id) : null,
      status: toUiStatus(p.status),
      current_location: p.branch || undefined,
      weight: p.weight ?? undefined,
      dimensions,
      description: p.description || undefined,
      received_date,
      has_invoice,
      invoice_status,
    };
  });

  // Build status counts across all non-deleted packages
  const agg = await Package.aggregate([
    { $match: { status: { $ne: "Deleted" } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const rawCounts = Object.fromEntries(agg.map((a: any) => [a._id as string, a.count as number]));
  const status_counts = {
    in_transit: (rawCounts["In Transit"] || 0) as number,
    ready_for_pickup: (rawCounts["At Local Port"] || 0) as number,
    delivered: (rawCounts["Delivered"] || 0) as number,
    pending: ((rawCounts["Unknown"] || 0) + (rawCounts["At Warehouse"] || 0)) as number,
  };

  return NextResponse.json({ packages, total_count, status_counts, page, per_page });
}
