import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { Package } from "@/models/Package";
import { Payment } from "@/models/Payment";
import * as paypal from "@paypal/checkout-server-sdk";

// PayPal client setup
function paypalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";

  if (!clientId || !clientSecret) {
    return null;
  }

  const environment_obj = environment === "production"
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);

  return new paypal.core.PayPalHttpClient(environment_obj);
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const body = await req.json();
    const { billId, amount, paymentMethod, usePayPal } = body;

    if (!billId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const invoice = await Invoice.findById(billId);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (amount > invoice.balanceDue) {
      return NextResponse.json({ error: "Payment amount exceeds balance" }, { status: 400 });
    }

    let paymentGateway = "powertranz";
    let paypalOrderId = null;

    // Process PayPal payment if requested
    if (usePayPal && paymentMethod === "paypal") {
      const client = paypalClient();
      if (!client) {
        return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
      }

      try {
        // Create PayPal order
        const request = new paypal.OrdersCreateRequest();
        request.requestBody({
          intent: "CAPTURE",
          purchase_units: [{
            amount: {
              currency_code: invoice.currency,
              value: amount.toFixed(2),
            },
          }],
        });

        const order = await client.execute(request);
        if (order.statusCode === 201 && order.result) {
          paypalOrderId = order.result.id;
          paymentGateway = "paypal";
        } else {
          throw new Error("Failed to create PayPal order");
        }
      } catch (paypalError) {
        console.error("PayPal error:", paypalError);
        return NextResponse.json({ 
          error: "PayPal payment failed", 
          details: paypalError instanceof Error ? paypalError.message : "Unknown error" 
        }, { status: 500 });
      }
    }

    // Process payment
    const newAmountPaid = invoice.amountPaid + amount;
    const newBalanceDue = invoice.total - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? "paid" : newAmountPaid > 0 ? "sent" : "draft";

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      billId,
      {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
      { new: true }
    );

    // Get package to find userId
    const packageData = await Package.findById(invoice.package);

    // Create payment record
    if (packageData) {
      await Payment.create({
        userId: packageData.userId,
        paymentNumber: `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        amount: amount,
        currency: invoice.currency,
        paymentMethod: paymentMethod || "card",
        paymentGateway: paymentGateway,
        status: usePayPal ? "pending" : "completed",
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        paidAt: usePayPal ? null : new Date(),
        metadata: paypalOrderId ? { paypalOrderId } : null,
        invoiceId: invoice._id,
      });
    }

    return NextResponse.json({
      success: true,
      bill: {
        id: updatedInvoice._id,
        balance: updatedInvoice.balanceDue,
        status: updatedInvoice.status,
      },
      paypalOrderId: paypalOrderId,
      requiresCapture: !!usePayPal,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}

