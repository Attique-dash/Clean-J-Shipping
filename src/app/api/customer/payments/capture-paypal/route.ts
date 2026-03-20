import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { capturePayPalOrder, validatePayPalConfig } from "@/lib/paypal";

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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Validate Order ID format
    if (typeof orderId !== "string" || orderId.length < 10) {
      return NextResponse.json({ error: "Invalid Order ID format" }, { status: 400 });
    }

    const capture = await capturePayPalOrder(orderId);

    return NextResponse.json({
      success: capture.success,
      orderId: capture.orderId,
      status: capture.status,
      amount: capture.amount,
      transactionId: capture.transactionId,
    });
  } catch (error) {
    console.error("PayPal capture error:", error);
    
    // Handle specific PayPal errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    let statusCode = 500;
    let userMessage = "Failed to capture payment. Please try again.";

    if (errorMessage.includes("Invalid Order ID")) {
      statusCode = 400;
      userMessage = "Invalid payment order ID.";
    } else if (errorMessage.includes("PayPal client not initialized")) {
      statusCode = 503;
      userMessage = "Payment service is temporarily unavailable.";
    } else if (errorMessage.includes("Failed to capture PayPal order")) {
      statusCode = 502;
      userMessage = "Payment capture failed. The order may have been cancelled or expired.";
    } else if (errorMessage.includes("ORDER_NOT_APPROVED")) {
      statusCode = 400;
      userMessage = "Payment has not been approved yet. Please complete the payment first.";
    } else if (errorMessage.includes("ORDER_ALREADY_CAPTURED")) {
      statusCode = 400;
      userMessage = "This payment has already been processed.";
    }

    return NextResponse.json(
      {
        error: "Payment capture failed",
        details: userMessage,
        ...(process.env.NODE_ENV === "development" && { technicalDetails: errorMessage })
      },
      { status: statusCode }
    );
  }
}

