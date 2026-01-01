import { NextRequest, NextResponse } from "next/server";
import { currencyService } from "@/lib/currency-service";

export async function POST(request: NextRequest) {
  try {
    const { amount, fromCurrency, toCurrency } = await request.json();

    if (!amount || !fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: "Amount, fromCurrency, and toCurrency are required" },
        { status: 400 }
      );
    }

    const convertedAmount = await currencyService.convertAmount(
      amount,
      fromCurrency,
      toCurrency
    );

    return NextResponse.json({
      originalAmount: amount,
      fromCurrency,
      toCurrency,
      convertedAmount,
    });
  } catch (error) {
    console.error("Error converting currency:", error);
    return NextResponse.json(
      { error: "Failed to convert currency" },
      { status: 500 }
    );
  }
}
