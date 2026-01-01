import { NextResponse } from "next/server";
import { currencyService } from "@/lib/currency-service";

export async function POST() {
  try {
    // Initialize default currencies
    await currencyService.initializeDefaultCurrencies();
    
    // Update exchange rates
    await currencyService.updateExchangeRates();
    
    return NextResponse.json({ 
      message: "Currency system initialized successfully",
      currencies: await currencyService.getActiveCurrencies()
    });
  } catch (error) {
    console.error("Error initializing currency system:", error);
    return NextResponse.json(
      { error: "Failed to initialize currency system" },
      { status: 500 }
    );
  }
}
