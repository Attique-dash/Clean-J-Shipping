// src/app/api/customer/payments/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";
import { sendPaymentReceiptEmail } from "@/lib/email";

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

    // Check if this is a payment processing request (from customer bills page)
    const { trackingNumber, amount, currency, paymentMethod, paypalOrderId, cardDetails } = raw as any;
    
    // If it has trackingNumber, it's a payment processing request
    if (trackingNumber) {
      return await handlePaymentProcessing(payload, raw);
    }
    
    // Otherwise, it's a payment creation request (for PayPal orders)
    const { amount: createAmount, currency: createCurrency = "USD", method = "card", package_id, invoice_number } = raw as any;

    if (!createAmount || createAmount < 0.5) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    console.log('[Payments API] Creating payment for user:', payload.id, 'amount:', createAmount, 'package:', package_id);

    await dbConnect();

    // Generate a unique payment ID for PayPal tracking
    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record with PayPal payment ID
    const created = await Payment.create({
      userId: payload.id,
      paymentNumber: paymentId,
      gatewayId: paymentId,
      amount: createAmount,
      currency: createCurrency,
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
      amount: createAmount,
      currency: createCurrency,
    });
  } catch (error) {
    console.error("[Payments API] Error:", error);
    return NextResponse.json({ error: "Failed to process payment request" }, { status: 500 });
  }
}

async function handlePaymentProcessing(payload: any, body: any) {
  const { trackingNumber, amount, currency, paymentMethod, paypalOrderId } = body;

  if (!trackingNumber || !amount || !paymentMethod) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  await dbConnect();

  // Get user
  const userId = (payload as any).uid || (payload as any)._id;
  const user = await User.findById(userId).select("email firstName lastName name");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Find package
  const pkg = await Package.findOne({ trackingNumber });
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  // Verify user owns this package
  if (pkg.userCode !== (payload as any).userCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Update invoice record
  const invoiceRecords = Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [];
  if (invoiceRecords.length > 0) {
    const latestRecord = invoiceRecords[invoiceRecords.length - 1];
    latestRecord.status = "paid";
    latestRecord.paymentDate = new Date();
    latestRecord.paymentMethod = paymentMethod;
    latestRecord.paypalOrderId = paypalOrderId || undefined;
    
    await Package.findByIdAndUpdate(pkg._id, {
      $set: {
        invoiceRecords,
        updatedAt: new Date(),
      },
      $push: {
        history: {
          status: pkg.status,
          at: new Date(),
          note: `Payment received: ${amount} ${currency || "JMD"} via ${paymentMethod}`,
        },
      },
    });
  }

  // Record transaction in Payment model for admin dashboard
  const userCode = (payload as any).userCode || pkg.userCode;
  await Payment.create({
    userCode,
    customer: userId,
    trackingNumber,
    amount: Number(amount),
    currency: currency || "JMD",
    method: (paymentMethod === "paypal" ? "paypal" : paymentMethod) as any,
    status: "captured",
    gatewayId: paypalOrderId || undefined,
    reference: invoiceRecords[invoiceRecords.length - 1]?.invoiceNumber || trackingNumber,
    meta: {
      paypalOrderId: paypalOrderId || undefined,
      invoiceNumber: invoiceRecords[invoiceRecords.length - 1]?.invoiceNumber,
    },
  }).catch((err) => {
    console.error("Failed to record payment transaction:", err);
    // Don't fail the payment if transaction recording fails
  });

  // Send confirmation email
  const customerName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : (user as any).name || user.email;

  if (user.email) {
    sendPaymentReceiptEmail({
      to: user.email,
      firstName: customerName.split(" ")[0] || customerName,
      trackingNumber,
      amount: Number(amount),
      currency: currency || "JMD",
      paymentMethod: paymentMethod === "paypal" ? "PayPal" : "Card",
    }).catch((err) => {
      console.error("Failed to send payment receipt email:", err);
    });
  }

  return NextResponse.json({
    success: true,
    message: "Payment processed successfully",
    trackingNumber,
    amount,
    currency,
    paymentMethod,
  });
}