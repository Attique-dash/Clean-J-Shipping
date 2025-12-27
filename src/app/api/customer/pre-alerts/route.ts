import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { PreAlert } from "@/models/PreAlert";
import { customerPreAlertCreateSchema } from "@/lib/validators";
import { IPreAlert } from "@/models/PreAlert";

type PreAlertLean = Omit<IPreAlert, "_id"> & {
  _id?: { toString(): string };
};

export async function GET(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userCode = payload.userCode as string | undefined;
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await PreAlert.find({ userCode }).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ 
    pre_alerts: items.map((p: any) => ({
      _id: p._id?.toString() || "",
      trackingNumber: p.trackingNumber,
      carrier: p.carrier || null,
      origin: p.origin || null,
      expectedDate: p.expectedDate ? new Date(p.expectedDate).toISOString() : null,
      notes: p.notes || null,
      status: p.status || "submitted",
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      decidedAt: p.decidedAt ? new Date(p.decidedAt).toISOString() : null,
      userCode: p.userCode,
    }))
  });
}

export async function POST(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
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
    const errorMessages = parsed.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    return NextResponse.json({ error: errorMessages }, { status: 400 });
  }

  const { tracking_number, carrier, origin, expected_date, notes } = parsed.data;

  const user = payload._id ? await User.findById(payload._id).select("_id userCode") : null;
  const userCode = user?.userCode || (payload.userCode as string | undefined);
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expectedDate = expected_date
    ? (/^\d{4}-\d{2}-\d{2}$/.test(expected_date)
        ? new Date(`${expected_date}T00:00:00.000Z`)
        : new Date(expected_date))
    : null;

  if (!expectedDate) {
    return NextResponse.json({ error: "Expected arrival date is required" }, { status: 400 });
  }

  let created;
  try {
    created = await PreAlert.create({
      userCode,
      customer: user?._id,
      trackingNumber: tracking_number,
      carrier,
      origin,
      expectedDate,
      notes,
    });
  } catch (error) {
    // Handle duplicate key error
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      const mongoError = error as { code: number; keyPattern?: { trackingNumber?: string } };
      if (mongoError.keyPattern?.trackingNumber) {
        return NextResponse.json({ error: `A pre-alert with tracking number "${tracking_number}" already exists` }, { status: 409 });
      }
    }
    console.error('PreAlert creation error:', error);
    return NextResponse.json({ error: "Failed to create pre-alert" }, { status: 500 });
  }

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
