// src/app/api/webhooks/kcd/route.ts
// KCD Logistics webhook handler for real-time package updates

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { sendStatusUpdateEmail, sendNewPackageEmail } from "@/lib/email";
import crypto from "crypto";

function getKcdWebhookSecret(): string {
  return process.env.KCD_WEBHOOK_SECRET || process.env.KCD_API_KEY || "";
}

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

interface KCDWebhookEvent {
  event: "package.received" | "package.in-transit" | "package.delivered" | string;
  data: {
    trackingNumber: string;
    status?: string;
    timestamp?: string;
    location?: string;
    note?: string;
    weight?: number;
    shipper?: string;
    customerMailbox?: string;
  };
}

const statusMap: Record<string, string> = {
  "package.received": "At Warehouse",
  "package.in-transit": "In Transit",
  "package.delivered": "Delivered",
  received: "At Warehouse",
  "in-transit": "In Transit",
  delivered: "Delivered",
};

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  console.log(`[KCD Webhook ${requestId}] Received webhook at ${timestamp}`);

  try {
    const signature = req.headers.get("x-kcd-signature") || req.headers.get("x-webhook-signature");
    const secret = getKcdWebhookSecret();

    const rawBody = await req.text();

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.error(`[KCD Webhook ${requestId}] Invalid signature`);
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let event: KCDWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { event: eventType, data } = event;

    if (!data?.trackingNumber) {
      return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });
    }

    await dbConnect();

    const { trackingNumber, status: eventStatus, timestamp: eventTimestamp, location, note, weight, shipper, customerMailbox } = data;

    const newStatus = eventStatus || statusMap[eventType] || "Unknown";

    const pkg = await Package.findOne({
      trackingNumber: trackingNumber.trim().toUpperCase(),
    });

    if (!pkg) {
      console.warn(`[KCD Webhook ${requestId}] Package not found: ${trackingNumber}`);
      return NextResponse.json(
        { error: "Package not found", trackingNumber },
        { status: 404 }
      );
    }

    const oldStatus = pkg.status;
    const statusChanged = oldStatus !== newStatus;

    pkg.status = newStatus;
    pkg.lastScan = eventTimestamp ? new Date(eventTimestamp) : new Date();

    if (location) pkg.currentLocation = location;
    if (weight && !pkg.weight) pkg.weight = weight;
    if (shipper && !pkg.shipper) pkg.shipper = shipper;
    if (customerMailbox && !pkg.mailboxNumber) pkg.mailboxNumber = customerMailbox;

    if (!pkg.history) pkg.history = [];
    pkg.history.push({
      status: newStatus,
      at: new Date(eventTimestamp || timestamp),
      note: note || `Webhook: ${eventType}`,
    });

    await pkg.save();

    let emailSent = false;
    if (statusChanged) {
      try {
        const user = await User.findById(pkg.userId);
        if (user?.email) {
          if (eventType === "package.received") {
            // Get warehouse addresses from database
            let warehouseAddresses = { airAddress: '', seaAddress: '', chinaAddress: '' };
            try {
              const { Warehouse } = await import('@/models/Warehouse');
              const defaultWarehouse = await Warehouse.findOne({ isActive: true, isDefault: true })
                .select('airAddress seaAddress chinaAddress address')
                .lean() as { airAddress?: string; seaAddress?: string; chinaAddress?: string; address?: string } | null;
              if (defaultWarehouse) {
                warehouseAddresses = {
                  airAddress: defaultWarehouse.airAddress || defaultWarehouse.address || '',
                  seaAddress: defaultWarehouse.seaAddress || defaultWarehouse.address || '',
                  chinaAddress: defaultWarehouse.chinaAddress || defaultWarehouse.address || ''
                };
              }
            } catch (whError) {
              console.error(`[KCD Webhook] Failed to fetch warehouse addresses:`, whError);
            }
            
            await sendNewPackageEmail({
              to: user.email,
              firstName: user.firstName || "Customer",
              trackingNumber: pkg.trackingNumber,
              status: newStatus,
              weight: pkg.weight,
              shipper: pkg.shipper || pkg.senderName,
              warehouse: pkg.warehouseLocation || "KCD Main Warehouse",
              receivedDate: pkg.dateReceived || new Date(),
              description: pkg.itemDescription || pkg.description,
              warehouseAddresses,
              userCode: user.userCode,
            });
          } else {
            await sendStatusUpdateEmail({
              to: user.email,
              firstName: user.firstName || "Customer",
              trackingNumber: pkg.trackingNumber,
              status: newStatus,
              note: note || `Status updated to ${newStatus}`,
            });
          }
          emailSent = true;
        }
      } catch (emailError) {
        console.error(`[KCD Webhook ${requestId}] Email failed:`, emailError);
      }
    }

    console.log(`[KCD Webhook ${requestId}] Processed ${eventType} for ${trackingNumber}`);

    return NextResponse.json({
      success: true,
      event: eventType,
      trackingNumber,
      oldStatus,
      newStatus,
      emailSent,
      timestamp,
      requestId,
    }, { status: 200 });

  } catch (error) {
    console.error(`[KCD Webhook ${requestId}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "KCD Webhook endpoint - Use POST to send webhook events",
    supportedEvents: [
      "package.received",
      "package.in-transit",
      "package.delivered",
    ],
    expectedHeaders: {
      "x-kcd-signature": "HMAC-SHA256 signature of payload",
    },
  });
}
