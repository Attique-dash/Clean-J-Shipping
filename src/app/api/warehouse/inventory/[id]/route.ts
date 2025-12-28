import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Inventory } from "@/models/Inventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, category, currentStock, minStock, maxStock, unit, location, supplier, notes } = body;

    const item = await Inventory.findByIdAndUpdate(
      id,
      {
        name,
        category,
        currentStock,
        minStock,
        maxStock,
        unit,
        location,
        supplier,
        notes,
        lastRestocked: new Date(),
      },
      { new: true }
    );

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Inventory PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const item = await Inventory.findByIdAndDelete(id);

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Inventory item deleted" });
  } catch (error) {
    console.error("Inventory DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}

