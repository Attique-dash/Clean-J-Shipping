import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { createPayPalOrder, validatePayPalConfig, PayPalOrderRequest } from "@/lib/paypal";

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate PayPal configuration
  const validation = validatePayPalConfig();
  if (!validation.isValid) {
    console.error("PayPal configuration error:", validation.error);
    return NextResponse.json(
      { 
        error: "PayPal service unavailable", 
        details: "Payment service is temporarily unavailable. Please try again later or contact support."
      }, 
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { amount, currency = "JMD", description = "Payment", trackingNumber, items } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Validate currency
    const supportedCurrencies = ["JMD", "USD", "EUR", "GBP"];
    if (!supportedCurrencies.includes(currency)) {
      return NextResponse.json({ 
        error: "Unsupported currency",
        supportedCurrencies 
      }, { status: 400 });
    }

    const orderRequest: PayPalOrderRequest = {
      amount,
      currency,
      description,
      trackingNumber,
      items,
    };

    const order = await createPayPalOrder(orderRequest);

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      status: order.status,
      approvalUrl: order.approvalUrl,
    });
  } catch (error) {
    console.error("PayPal order creation error:", error);
    
    // Handle specific PayPal errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    let statusCode = 500;
    let userMessage = "Failed to create payment order. Please try again.";

    if (errorMessage.includes("Invalid amount")) {
      statusCode = 400;
      userMessage = "Invalid payment amount specified.";
    } else if (errorMessage.includes("PayPal client not initialized")) {
      statusCode = 503;
      userMessage = "Payment service is temporarily unavailable.";
    } else if (errorMessage.includes("Failed to create PayPal order")) {
      statusCode = 502;
      userMessage = "Payment provider error. Please try again or use alternative payment method.";
    }

    return NextResponse.json(
      {
        error: "Payment order creation failed",
        details: userMessage,
        ...(process.env.NODE_ENV === "development" && { technicalDetails: errorMessage })
      },
      { status: statusCode }
    );
  }
}

