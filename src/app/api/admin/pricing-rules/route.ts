// my-app/src/app/api/admin/pricing-rules/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { PricingRule } from "@/models/PricingRule";
import { z } from "zod";

const pricingRuleSchema = z.object({
  name: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  weightMin: z.number().min(0),
  weightMax: z.number().min(0),
  baseRate: z.number().min(0),
  perKgRate: z.number().min(0),
  currency: z.string().default("USD"),
  active: z.boolean().default(true),
});

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    // Get query parameters for pagination
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000", 10), 1000); // Max 1000 rules
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    
    // Only select the fields we need to reduce memory usage
    const rules = await PricingRule.find({})
      .select("name origin destination weightMin weightMax baseRate perKgRate currency active createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    // Get total count for pagination (only if needed)
    const totalCount = skip === 0 ? await PricingRule.countDocuments({}) : undefined;
    
    // Transform data efficiently
    const transformedRules = rules.map(r => ({
      id: String(r._id),
      name: r.name || "",
      origin: r.origin || "",
      destination: r.destination || "",
      weightMin: r.weightMin || 0,
      weightMax: r.weightMax || 0,
      baseRate: r.baseRate || 0,
      perKgRate: r.perKgRate || 0,
      currency: r.currency || "USD",
      active: r.active !== undefined ? r.active : true,
    }));
    
    const response: { rules: typeof transformedRules; total?: number; hasMore?: boolean } = {
      rules: transformedRules
    };
    
    if (totalCount !== undefined) {
      response.total = totalCount;
      response.hasMore = skip + limit < totalCount;
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching pricing rules:", error);
    
    // Check if it's a memory-related error
    if (error instanceof Error && (
      error.message.includes("heap") || 
      error.message.includes("memory") ||
      error.message.includes("allocation")
    )) {
      return NextResponse.json({ 
        error: "Too many pricing rules. Please use pagination with limit parameter.",
        code: "MEMORY_ERROR"
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: "Failed to fetch pricing rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const validated = pricingRuleSchema.parse(body);

    // Validate weight range
    if (validated.weightMax <= validated.weightMin) {
      return NextResponse.json(
        { error: "weightMax must be greater than weightMin" },
        { status: 400 }
      );
    }

    const rule = await PricingRule.create(validated);

    return NextResponse.json({
      id: String(rule._id),
      ...validated
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating pricing rule:", error);
    return NextResponse.json({ error: "Failed to create pricing rule" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const validated = pricingRuleSchema.partial().parse(data);

    const updated = await PricingRule.findByIdAndUpdate(
      id,
      { $set: validated },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: String(updated._id) });
  } catch (error) {
    console.error("Error updating pricing rule:", error);
    return NextResponse.json({ error: "Failed to update pricing rule" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deleted = await PricingRule.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting pricing rule:", error);
    return NextResponse.json({ error: "Failed to delete pricing rule" }, { status: 500 });
  }
}