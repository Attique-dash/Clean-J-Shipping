import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { dbConnect } from "@/lib/db";
import { Payment } from "@/models/Payment";
import * as paypal from "@paypal/checkout-server-sdk";
import { OrdersCaptureRequest } from "@paypal/checkout-server-sdk";

// PayPal response types
interface PayPalCaptureResult {
  id: string;
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        amount?: {
          value?: string;
          currency_code?: string;
        };
        id?: string;
      }>;
    };
  }>;
}

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
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const client = paypalClient();
    if (!client) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
    }

    // Capture the PayPal order
    const request = new OrdersCaptureRequest(orderId);
    request.requestBody({});

    const capture = await client.execute(request);

    if (capture.statusCode === 201 && capture.result) {
      await dbConnect();
      
      const result = capture.result as PayPalCaptureResult;
      const captureId = result.id;
      const amount = parseFloat(result.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || "0");
      const currency = result.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || "USD";
      const userCode = result.purchase_units?.[0]?.custom_id || `PAYPAL-${Date.now()}`;

      // Create Payment record in MongoDB
      const payment = new Payment({
        userCode: userCode,
        amount: amount,
        currency: currency,
        method: "wallet" as const, // PayPal is a wallet method
        reference: captureId,
        gatewayId: orderId,
        status: "captured" as const,
        meta: {
          captureId,
          paypalOrderId: orderId,
          paypalCapture: capture.result,
        },
      });
      await payment.save();

      // Also update Prisma payment if exists
      try {
        await prisma.payment.updateMany({
          where: {
            transactionId: orderId,
          },
          data: {
            status: "completed",
            paidAt: new Date(),
            metadata: JSON.stringify({
              captureId,
              paypalOrderId: orderId,
            }),
          },
        });
      } catch (prismaError) {
        // Prisma update is optional, continue even if it fails
        console.warn("Prisma payment update failed:", prismaError);
      }

      return NextResponse.json({
        success: true,
        captureId,
        amount,
        currency,
        paymentId: payment._id,
      });
    } else {
      throw new Error("Failed to capture PayPal order");
    }
  } catch (error) {
    console.error("Error capturing PayPal payment:", error);
    return NextResponse.json({ 
      error: "Failed to capture payment",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

