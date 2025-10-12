import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import { customerPaymentCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  let userCode = payload.userCode as string | undefined;
  if (!userCode && payload._id) {
    const user = await User.findById(payload._id).select("userCode");
    userCode = user?.userCode;
  }
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await Payment.find({ userCode }).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ payments: items });
}

export async function POST(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = customerPaymentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = payload._id ? await User.findById(payload._id).select("_id userCode") : null;
  const userCode = user?.userCode || (payload.userCode as string | undefined);
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, currency = "USD", method = "visa", reference, tracking_number } = parsed.data;

  // Simulate payment gateway
  // In real integration, call gateway (e.g. Stripe, Adyen), handle 3DS, webhooks, etc.
  const gatewayId = `gw_${Date.now().toString(36)}`;
  const status: "initiated" | "authorized" | "captured" = "captured";

  const created = await Payment.create({
    userCode,
    customer: user?._id,
    amount,
    currency,
    method,
    reference,
    gatewayId,
    status,
    trackingNumber: tracking_number,
    meta: { source: "customer_portal" },
  });

  // TODO: send confirmation (email or notification)

  return NextResponse.json({
    payment_id: String(created._id),
    amount: created.amount,
    currency: created.currency,
    method: created.method,
    status: created.status,
    gateway_id: created.gatewayId,
    tracking_number: created.trackingNumber || null,
  });
}
