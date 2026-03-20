import { NextRequest, NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const body = await req.text();
    
    // Get PayPal webhook headers
    const paypalHeaders: Record<string, string> = {
      "paypal-auth-algo": headersList.get("paypal-auth-algo") || "",
      "paypal-transmission-id": headersList.get("paypal-transmission-id") || "",
      "paypal-cert-id": headersList.get("paypal-cert-id") || "",
      "paypal-transmission-sig": headersList.get("paypal-transmission-sig") || "",
      "paypal-transmission-time": headersList.get("paypal-transmission-time") || "",
    };

    // Verify webhook (in production, you'd get webhookId from environment)
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const isValid = await verifyPayPalWebhook(paypalHeaders, body, webhookId);

    if (!isValid) {
      console.error("Invalid PayPal webhook signature");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle different webhook event types
    switch (event.event_type) {
      case "PAYMENT.AUTHORIZATION.CREATED":
        await handlePaymentAuthorizationCreated(event);
        break;
      
      case "PAYMENT.AUTHORIZATION.VOIDED":
        await handlePaymentAuthorizationVoided(event);
        break;
      
      case "PAYMENT.CAPTURE.COMPLETED":
        await handlePaymentCaptureCompleted(event);
        break;
      
      case "PAYMENT.CAPTURE.DENIED":
        await handlePaymentCaptureDenied(event);
        break;
      
      case "CHECKOUT.ORDER.APPROVED":
        await handleOrderApproved(event);
        break;
      
      case "CHECKOUT.ORDER.COMPLETED":
        await handleOrderCompleted(event);
        break;
      
      case "CHECKOUT.ORDER.CANCELLED":
        await handleOrderCancelled(event);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentAuthorizationCreated(event: any) {
  console.log("Payment authorization created:", event.id);
  // Handle authorization created logic
  // Update database, send notifications, etc.
}

async function handlePaymentAuthorizationVoided(event: any) {
  console.log("Payment authorization voided:", event.id);
  // Handle authorization voided logic
}

async function handlePaymentCaptureCompleted(event: any) {
  console.log("Payment capture completed:", event.id);
  
  const capture = event.resource;
  const orderId = capture.supplementary_data?.related_ids?.order_id;
  const amount = capture.amount;
  const transactionId = capture.id;
  
  // Update payment status in database
  // Send confirmation emails
  // Update order status
  console.log(`Payment captured: ${transactionId} for order ${orderId} - ${amount.currency_code} ${amount.value}`);
}

async function handlePaymentCaptureDenied(event: any) {
  console.log("Payment capture denied:", event.id);
  // Handle capture denied logic
  // Notify customer of payment failure
}

async function handleOrderApproved(event: any) {
  console.log("Order approved:", event.id);
  // Handle order approved logic
  // Update order status to "awaiting_payment"
}

async function handleOrderCompleted(event: any) {
  console.log("Order completed:", event.id);
  // Handle order completed logic
  // Update order status to "paid"
  // Send order confirmation
}

async function handleOrderCancelled(event: any) {
  console.log("Order cancelled:", event.id);
  // Handle order cancelled logic
  // Update order status to "cancelled"
  // Notify customer
}
