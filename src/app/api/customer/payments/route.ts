import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import { customerPaymentCreateSchema } from "@/lib/validators";
import { stripe } from "@/lib/stripe";

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

  const user = payload._id ? await User.findById(payload._id).select("_id userCode firstName lastName") : null;
  const userCode = user?.userCode || (payload.userCode as string | undefined);
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, currency = "USD", method = "visa", reference, tracking_number, billing } = parsed.data as {
    amount: number;
    currency?: string;
    method?: string;
    reference?: string;
    tracking_number?: string;
    billing?: Record<string, unknown> | undefined;
  };

  // Create Stripe PaymentIntent
  if (!amount || amount < 0.5) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata: {
        userCode,
        trackingNumber: tracking_number || "",
      },
      description: user ? `Payment for ${user.firstName || ""} ${user.lastName || ""}`.trim() : undefined,
    });

    const created = await Payment.create({
      userCode,
      customer: user?._id,
      amount,
      currency,
      method,
      reference: paymentIntent.client_secret || reference,
      gatewayId: paymentIntent.id,
      status: "initiated",
      trackingNumber: tracking_number,
      meta: { source: "customer_portal", billing },
    });

    return NextResponse.json({
      payment_id: String(created._id),
      client_secret: paymentIntent.client_secret,
      amount,
      currency,
    });
  } catch (error: unknown) {
    const message = typeof error === "object" && error !== null && "message" in error ? (error as { message?: string }).message : undefined;
    console.error("Stripe error:", error);
    return NextResponse.json({ error: message || "Stripe error" }, { status: 500 });
  }
}
