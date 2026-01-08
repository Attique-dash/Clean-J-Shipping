import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Inventory } from "@/models/Inventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Default inventory items for warehouse
    const defaultItems = [
      {
        name: "Small Box",
        category: "boxes",
        currentStock: 100,
        minStock: 20,
        maxStock: 500,
        unit: "pieces",
        location: "Main Warehouse",
        supplier: "Packaging Supplies Co.",
        notes: "Standard small shipping boxes"
      },
      {
        name: "Medium Box", 
        category: "boxes",
        currentStock: 75,
        minStock: 15,
        maxStock: 400,
        unit: "pieces",
        location: "Main Warehouse",
        supplier: "Packaging Supplies Co.",
        notes: "Standard medium shipping boxes"
      },
      {
        name: "Large Box",
        category: "boxes", 
        currentStock: 50,
        minStock: 10,
        maxStock: 300,
        unit: "pieces",
        location: "Main Warehouse",
        supplier: "Packaging Supplies Co.",
        notes: "Standard large shipping boxes"
      },
      {
        name: "Packing Tape",
        category: "tape",
        currentStock: 200,
        minStock: 30,
        maxStock: 1000,
        unit: "meters",
        location: "Main Warehouse", 
        supplier: "Tape Industries Ltd.",
        notes: "Clear packing tape for sealing boxes"
      },
      {
        name: "Shipping Labels",
        category: "labels",
        currentStock: 500,
        minStock: 50,
        maxStock: 2000,
        unit: "pieces",
        location: "Main Warehouse",
        supplier: "Label Printers Inc.",
        notes: "Standard shipping labels"
      },
      {
        name: "Bubble Wrap",
        category: "bubble_wrap",
        currentStock: 30,
        minStock: 10,
        maxStock: 200,
        unit: "meters",
        location: "Main Warehouse",
        supplier: "Packaging Supplies Co.",
        notes: "Protective bubble wrap for fragile items"
      },
      {
        name: "Filler Paper",
        category: "other",
        currentStock: 25,
        minStock: 5,
        maxStock: 100,
        unit: "kg",
        location: "Main Warehouse",
        supplier: "Paper Suppliers Ltd.",
        notes: "Paper filler for package cushioning"
      }
    ];

    // Insert items if they don't exist
    const results = [];
    for (const item of defaultItems) {
      const existing = await Inventory.findOne({ 
        name: item.name, 
        location: item.location 
      });
      
      if (!existing) {
        const created = await Inventory.create(item);
        results.push(created);
        console.log(`Created inventory item: ${item.name}`);
      } else {
        console.log(`Inventory item already exists: ${item.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} new inventory items`,
      items: results
    });

  } catch (error) {
    console.error("Error seeding inventory:", error);
    return NextResponse.json(
      { error: "Failed to seed inventory" },
      { status: 500 }
    );
  }
}
