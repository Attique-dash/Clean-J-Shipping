import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/rbac";
import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payments = await prisma.payment.findMany({
      where: { userId: payload.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { amount, currency = "USD", method = "card" } = raw as any;

    if (!amount || amount < 0.5) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata: {
        userId: payload.id,
      },
    });

    // Create payment record
    const created = await prisma.payment.create({
      data: {
        userId: payload.id,
        transactionId: paymentIntent.id,
        amount,
        currency,
        paymentMethod: method,
        status: "pending",
        metadata: {
          clientSecret: paymentIntent.client_secret
        }
      }
    });

    return NextResponse.json({
      payment_id: created.id,
      client_secret: paymentIntent.client_secret,
      amount,
      currency,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}