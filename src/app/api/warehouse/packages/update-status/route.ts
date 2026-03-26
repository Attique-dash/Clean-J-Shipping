import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";
import { sendNewPackageEmail } from "@/lib/email";
import crypto from "crypto";

function getKcdApiKey(): string {
  return process.env.KCD_API_KEY || "";
}

function verifyApiKey(requestKey: string | null): boolean {
  if (!requestKey) return false;
  const expectedKey = getKcdApiKey();
  if (!expectedKey) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(requestKey),
      Buffer.from(expectedKey)
    );
  } catch {
    return false;
  }
}
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    let isAuthorized = false;
    let authSource = "";

    const authHeader = req.headers.get("authorization");
    const apiKey = req.headers.get("x-api-key");

    if (apiKey && verifyApiKey(apiKey)) {
      isAuthorized = true;
      authSource = "kcd-api-key";
    } else {
      const auth = await getAuthFromRequest(req);
      if (auth && (auth.role === "warehouse" || auth.role === "admin")) {
        isAuthorized = true;
        authSource = "jwt";
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { trackingNumber, status, newStatus, timestamp: eventTimestamp, note, location } = body;

    const finalStatus = newStatus || status;
    
    if (!trackingNumber || !finalStatus) {
      return NextResponse.json(
        { error: "Tracking number and status are required" },
        { status: 400 }
      );
    }

    const statusMap: Record<string, string> = {
      received: "At Warehouse",
      in_processing: "In Processing",
      ready_to_ship: "Ready to Ship",
      shipped: "Shipped",
      in_transit: "In Transit",
      delivered: "Delivered",
      unknown: "Unknown",
      "in-transit": "In Transit",
      "at-warehouse": "At Warehouse",
    };

    const dbStatus = statusMap[finalStatus.toLowerCase()] || finalStatus;

    const pkg = await Package.findOne({ trackingNumber: trackingNumber.trim().toUpperCase() });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const oldStatus = pkg.status;
    const statusChanged = oldStatus !== dbStatus;

    pkg.status = dbStatus;
    pkg.updatedAt = new Date();
    pkg.lastScan = eventTimestamp ? new Date(eventTimestamp) : new Date();

    if (location) {
      pkg.currentLocation = location;
    }

    if (!pkg.history) {
      pkg.history = [];
    }
    pkg.history.push({
      status: dbStatus,
      at: new Date(eventTimestamp || timestamp),
      note: note || `Status updated from ${oldStatus} to ${dbStatus}`,
    });

    await pkg.save();

    let emailSent = false;
    if (statusChanged && finalStatus.toLowerCase() === "received") {
      try {
        const user = await User.findById(pkg.userId);
        if (user?.email) {
          await sendNewPackageEmail({
            to: user.email,
            firstName: user.firstName || "Customer",
            trackingNumber: pkg.trackingNumber,
            status: dbStatus,
            weight: pkg.weight,
            shipper: pkg.shipper || pkg.senderName,
            warehouse: pkg.warehouseLocation || "KCD Main Warehouse",
            receivedDate: pkg.dateReceived || new Date(),
            description: pkg.itemDescription || pkg.description,
          });
          emailSent = true;
        }
      } catch (emailError) {
        console.error(`[KCD Update ${requestId}] Email failed:`, emailError);
      }
    }

    return NextResponse.json({
      success: true,
      tracking_number: trackingNumber,
      old_status: oldStatus,
      new_status: dbStatus,
      raw_status: finalStatus,
      updated_by: authSource,
      email_sent: emailSent,
      timestamp,
      requestId,
    });
  } catch (error) {
    console.error("[KCD Update Status] Error:", error);
    return NextResponse.json({ error: "Failed to update package status" }, { status: 500 });
  }
}
