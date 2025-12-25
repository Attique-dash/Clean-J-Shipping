import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Inventory } from "@/models/Inventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
    const skip = parseInt(url.searchParams.get("skip") || "0");

    const items = await Inventory.find()
      .sort({ name: 1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, category, currentStock, minStock, maxStock, unit, location, supplier, notes } = body;

    if (!name || !category || typeof currentStock !== "number") {
      return NextResponse.json(
        { error: "Name, category, and currentStock are required" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(
      { success: true, item },
      { status: 201 }
    );
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create inventory item" },
      { status: 500 }
    );
  }
}

