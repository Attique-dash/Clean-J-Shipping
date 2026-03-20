import { NextResponse } from "next/server";
import { CurrencyService } from "@/lib/currency-service";

export async function POST() {
  try {
    // Initialize default currencies - for now just return available currencies
    const currencies = CurrencyService.getAllCurrencies();
    
    return NextResponse.json({ 
      message: "Currency system initialized successfully",
      currencies: currencies
    });
  } catch (error) {
    console.error("Error initializing currency system:", error);
    return NextResponse.json(
      { error: "Failed to initialize currency system" },
      { status: 500 }
    );
  }
}
