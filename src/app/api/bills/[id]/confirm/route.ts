// src/app/api/bills/[id]/confirm/route.ts
// Confirm PayPal payment and update bill status

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Bill from "@/models/Bill";
import Package from "@/models/Package";
import User from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";
import { capturePayPalOrder } from "@/lib/paypal";
import { Types } from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ConfirmPaymentRequest {
  paypalOrderId?: string;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: ConfirmPaymentRequest = await req.json();

    // Authenticate user
    const payload = await getAuthFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (payload as { id?: string; _id?: string }).id || 
                  (payload as { id?: string; _id?: string })._id;
    const userRole = payload.role;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate bill ID
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid bill ID" }, { status: 400 });
    }

    await dbConnect();

    // Find the bill
    const bill = await Bill.findById(id);

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Check ownership (customer owns it, or admin)
    if (userRole !== "admin" && bill.customerId.toString() !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to confirm this payment" },
        { status: 403 }
      );
    }

    // Check if already paid
    if (bill.status === "paid") {
      return NextResponse.json(
        { error: "Bill has already been paid" },
        { status: 400 }
      );
    }

    // Use provided order ID or the one stored in bill
    const paypalOrderId = body.paypalOrderId || bill.paypalOrderId;

    if (!paypalOrderId) {
      return NextResponse.json(
        { error: "No PayPal order ID found" },
        { status: 400 }
      );
    }

    // Capture the PayPal payment
    const captureResult = await capturePayPalOrder(paypalOrderId);

    if (!captureResult.success) {
      return NextResponse.json(
        { error: "Failed to capture PayPal payment" },
        { status: 400 }
      );
    }

    // Update bill status
    bill.status = "paid";
    bill.paypalPaymentId = captureResult.transactionId || captureResult.orderId;
    bill.paidAt = new Date();
    bill.paidAmount = captureResult.amount 
      ? parseFloat(captureResult.amount.value)
      : bill.totalAmount;
    await bill.save();

    // Update associated packages to 'ready-for-pickup'
    const packageIds = bill.packages.map((p: any) => p.packageId);
    
    await Package.updateMany(
      { _id: { $in: packageIds } },
      {
        $set: {
          status: "ready-for-pickup",
          billStatus: "paid",
          paidAt: new Date(),
          paymentMethod: "paypal",
          paymentId: captureResult.transactionId || captureResult.orderId
        }
      }
    );

    // Get customer details for email
    const customer = await User.findById(bill.customerId).lean() as any;

    // Send confirmation email
    try {
      const { sendPaymentConfirmationEmail } = await import("@/lib/email");
      await sendPaymentConfirmationEmail({
        to: bill.customerEmail || customer?.email,
        firstName: customer?.firstName,
        billNumber: bill.billNumber,
        amount: bill.paidAmount || bill.totalAmount,
        currency: bill.currency,
        paidAt: bill.paidAt,
        paypalOrderId: captureResult.orderId,
        transactionId: captureResult.transactionId,
        packageCount: bill.packages.length
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    // Notify admin/warehouse
    try {
      const { sendAdminPaymentNotification } = await import("@/lib/email");
      await sendAdminPaymentNotification({
        billNumber: bill.billNumber,
        customerName: bill.customerName || "Unknown",
        customerEmail: bill.customerEmail || customer?.email || "Unknown",
        amount: bill.paidAmount || bill.totalAmount,
        currency: bill.currency,
        packageCount: bill.packages.length,
        packageIds: bill.packages.map((p: any) => p.trackingNumber).join(", ")
      });
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Payment confirmed successfully",
      bill: {
        id: bill._id,
        billNumber: bill.billNumber,
        status: bill.status,
        paidAt: bill.paidAt,
        paidAmount: bill.paidAmount,
        paypalOrderId: bill.paypalOrderId,
        paypalPaymentId: bill.paypalPaymentId,
        currency: bill.currency
      },
      capture: captureResult
    });

  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
