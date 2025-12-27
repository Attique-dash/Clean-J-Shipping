import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { PreAlert } from "@/models/PreAlert";
import { IPreAlert } from "@/models/PreAlert";

type PreAlertLean = Omit<IPreAlert, "_id"> & {
  _id?: { toString(): string };
};

export async function GET(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  console.log('Admin pre-alerts auth payload:', payload);
  
  if (!payload) {
    console.log('Admin pre-alerts: No payload found');
    return NextResponse.json({ error: "No authentication found" }, { status: 401 });
  }
  
  if (payload.role !== "admin") {
    console.log('Admin pre-alerts: Invalid role:', payload.role);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "").trim(); // submitted|approved|rejected
  const q = (url.searchParams.get("q") || "").trim();

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ trackingNumber: regex }, { userCode: regex }, { carrier: regex }, { origin: regex }];
  }

  const list = await PreAlert.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return NextResponse.json({
    pre_alerts: list.map((p: any) => ({
      _id: p._id?.toString() || "",
      trackingNumber: p.trackingNumber,
      userCode: p.userCode,
      carrier: p.carrier || null,
      origin: p.origin || null,
      expectedDate: p.expectedDate ? new Date(p.expectedDate).toISOString() : null,
      notes: p.notes || null,
      status: p.status || "submitted",
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      decidedAt: p.decidedAt ? new Date(p.decidedAt).toISOString() : null,
    })),
    total_count: list.length,
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
    id: string;
    action: "approve" | "reject";
  }>;
  if (!data.id || !data.action) {
    return NextResponse.json({ error: "id and action are required" }, { status: 400 });
  }

  const status = data.action === "approve" ? "approved" : "rejected";

  const updated = await PreAlert.findByIdAndUpdate(
    data.id,
    { $set: { status, decidedBy: payload._id || null, decidedAt: new Date() } },
    { new: true }
  );
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // TODO: update warehouse systems if needed

  return NextResponse.json({ ok: true, id: String(updated._id), status: updated.status });
}
