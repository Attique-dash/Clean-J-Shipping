// src/app/api/webhooks/paypal/route.ts
// PayPal webhook handler for payment events

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Bill from "@/models/Bill";
import Package from "@/models/Package";
import User from "@/models/User";
import { verifyPayPalWebhook, getPayPalConfig } from "@/lib/paypal";

// Webhook event logging for debugging
interface WebhookLog {
  eventId: string;
  eventType: string;
  timestamp: Date;
  resourceId?: string;
  status: 'processed' | 'failed' | 'ignored';
  error?: string;
}

const webhookLogs: WebhookLog[] = [];

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    
    // Extract PayPal headers
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(headers, rawBody, webhookId);
    
    if (!isValid) {
      console.error("PayPal webhook signature verification failed");
      // Still log the attempt
      logWebhook({
        eventId: headers['paypal-transmission-id'] || 'unknown',
        eventType: 'signature_verification_failed',
        timestamp: new Date(),
        status: 'failed',
        error: 'Signature verification failed'
      });
      
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const event = JSON.parse(rawBody);
    const eventType = event.event_type;
    const resource = event.resource;

    await dbConnect();

    // Log the webhook
    logWebhook({
      eventId: event.id,
      eventType: eventType,
      timestamp: new Date(),
      resourceId: resource?.id,
      status: 'processed'
    });

    // Handle different event types
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCompleted(resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentDenied(resource);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentRefunded(resource);
        break;

      case 'CHECKOUT.ORDER.COMPLETED':
        await handleOrderCompleted(resource);
        break;

      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(resource);
        break;

      default:
        console.log(`Unhandled PayPal event type: ${eventType}`);
        logWebhook({
          eventId: event.id,
          eventType: eventType,
          timestamp: new Date(),
          status: 'ignored'
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error handling PayPal webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Handle successful payment capture
async function handlePaymentCompleted(resource: any) {
  try {
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    const captureId = resource.id;
    const amount = resource.amount;

    if (!orderId) {
      console.error("No order ID in payment capture");
      return;
    }

    // Find bill by PayPal order ID
    const bill = await Bill.findOne({ paypalOrderId: orderId });

    if (!bill) {
      console.error(`No bill found for PayPal order: ${orderId}`);
      return;
    }

    // Check if already processed
    if (bill.status === 'paid') {
      console.log(`Bill ${bill.billNumber} already marked as paid`);
      return;
    }

    // Update bill status
    bill.status = 'paid';
    bill.paypalPaymentId = captureId;
    bill.paidAt = new Date();
    bill.paidAmount = amount ? parseFloat(amount.value) : bill.totalAmount;
    await bill.save();

    // Update packages
    const packageIds = bill.packages.map((p: any) => p.packageId);
    await Package.updateMany(
      { _id: { $in: packageIds } },
      {
        $set: {
          status: 'ready-for-pickup',
          billStatus: 'paid',
          paidAt: new Date(),
          paymentMethod: 'paypal',
          paymentId: captureId
        }
      }
    );

    // Send confirmation email
    try {
      const customer = await User.findById(bill.customerId).lean() as any;
      const { sendPaymentConfirmationEmail } = await import("@/lib/email");
      await sendPaymentConfirmationEmail({
        to: bill.customerEmail || customer?.email,
        firstName: customer?.firstName,
        billNumber: bill.billNumber,
        amount: bill.paidAmount || bill.totalAmount,
        currency: bill.currency,
        paidAt: bill.paidAt,
        paypalOrderId: orderId,
        transactionId: captureId,
        packageCount: bill.packages.length
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    console.log(`Payment completed for bill ${bill.billNumber}`);

  } catch (error) {
    console.error("Error handling payment completion:", error);
    throw error;
  }
}

// Handle denied payment
async function handlePaymentDenied(resource: any) {
  try {
    const orderId = resource.supplementary_data?.related_ids?.order_id;

    if (!orderId) {
      console.error("No order ID in payment denial");
      return;
    }

    const bill = await Bill.findOne({ paypalOrderId: orderId });

    if (!bill) {
      console.error(`No bill found for PayPal order: ${orderId}`);
      return;
    }

    // Keep status as pending, but log the failure
    console.log(`Payment denied for bill ${bill.billNumber}`);

    // Send failure notification
    try {
      const customer = await User.findById(bill.customerId).lean() as any;
      const { sendPaymentFailedEmail } = await import("@/lib/email");
      await sendPaymentFailedEmail({
        to: bill.customerEmail || customer?.email,
        firstName: customer?.firstName,
        billNumber: bill.billNumber,
        amount: bill.totalAmount,
        currency: bill.currency,
        reason: 'Payment was declined by PayPal'
      });
    } catch (emailError) {
      console.error("Failed to send payment failed email:", emailError);
    }

  } catch (error) {
    console.error("Error handling payment denial:", error);
    throw error;
  }
}

// Handle refunded payment
async function handlePaymentRefunded(resource: any) {
  try {
    const captureId = resource.supplementary_data?.related_ids?.capture_id;

    if (!captureId) {
      console.error("No capture ID in refund");
      return;
    }

    // Find bill by PayPal payment ID
    const bill = await Bill.findOne({ paypalPaymentId: captureId });

    if (!bill) {
      console.error(`No bill found for PayPal capture: ${captureId}`);
      return;
    }

    // Update bill status to reflect refund (custom status)
    bill.status = 'cancelled'; // Or create a 'refunded' status
    bill.adminNotes = `${bill.adminNotes || ''}\nRefunded on ${new Date().toISOString()}`;
    await bill.save();

    // Revert package status
    const packageIds = bill.packages.map((p: any) => p.packageId);
    await Package.updateMany(
      { _id: { $in: packageIds } },
      {
        $set: {
          billStatus: 'refunded',
          status: 'in-warehouse' // Revert to in-warehouse
        }
      }
    );

    console.log(`Payment refunded for bill ${bill.billNumber}`);

  } catch (error) {
    console.error("Error handling payment refund:", error);
    throw error;
  }
}

// Handle order completion (alternative to capture)
async function handleOrderCompleted(resource: any) {
  const orderId = resource.id;
  console.log(`Order completed: ${orderId}`);
  // This might trigger a capture.completed event separately
  // Or we can handle it here if needed
}

// Handle order approval
async function handleOrderApproved(resource: any) {
  const orderId = resource.id;
  console.log(`Order approved: ${orderId}`);
  // Customer has approved the payment on PayPal
  // Actual capture happens separately
}

// Logging helper
function logWebhook(log: WebhookLog) {
  webhookLogs.push(log);
  // Keep only last 100 logs
  if (webhookLogs.length > 100) {
    webhookLogs.shift();
  }
}

// GET endpoint to view recent webhook logs (admin only)
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      logs: webhookLogs.slice(-50) // Last 50 logs
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

// Import needed at the end for the GET handler
import { getAuthFromRequest } from "@/lib/rbac";
