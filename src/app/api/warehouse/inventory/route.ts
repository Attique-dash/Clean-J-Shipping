import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Inventory } from "@/models/Inventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    console.log("📦 Inventory API request received");
    
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse'].includes(session.user.role)) {
      console.error("❌ Unauthorized access to inventory:", session?.user?.role);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Auth verified for inventory, connecting to database...");
    
    // Add timeout to database connection
    const connectionPromise = dbConnect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 15000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    console.log("✅ Database connected for inventory");

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
    const skip = parseInt(url.searchParams.get("skip") || "0");

    console.log(`📊 Fetching inventory items: limit=${limit}, skip=${skip}`);

    // Add timeout to database query
    const queryPromise = Inventory.find()
      .sort({ name: 1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    const queryTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 20000)
    );

    const items = await Promise.race([queryPromise, queryTimeoutPromise]) as any[];
    
    console.log(`✅ Successfully fetched ${items.length} inventory items`);
    return NextResponse.json({ items });
    
  } catch (error: any) {
    console.error("❌ Inventory GET error:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorMessage = "Failed to fetch inventory";
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = "Database connection timeout. Please try again later.";
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes('MongoServerSelectionError')) {
      errorMessage = "Database unavailable. Please check your connection.";
      statusCode = 503;
    } else if (error.message.includes('MongoNetworkError')) {
      errorMessage = "Network error connecting to database.";
      statusCode = 503;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.name
      },
      { status: statusCode }
    );
  }
}

export async function POST(req: Request) {
  try {
    console.log("📦 Inventory POST request received");
    
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse'].includes(session.user.role)) {
      console.error("❌ Unauthorized access to inventory POST:", session?.user?.role);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Auth verified for inventory POST, connecting to database...");
    
    // Add timeout to database connection
    const connectionPromise = dbConnect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 15000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
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

    // Add timeout to database query
    const createPromise = Inventory.create({
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
    
    const createTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database create timeout')), 20000)
    );

    const item = await Promise.race([createPromise, createTimeoutPromise]) as any;
    
    console.log(`✅ Successfully created inventory item: ${item._id}`);
    return NextResponse.json(
      { success: true, item },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error("❌ Inventory POST error:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorMessage = "Failed to create inventory item";
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = "Database connection timeout. Please try again later.";
      statusCode = 503;
    } else if (error.message.includes('MongoServerSelectionError')) {
      errorMessage = "Database unavailable. Please check your connection.";
      statusCode = 503;
    } else if (error.message.includes('MongoNetworkError')) {
      errorMessage = "Network error connecting to database.";
      statusCode = 503;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.name
      },
      { status: statusCode }
    );
  }
}

