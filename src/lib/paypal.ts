// src/lib/paypal.ts
import * as paypal from "@paypal/checkout-server-sdk";

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: "sandbox" | "production";
}

export function getPayPalConfig(): PayPalConfig | null {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production";

  if (!clientId || !clientSecret) {
    console.error("PayPal credentials not configured");
    return null;
  }

  return {
    clientId,
    clientSecret,
    environment,
  };
}

export function createPayPalClient(): any | null {
  const config = getPayPalConfig();
  
  if (!config) {
    return null;
  }

  const environment_obj =
    config.environment === "production"
      ? new paypal.core.LiveEnvironment(config.clientId, config.clientSecret)
      : new paypal.core.SandboxEnvironment(config.clientId, config.clientSecret);

  const client = new paypal.core.PayPalHttpClient(environment_obj) as any;
  return client;
}

export function validatePayPalConfig(): { isValid: boolean; error?: string } {
  const config = getPayPalConfig();
  
  if (!config) {
    return {
      isValid: false,
      error: "PayPal credentials not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables."
    };
  }

  // Validate Client ID format (should start with specific prefixes)
  const clientIdPattern = /^(ATEU|AeUE|AdUE)/;
  if (!clientIdPattern.test(config.clientId)) {
    return {
      isValid: false,
      error: "Invalid PayPal Client ID format. Client ID should start with ATEU, AeUE, or AdUE for European accounts."
    };
  }

  // Validate Client Secret format (should be a long string)
  if (config.clientSecret.length < 20) {
    return {
      isValid: false,
      error: "Invalid PayPal Client Secret format. Client Secret should be at least 20 characters long."
    };
  }

  return { isValid: true };
}

export function getPayPalEnvironment(): string {
  const config = getPayPalConfig();
  return config?.environment || "sandbox";
}

export function getPayPalBaseUrl(): string {
  const environment = getPayPalEnvironment();
  return environment === "production" 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";
}

export function getPayPalScriptUrl(): string {
  const config = getPayPalConfig();
  const environment = getPayPalEnvironment();
  
  if (!config) {
    return "";
  }

  const baseUrl = environment === "production" 
    ? "https://www.paypal.com/sdk/js" 
    : "https://www.sandbox.paypal.com/sdk/js";
  
  return `${baseUrl}?client-id=${config.clientId}&currency=JMD&intent=capture`;
}

export interface PayPalOrderRequest {
  amount: number;
  currency?: string;
  description?: string;
  trackingNumber?: string;
  items?: Array<{
    trackingNumber: string;
    invoiceNumber?: string;
    amount: number;
    description?: string;
  }>;
}

export interface PayPalOrderResponse {
  orderId: string;
  status: string;
  approvalUrl?: string;
}

export interface PayPalCaptureResponse {
  success: boolean;
  orderId: string;
  status: string;
  amount?: {
    currency_code: string;
    value: string;
  };
  transactionId?: string;
}

export async function createPayPalOrder(
  orderRequest: PayPalOrderRequest
): Promise<PayPalOrderResponse> {
  const client = createPayPalClient();
  
  if (!client) {
    throw new Error("PayPal client not initialized");
  }

  const { amount, currency = "JMD", description = "Payment", trackingNumber, items } = orderRequest;

  if (!amount || amount <= 0) {
    throw new Error("Invalid amount");
  }

  // Create PayPal order
  const request = new (paypal as any).orders.OrdersCreateRequest();
  request.prefer("return=representation");
  
  // Build purchase units - support both single and multiple items
  const purchaseUnits: any[] = [];
  
  if (items && Array.isArray(items) && items.length > 0) {
    // Multiple items - create breakdown
    const itemList = items.map((item) => ({
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
      custom_id: items.map((i) => i.trackingNumber).join(','),
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
    const approvalUrl = (order.result as any).links?.find((link: any) => link.rel === "approve")?.href;
    
    return {
      orderId: order.result.id,
      status: order.result.status,
      approvalUrl,
    };
  } else {
    throw new Error("Failed to create PayPal order");
  }
}

export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResponse> {
  const client = createPayPalClient();
  
  if (!client) {
    throw new Error("PayPal client not initialized");
  }

  // Capture the PayPal order
  const request = new (paypal as any).orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  const capture = await client.execute(request);

  if (capture.statusCode === 201 && capture.result) {
    const captureData = capture.result;
    const captureInfo = (captureData as any).purchase_units?.[0]?.payments?.captures?.[0];
    
    return {
      success: true,
      orderId: captureData.id,
      status: captureData.status,
      amount: captureInfo?.amount,
      transactionId: captureInfo?.id,
    };
  } else {
    throw new Error("Failed to capture PayPal order");
  }
}

export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string,
  webhookId?: string
): Promise<boolean> {
  // Implementation for webhook verification
  // This would require the webhook ID from PayPal
  try {
    const paypalClient = createPayPalClient();
    if (!paypalClient || !webhookId) {
      return false;
    }

    // Note: Full webhook verification implementation would go here
    // For now, we'll do basic validation
    const authAlgo = headers["paypal-auth-algo"];
    const transmissionId = headers["paypal-transmission-id"];
    const certId = headers["paypal-cert-id"];
    const transmissionSig = headers["paypal-transmission-sig"];
    const transmissionTime = headers["paypal-transmission-time"];

    if (!authAlgo || !transmissionId || !certId || !transmissionSig || !transmissionTime) {
      return false;
    }

    // Basic validation - in production, you'd verify the signature
    return true;
  } catch (error) {
    console.error("Webhook verification error:", error);
    return false;
  }
}
