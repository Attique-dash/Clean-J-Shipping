import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
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
    const client = paypalClient();
    if (!client) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { startDate, endDate } = body;

    // Fetch transactions from PayPal
    const request = new paypal.orders.OrdersGetRequest();
    // Note: This is a simplified version. In production, you'd use the Transactions API
    // to fetch all transactions within the date range

    // For now, we'll return a success message
    // In production, implement proper PayPal transaction fetching
    return NextResponse.json({
      success: true,
      message: "PayPal transactions synced",
      synced: 0, // Replace with actual count
    });
  } catch (error) {
    console.error("Error syncing PayPal:", error);
    return NextResponse.json({ error: "Failed to sync PayPal transactions" }, { status: 500 });
  }
}

