import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  const filter: Record<string, unknown> & { $and: Array<Record<string, unknown>> } = {
    $and: [
      { status: { $ne: "Deleted" } },
      { $or: [{ status: "Unknown" }, { customer: { $exists: false } }, { customer: null }] },
    ],
  };
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$and.push({ $or: [{ trackingNumber: regex }, { description: regex }] });
  }

  const pkgs = await Package.find(filter)
    .select("trackingNumber description createdAt status")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return NextResponse.json({
    packages: pkgs.map((p) => ({
      tracking_number: p.trackingNumber,
      status: p.status,
      description: (p as Record<string, unknown>).description || null,
      created_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    })),
    total_count: pkgs.length,
  });
}

export async function PUT(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = raw as Partial<{
    tracking_number: string;
    new_tracking_number?: string;
    user_code: string;
  }>;

  if (!data.tracking_number || !data.user_code) {
    return NextResponse.json({ error: "tracking_number and user_code are required" }, { status: 400 });
  }

  // Validate user exists
  const user = await User.findOne({ userCode: data.user_code, role: "customer" }).select("_id userCode");
  if (!user) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Assign package to customer, optionally update tracking number and set status to At Warehouse if Unknown
  const update: Record<string, unknown> = {
    userCode: user.userCode,
    customer: user._id,
    updatedAt: new Date(),
  };
  if (data.new_tracking_number && data.new_tracking_number.trim()) {
    update.trackingNumber = data.new_tracking_number.trim();
  }

  // If status Unknown, move to At Warehouse after assignment
  const pkg = await Package.findOne({ trackingNumber: data.tracking_number }).select("status");
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  if (pkg.status === "pending") update.status = "received";

  const updated = await Package.findOneAndUpdate({ trackingNumber: data.tracking_number }, { $set: update }, { new: true });

  return NextResponse.json({ ok: true, tracking_number: updated?.trackingNumber, status: updated?.status });
}
