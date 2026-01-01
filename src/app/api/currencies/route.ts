import { NextResponse } from "next/server";
import { currencyService } from "@/lib/currency-service";

export async function GET() {
  try {
    const currencies = await currencyService.getActiveCurrencies();
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
    await currencyService.updateExchangeRates();
    return NextResponse.json({ message: "Exchange rates updated successfully" });
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}
