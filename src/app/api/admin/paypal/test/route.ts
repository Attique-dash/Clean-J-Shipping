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

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = paypalClient();
    if (!client) {
      return NextResponse.json({ 
        error: "PayPal not configured",
        configured: false,
        message: "Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file"
      }, { status: 500 });
    }

    // Test PayPal connection by creating a test order
    const request = new OrdersCreateRequest();
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: "1.00",
        },
      }],
    });

    const order = await client.execute(request);
    
    if (order.statusCode === 201 && order.result) {
      return NextResponse.json({
        success: true,
        configured: true,
        message: "PayPal connection successful!",
        environment: process.env.PAYPAL_ENVIRONMENT || "sandbox",
        orderId: order.result.id,
        status: order.result.status,
      });
    } else {
      return NextResponse.json({
        success: false,
        configured: true,
        message: "PayPal connection test failed",
        statusCode: order.statusCode,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("PayPal test error:", error);
    return NextResponse.json({ 
      success: false,
      configured: !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET,
      error: "PayPal connection test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

