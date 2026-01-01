import { NextResponse } from "next/server";
import { currencyService } from "@/lib/currency-service";

export async function GET() {
  try {
    console.log("Testing currency service...");
    
    // Test if we can connect to the database
    const currencies = await currencyService.getActiveCurrencies();
    console.log("Found currencies:", currencies.length);
    
    return NextResponse.json({ 
      message: "Currency service test successful",
      currenciesFound: currencies.length,
      currencies: currencies.slice(0, 3) // Return first 3 for testing
    });
  } catch (error) {
    console.error("Currency service test failed:", error);
    return NextResponse.json(
      { 
        error: "Currency service test failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
