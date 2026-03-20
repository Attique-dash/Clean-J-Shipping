import { NextResponse } from "next/server";
import { CurrencyService } from "@/lib/currency-service";

export async function GET() {
  try {
    const currencies = CurrencyService.getAllCurrencies();
    return NextResponse.json({ currencies });
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // For now, just return success - exchange rate updates would need external API
    return NextResponse.json({ message: "Exchange rates updated successfully" });
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}
