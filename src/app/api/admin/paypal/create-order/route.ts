import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import * as paypal from "@paypal/checkout-server-sdk";
import { OrdersCreateRequest } from "@paypal/checkout-server-sdk";

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
    const { amount, currency = "USD", description = "Payment", customerCode, receiptNo } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const client = paypalClient();
    if (!client) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
    }

    // Create PayPal order
    const request = new OrdersCreateRequest();
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
    });

    const order = await client.execute(request);

    if (order.statusCode === 201 && order.result) {
      const orderId = order.result.id;
      const approvalUrl = (order.result as any).links?.find((link: any) => link.rel === "approve")?.href as string;

      return NextResponse.json({
        success: true,
        orderId,
        approvalUrl,
        amount: amount,
        currency: currency,
      });
    } else {
      throw new Error("Failed to create PayPal order");
    }
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      {
        error: "Failed to create PayPal order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

