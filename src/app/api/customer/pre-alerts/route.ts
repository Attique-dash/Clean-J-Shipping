import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { PreAlert } from "@/models/PreAlert";
import { customerPreAlertCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userCode = payload.userCode as string | undefined;
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await PreAlert.find({ userCode }).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ pre_alerts: items });
}

export async function POST(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = customerPreAlertCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tracking_number, carrier, origin, expected_date, notes } = parsed.data;

  const user = payload._id ? await User.findById(payload._id).select("_id userCode") : null;
  const userCode = user?.userCode || (payload.userCode as string | undefined);
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expectedDate = expected_date
    ? (/^\d{4}-\d{2}-\d{2}$/.test(expected_date)
        ? new Date(`${expected_date}T00:00:00.000Z`)
        : new Date(expected_date))
    : undefined;

  const created = await PreAlert.create({
    userCode,
    customer: user?._id,
    trackingNumber: tracking_number,
    carrier,
    origin,
    expectedDate,
    notes,
  });

  // TODO: Notify warehouse (email/webhook) - placeholder

  return NextResponse.json({
    pre_alert_id: String(created._id),
    tracking_number,
    carrier: carrier ?? null,
    origin: origin ?? null,
    expected_date: expectedDate ? expectedDate.toISOString() : null,
    notes: notes ?? null,
    integration_source: "customer_pre_alert",
  });
}
