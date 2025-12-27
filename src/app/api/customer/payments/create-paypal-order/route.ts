import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import * as paypal from "@paypal/checkout-server-sdk";

function paypalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";

  if (!clientId || !clientSecret) {
    return null;
  }

  const environment_obj =
    environment === "production"
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

  return new paypal.core.PayPalHttpClient(environment_obj);
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { amount, currency = "JMD", description = "Payment", trackingNumber, items } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const client = paypalClient();
    if (!client) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
    }

    // Create PayPal order
    const request = new (paypal as any).orders.OrdersCreateRequest();
    request.prefer("return=representation");
    
    // Build purchase units - support both single and multiple items
    const purchaseUnits: any[] = [];
    
    if (items && Array.isArray(items) && items.length > 0) {
      // Multiple items - create breakdown
      const itemList = items.map((item: any) => ({
        name: item.invoiceNumber ? `Invoice #${item.invoiceNumber}` : `Package ${item.trackingNumber}`,
        description: `Tracking: ${item.trackingNumber}`,
        quantity: "1",
        unit_amount: {
          currency_code: currency,
          value: (item.amount || 0).toFixed(2),
        },
      }));
      
      purchaseUnits.push({
        description: description || `Payment for ${items.length} invoice${items.length !== 1 ? 's' : ''}`,
        custom_id: items.map((i: any) => i.trackingNumber).join(','),
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
          },
        },
        items: itemList,
      });
    } else {
      // Single item (backward compatibility)
      purchaseUnits.push({
        description: description,
        custom_id: trackingNumber || `INV-${Date.now()}`,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      });
    }
    
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: purchaseUnits,
      application_context: {
        brand_name: "Clean J Shipping",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/customer/bills?paypal=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/customer/bills?paypal=cancelled`,
      },
    });

    const order = await client.execute(request);

    if (order.statusCode === 201 && order.result) {
      return NextResponse.json({
        orderId: order.result.id,
        status: order.result.status,
      });
    } else {
      throw new Error("Failed to create PayPal order");
    }
  } catch (error) {
    console.error("PayPal order creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create PayPal order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

