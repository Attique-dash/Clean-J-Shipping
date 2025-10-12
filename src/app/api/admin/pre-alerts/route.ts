import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { PreAlert } from "@/models/PreAlert";
import { User } from "@/models/User";

export async function GET(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "").trim(); // submitted|approved|rejected
  const q = (url.searchParams.get("q") || "").trim();

  const filter: any = {};
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
    pre_alerts: list.map((p) => ({
      id: String(p._id),
      tracking_number: p.trackingNumber,
      user_code: p.userCode,
      carrier: p.carrier || null,
      origin: p.origin || null,
      expected_date: p.expectedDate ? new Date(p.expectedDate).toISOString() : null,
      notes: p.notes || null,
      status: p.status || "submitted",
      created_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      decided_at: (p as any).decidedAt ? new Date((p as any).decidedAt).toISOString() : null,
    })),
    total_count: list.length,
  });
}

export async function PUT(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
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
