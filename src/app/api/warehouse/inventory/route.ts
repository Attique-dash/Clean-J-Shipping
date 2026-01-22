import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Inventory } from "@/models/Inventory";
import { ApiKey, hashApiKey } from "@/models/ApiKey";
import { rateLimit } from "@/lib/rateLimit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    console.log("📦 Inventory API request received");
    
    const url = new URL(req.url);
    const token = url.searchParams.get("id") || "";

    if (!token || (!token.startsWith("wh_live_") && !token.startsWith("wh_test_"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Special handling for test key
    let keyRecord;
    if (token === "wh_test_abc123") {
      // Look up the test key by its prefix
      keyRecord = await ApiKey.findOne({
        keyPrefix: "wh_test_abc123",
        active: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      }).select("keyPrefix permissions");
    } else {
      // Verify API key via hash lookup and active/expiry, require inventory:read permission
      const hashed = hashApiKey(token);
      keyRecord = await ApiKey.findOne({
        key: hashed,
        active: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      }).select("keyPrefix permissions");
    }
    if (!keyRecord || !keyRecord.permissions.includes("inventory:read")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-key rate limit: 200 req/min
    const limit = 200;
    const rl = rateLimit(keyRecord.keyPrefix, { windowMs: 60 * 1000, maxRequests: limit });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rl.retryAfter,
          resetAt: new Date(rl.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.resetAt),
            "Retry-After": String(rl.retryAfter ?? 60),
          },
        }
      );
    }

    console.log("✅ Auth verified for inventory, fetching data...");

    const requestUrl = new URL(req.url);
    const queryLimit = Math.min(parseInt(requestUrl.searchParams.get("limit") || "100"), 1000);
    const skip = parseInt(requestUrl.searchParams.get("skip") || "0");
    const location = requestUrl.searchParams.get('location');
    const category = requestUrl.searchParams.get('category');
    const lowStock = requestUrl.searchParams.get('lowStock');

    console.log(`📊 Fetching inventory items: limit=${queryLimit}, skip=${skip}`);

    // Build query
    const query: Record<string, string | number | { $lte: number }> = {};
    if (location) query.location = location;
    if (category) query.category = category;
    if (lowStock === 'true') {
      query.currentStock = { $lte: 0 };
    }

    // Simple query without complex operations
    const items = await Inventory.find(query)
      .sort({ category: 1, name: 1 })
      .limit(queryLimit)
      .skip(skip)
      .lean();
    
    console.log(`✅ Successfully fetched ${items.length} inventory items`);
    
    // Add stock status to each item
    const itemsWithStatus = items.map((item: any) => ({
      ...item,
      stockStatus: item.currentStock === 0 ? 'out_of_stock' :
                   item.currentStock <= (item.minStock || 0) ? 'low_stock' : 'in_stock'
    }));
    
    const res = NextResponse.json({ 
      items: itemsWithStatus,
      total: items.length
    });
    res.headers.set("X-RateLimit-Limit", String(limit));
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    res.headers.set("X-RateLimit-Reset", String(rl.resetAt));
    return res;
    
  } catch (error: unknown) {
    console.error("❌ Inventory GET error:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : String(error)
    });
    
    return NextResponse.json(
      { 
        error: "Failed to fetch inventory",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    console.log("📦 Inventory POST request received");
    
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse', 'warehouse_staff'].includes(session.user.role)) {
      console.error("❌ Unauthorized access to inventory POST:", session?.user?.role);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Auth verified for inventory POST, connecting to database...");
    
    await dbConnect();
    console.log("✅ Database connected for inventory POST");

    const body = await req.json();
    const { name, category, currentStock, minStock, maxStock, unit, location, supplier, notes } = body;

    if (!name || !category || typeof currentStock !== "number") {
      return NextResponse.json(
        { error: "Name, category, and currentStock are required" },
        { status: 400 }
      );
    }

    console.log(`📊 Creating inventory item: ${name}`);

    const item = await Inventory.create({
      name,
      category,
      currentStock,
      minStock: minStock || 0,
      maxStock: maxStock || 1000,
      unit: unit || "pieces",
      location,
      supplier,
      notes,
    });
    
    console.log(`✅ Successfully created inventory item: ${item._id}`);
    return NextResponse.json(
      { success: true, item },
      { status: 201 }
    );
    
  } catch (error: unknown) {
    console.error("❌ Inventory POST error:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : String(error)
    });
    
    return NextResponse.json(
      { 
        error: "Failed to create inventory item",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

