// src/app/api/customer/payments/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  // ✅ FIX: Added await
  const payload = await getAuthFromRequest(req);
  
  if (!payload || payload.role !== "customer") {
    console.log('[Payments API] Unauthorized:', payload);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log('[Payments API] Fetching payments for user:', payload.id);
    
    await dbConnect();
    
    const payments = await Payment.find({ userId: payload.id })
      .sort({ createdAt: -1 })
      .limit(100);

    console.log('[Payments API] Found payments:', payments.length);

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("[Payments API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // ✅ FIX: Added await
  const payload = await getAuthFromRequest(req);
  
  if (!payload || payload.role !== "customer") {
    console.log('[Payments API] Unauthorized:', payload);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { amount, currency = "USD", method = "card", package_id, invoice_number } = raw as any;

    if (!amount || amount < 0.5) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    console.log('[Payments API] Creating payment for user:', payload.id, 'amount:', amount, 'package:', package_id);

    await dbConnect();

    // Generate a unique payment ID for PayPal tracking
    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record with PayPal payment ID
    const created = await Payment.create({
      userId: payload.id,
      paymentNumber: paymentId,
      gatewayId: paymentId,
      amount,
      currency,
      paymentMethod: "paypal",
      status: "pending",
      metadata: {
        paymentId,
        package_id,
        invoice_number,
      }
    });

    console.log('[Payments API] Payment created:', created.id);

    return NextResponse.json({
      payment_id: created.id,
      payment_id_paypal: paymentId,
      amount,
      currency,
    });
  } catch (error) {
    console.error("[Payments API] Error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}