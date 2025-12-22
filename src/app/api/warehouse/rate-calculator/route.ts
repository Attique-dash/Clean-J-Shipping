// API endpoint for warehouse to access rate calculator data
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { isWarehouseAuthorized } from "@/lib/rbac";
import { PricingRule } from "@/models/PricingRule";

export async function GET(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const url = new URL(req.url);
    const origin = url.searchParams.get("origin");
    const destination = url.searchParams.get("destination");
    const weight = url.searchParams.get("weight");

    // Build filter
    const filter: any = { active: true };
    if (origin) {
      filter.origin = new RegExp(origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
    if (destination) {
      filter.destination = new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    // Get matching rules
    const rules = await PricingRule.find(filter)
      .select("name origin destination weightMin weightMax baseRate perKgRate currency active")
      .sort({ createdAt: -1 })
      .lean();

    // If weight is provided, calculate rate
    if (weight && rules.length > 0) {
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum)) {
        // Find matching rule based on weight range
        const matchingRule = rules.find(
          (r) =>
            weightNum >= (r.weightMin || 0) &&
            weightNum <= (r.weightMax || Infinity)
        );

        if (matchingRule) {
          const baseRate = matchingRule.baseRate || 0;
          const perKgRate = matchingRule.perKgRate || 0;
          const calculatedRate = baseRate + weightNum * perKgRate;

          return NextResponse.json({
            rate: calculatedRate,
            currency: matchingRule.currency || "USD",
            rule: {
              name: matchingRule.name,
              origin: matchingRule.origin,
              destination: matchingRule.destination,
              baseRate: matchingRule.baseRate,
              perKgRate: matchingRule.perKgRate,
            },
            calculation: {
              baseRate,
              weight: weightNum,
              perKgRate,
              total: calculatedRate,
            },
          });
        }
      }
    }

    // Return available rules
    return NextResponse.json({
      rules: rules.map((r) => ({
        id: String(r._id),
        name: r.name,
        origin: r.origin,
        destination: r.destination,
        weightMin: r.weightMin,
        weightMax: r.weightMax,
        baseRate: r.baseRate,
        perKgRate: r.perKgRate,
        currency: r.currency || "USD",
      })),
    });
  } catch (error) {
    console.error("Error fetching rates:", error);
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}

