import { NextResponse } from "next/server";
import { currencyService } from "@/lib/currency-service";
import { Currency } from "@/models/Currency";

// GET - Get all currencies with their active status
export async function GET() {
  try {
    const currencies = await Currency.find({}).sort({ code: 1 });
    return NextResponse.json({ currencies });
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}

// PUT - Update currency active status
export async function PUT(request: Request) {
  try {
    const { currencyCode, isActive } = await request.json();
    
    if (!currencyCode || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid request. currencyCode and isActive required" },
        { status: 400 }
      );
    }

    const currency = await Currency.findOne({ code: currencyCode.toUpperCase() });
    if (!currency) {
      return NextResponse.json(
        { error: "Currency not found" },
        { status: 404 }
      );
    }

    currency.isActive = isActive;
    await currency.save();

    // Clear cache to reflect changes
    const service = currencyService;
    // Access private properties through type assertion
    (service as unknown as { cache: Map<string, unknown> }).cache.clear();
    (service as unknown as { lastCacheUpdate: Date | null }).lastCacheUpdate = null;

    return NextResponse.json({ 
      message: `Currency ${currencyCode} ${isActive ? 'activated' : 'deactivated'}`,
      currency
    });
  } catch (error) {
    console.error("Error updating currency:", error);
    return NextResponse.json(
      { error: "Failed to update currency" },
      { status: 500 }
    );
  }
}

// POST - Add new currency
export async function POST(request: Request) {
  try {
    const currencyData = await request.json();
    
    const { code, name, symbol, exchangeRate, decimalPlaces = 2, format, isActive = true } = currencyData;
    
    if (!code || !name || !symbol || !format) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, symbol, format" },
        { status: 400 }
      );
    }

    const existing = await Currency.findOne({ code: code.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { error: "Currency already exists" },
        { status: 409 }
      );
    }

    const currency = await Currency.create({
      code: code.toUpperCase(),
      name,
      symbol,
      exchangeRate: exchangeRate || 1.0,
      decimalPlaces,
      format,
      isActive
    });

    // Clear cache to reflect changes
    const service = currencyService;
    // Access private properties through type assertion
    (service as unknown as { cache: Map<string, unknown> }).cache.clear();
    (service as unknown as { lastCacheUpdate: Date | null }).lastCacheUpdate = null;

    return NextResponse.json({ 
      message: "Currency added successfully",
      currency
    });
  } catch (error) {
    console.error("Error adding currency:", error);
    return NextResponse.json(
      { error: "Failed to add currency" },
      { status: 500 }
    );
  }
}
