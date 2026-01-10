import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { GeneratedInvoice } from "@/models/GeneratedInvoice";
import { PosTransaction } from "@/models/PosTransaction";
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

    // Extract actual ObjectId from prefixed billId
    let actualBillId = billId;
    let billType = 'invoice';
    
    if (billId.startsWith('invoice-')) {
      actualBillId = billId.replace('invoice-', '');
      billType = 'invoice';
    } else if (billId.startsWith('generated-invoice-')) {
      actualBillId = billId.replace('generated-invoice-', '');
      billType = 'generated';
    } else if (billId.startsWith('pos-')) {
      actualBillId = billId.replace('pos-', '');
      billType = 'pos';
    }

    let invoice;
    let packageData;
    let invoiceNumber;
    let currency = "USD";
    let _totalAmount = 0;
    let _balanceAmount = amount;

    // Handle different bill types
    if (billType === 'invoice') {
      invoice = await Invoice.findById(actualBillId);
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      if (amount > invoice.balanceDue) {
        return NextResponse.json({ error: "Payment amount exceeds balance" }, { status: 400 });
      }
      packageData = await Package.findById(invoice.package);
      invoiceNumber = invoice.invoiceNumber;
      currency = invoice.currency || "USD";
      totalAmount = invoice.total;
      balanceAmount = invoice.balanceDue;
    } else if (billType === 'generated') {
      invoice = await GeneratedInvoice.findById(actualBillId);
      if (!invoice) {
        return NextResponse.json({ error: "Generated invoice not found" }, { status: 404 });
      }
      if (amount > invoice.balance) {
        return NextResponse.json({ error: "Payment amount exceeds balance" }, { status: 400 });
      }
      invoiceNumber = invoice.invoiceNumber || `GEN-${actualBillId}`;
      currency = invoice.currency || "USD";
      const _totalAmount = invoice.total || 0;
      const _balanceAmount = invoice.balance;
    } else if (billType === 'pos') {
      invoice = await PosTransaction.findById(actualBillId);
      if (!invoice) {
        return NextResponse.json({ error: "POS transaction not found" }, { status: 404 });
      }
      // POS transactions are always paid, so shouldn't reach here
      return NextResponse.json({ error: "POS transaction is already paid" }, { status: 400 });
    }

    let paymentGateway = "Testing";
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
              currency_code: currency,
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

    // Process payment - update the appropriate bill type
    let updatedBill;
    
    if (billType === 'invoice') {
      const newAmountPaid = invoice.amountPaid + amount;
      const newBalanceDue = invoice.total - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? "paid" : newAmountPaid > 0 ? "sent" : "draft";

      updatedBill = await Invoice.findByIdAndUpdate(
        actualBillId,
        {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
        { new: true }
      );
    } else if (billType === 'generated') {
      const newPaidAmount = (invoice.paidAmount || 0) + amount;
      const newBalance = (invoice.total || 0) - newPaidAmount;
      const newStatus = newBalance <= 0 ? "paid" : "partial";

      updatedBill = await GeneratedInvoice.findByIdAndUpdate(
        actualBillId,
        {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        },
        { new: true }
      );
    }

    // Create payment record
    if (packageData) {
      await Payment.create({
        userId: packageData.userId,
        userCode: packageData.trackingNumber,
        paymentNumber: `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        amount: amount,
        currency: currency,
        method: paymentMethod || "card",
        paymentGateway: paymentGateway,
        status: usePayPal ? "pending" : "completed",
        description: `Payment for invoice ${invoiceNumber}`,
        reference: paypalOrderId || `PAY-${Date.now()}`,
        gatewayId: paypalOrderId || null,
        trackingNumber: packageData.trackingNumber,
        paidAt: usePayPal ? null : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: paypalOrderId ? { paypalOrderId } : null,
        invoiceId: billType === 'invoice' ? invoice._id : null,
      });
    }

    return NextResponse.json({
      success: true,
      bill: {
        id: updatedBill?._id || actualBillId,
        balance: billType === 'invoice' ? updatedBill?.balanceDue : updatedBill?.balance,
        status: billType === 'invoice' ? updatedBill?.status : updatedBill?.status,
      },
      paypalOrderId: paypalOrderId,
      requiresCapture: !!usePayPal,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}

