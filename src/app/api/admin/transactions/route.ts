import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Payment } from "@/models/Payment";

export async function GET(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const method = (url.searchParams.get("method") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const per_page_raw = Math.max(parseInt(url.searchParams.get("per_page") || "20", 10) || 20, 1);
  const per_page = Math.min(per_page_raw, 100);

  const filter: Record<string, unknown> = {};
  if (method) filter.method = method;
  if (status) filter.status = status;
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    (filter as any).$or = [{ reference: regex }, { trackingNumber: regex }, { userCode: regex }, { gatewayId: regex }];
  }

  const total_count = await Payment.countDocuments(filter);
  const items = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * per_page)
    .limit(per_page)
    .lean();

  return NextResponse.json({
    transactions: items.map((p) => ({
      id: String(p._id),
      user_code: p.userCode,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      status: p.status,
      reference: p.reference || null,
      gateway_id: p.gatewayId || null,
      tracking_number: (p as any).trackingNumber || null,
      created_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
    })),
    total_count,
    page,
    per_page,
  });
}
