// src/app/api/bills/[id]/pay/route.ts
// Create PayPal order for bill payment

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Bill from "@/models/Bill";
import { getAuthFromRequest } from "@/lib/rbac";
import { createPayPalOrder, validatePayPalConfig } from "@/lib/paypal";
import { Types } from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Validate PayPal configuration
    const configValidation = validatePayPalConfig();
    if (!configValidation.isValid) {
      return NextResponse.json(
        { error: configValidation.error || "PayPal not configured" },
        { status: 503 }
      );
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
        { error: "You don't have permission to pay this bill" },
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

    // Check if cancelled
    if (bill.status === "cancelled") {
      return NextResponse.json(
        { error: "Bill has been cancelled" },
        { status: 400 }
      );
    }

    // Create PayPal order
    const orderRequest = {
      amount: bill.totalAmount,
      currency: bill.currency || "USD",
      description: `Payment for Bill #${bill.billNumber}`,
      items: bill.packages.map((pkg: any) => ({
        trackingNumber: pkg.trackingNumber,
        amount: pkg.total,
        description: `Package ${pkg.trackingNumber}`
      }))
    };

    const paypalOrder = await createPayPalOrder(orderRequest);

    // Update bill with PayPal order ID
    bill.paypalOrderId = paypalOrder.orderId;
    bill.status = "sent"; // Mark as sent/pending payment
    bill.paymentGateway = "paypal";
    await bill.save();

    return NextResponse.json({
      success: true,
      message: "PayPal order created successfully",
      billId: bill._id,
      billNumber: bill.billNumber,
      paypalOrderId: paypalOrder.orderId,
      approvalUrl: paypalOrder.approvalUrl,
      amount: bill.totalAmount,
      currency: bill.currency
    });

  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
