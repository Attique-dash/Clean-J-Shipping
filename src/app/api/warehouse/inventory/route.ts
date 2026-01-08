import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Inventory } from "@/models/Inventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    console.log("📦 Inventory API request received");
    
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse', 'warehouse_staff'].includes(session.user.role)) {
      console.error("❌ Unauthorized access to inventory:", session?.user?.role);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Auth verified for inventory, connecting to database...");
    
    await dbConnect();
    console.log("✅ Database connected for inventory");

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
    const skip = parseInt(url.searchParams.get("skip") || "0");
    const location = url.searchParams.get('location');
    const category = url.searchParams.get('category');
    const lowStock = url.searchParams.get('lowStock');

    console.log(`📊 Fetching inventory items: limit=${limit}, skip=${skip}`);

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
      .limit(limit)
      .skip(skip)
      .lean();
    
    console.log(`✅ Successfully fetched ${items.length} inventory items`);
    
    // Add stock status to each item
    const itemsWithStatus = items.map((item: any) => ({
      ...item,
      stockStatus: item.currentStock === 0 ? 'out_of_stock' :
                   item.currentStock <= (item.minStock || 0) ? 'low_stock' : 'in_stock'
    }));
    
    return NextResponse.json({ 
      items: itemsWithStatus,
      total: items.length
    });
    
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

