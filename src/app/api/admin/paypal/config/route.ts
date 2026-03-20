import { NextResponse } from "next/server";
import { getPayPalConfig, getPayPalScriptUrl, validatePayPalConfig } from "@/lib/paypal";

export async function GET() {
  try {
    const validation = validatePayPalConfig();
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: "PayPal not configured",
          details: "PayPal payment service is currently unavailable"
        }, 
        { status: 503 }
      );
    }

    const config = getPayPalConfig();
    const scriptUrl = getPayPalScriptUrl();

    return NextResponse.json({
      configured: true,
      environment: config?.environment,
      scriptUrl,
      supportedCurrencies: ["JMD", "USD", "EUR", "GBP"],
      merchantName: "Clean J Shipping",
    });
  } catch (error) {
    console.error("PayPal config error:", error);
    return NextResponse.json(
      { 
        error: "Failed to get PayPal configuration",
        details: "Payment service temporarily unavailable"
      }, 
      { status: 500 }
    );
  }
}
