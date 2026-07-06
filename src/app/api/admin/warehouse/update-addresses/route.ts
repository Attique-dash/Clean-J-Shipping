import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const payload = await getAuthFromRequest(req);
    
    // Only allow admin to update warehouse addresses
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
    }

    const body = await req.json();
    const { airAddress, seaAddress, chinaAddress, address, city, state, zipCode } = body;

    // Validate required fields
    if (!airAddress || !seaAddress || !chinaAddress) {
      return NextResponse.json({ 
        error: "Missing required fields: airAddress, seaAddress, chinaAddress" 
      }, { status: 400 });
    }

    const { Warehouse } = await import('@/models/Warehouse');
    
    // Find or create default warehouse
    let warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });
    
    if (!warehouse) {
      // Create new warehouse
      warehouse = await Warehouse.create({
        code: 'CJS',
        name: 'Clean J Shipping Main Warehouse',
        address: address || '700 NW 57 Place',
        city: city || 'Ft. Lauderdale',
        state: state || 'Florida',
        zipCode: zipCode || '33309',
        country: 'USA',
        phone: '(876) 578-5945',
        email: 'info@cleanjshipping.com',
        isActive: true,
        isDefault: true,
        airAddress,
        seaAddress,
        chinaAddress,
      });
    } else {
      // Update existing warehouse
      warehouse.airAddress = airAddress;
      warehouse.seaAddress = seaAddress;
      warehouse.chinaAddress = chinaAddress;
      if (address) warehouse.address = address;
      if (city) warehouse.city = city;
      if (state) warehouse.state = state;
      if (zipCode) warehouse.zipCode = zipCode;
      await warehouse.save();
    }

    return NextResponse.json({
      success: true,
      message: "Warehouse addresses updated successfully",
      warehouse: {
        name: warehouse.name,
        airAddress: warehouse.airAddress,
        seaAddress: warehouse.seaAddress,
        chinaAddress: warehouse.chinaAddress,
      }
    });
  } catch (error) {
    console.error("Update warehouse addresses error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update warehouse addresses" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const payload = await getAuthFromRequest(req);
    
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
    }

    const { Warehouse } = await import('@/models/Warehouse');
    const warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });

    if (!warehouse) {
      return NextResponse.json({ error: "No default warehouse found" }, { status: 404 });
    }

    return NextResponse.json({
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      zipCode: warehouse.zipCode,
      airAddress: warehouse.airAddress,
      seaAddress: warehouse.seaAddress,
      chinaAddress: warehouse.chinaAddress,
    });
  } catch (error) {
    console.error("Get warehouse addresses error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch warehouse addresses" },
      { status: 500 }
    );
  }
}
