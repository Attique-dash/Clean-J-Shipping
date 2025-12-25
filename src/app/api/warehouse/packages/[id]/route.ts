// src/app/api/warehouse/packages/[id]/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const packageData = await Package.findById(params.id);
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(packageData);
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json({ error: "Failed to fetch package" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    
    // Create update object with proper field mapping
    const updateData: any = {
      updatedAt: new Date(),
      // Basic fields
      trackingNumber: body.trackingNumber,
      userCode: body.userCode,
      weight: typeof body.weight === "number" ? body.weight : undefined,
      shipper: body.shipper,
      description: body.description,
      status: body.status,
      // New warehouse form fields
      dimensions: body.dimensions,
      recipient: body.recipient,
      sender: body.sender,
      contents: body.contents,
      value: typeof body.value === "number" ? body.value : undefined,
      specialInstructions: body.specialInstructions,
      entryStaff: body.entryStaff,
      branch: body.branch,
      // Map to existing fields for compatibility
      itemDescription: body.description,
      itemValue: body.value,
      // Map recipient object to flat fields
      receiverName: body.recipient?.name || body.receiverName,
      receiverEmail: body.recipient?.email || body.receiverEmail,
      receiverPhone: body.recipient?.phone || body.receiverPhone,
      receiverAddress: body.recipient?.address || body.receiverAddress,
      receiverCountry: body.recipient?.country || body.receiverCountry,
      // Map sender object to flat fields
      senderName: body.sender?.name || body.senderName,
      senderEmail: body.sender?.email || body.senderEmail,
      senderPhone: body.sender?.phone || body.senderPhone,
      senderAddress: body.sender?.address || body.senderAddress,
      senderCountry: body.sender?.country || body.senderCountry,
      // Map dimensions to flat fields
      length: body.dimensions?.length ? Number(body.dimensions.length) : body.length,
      width: body.dimensions?.width ? Number(body.dimensions.width) : body.width,
      height: body.dimensions?.height ? Number(body.dimensions.height) : body.height,
      dimensionUnit: body.dimensions?.unit || body.dimensionUnit || "cm",
    };

    // Add to history if status changed
    if (body.status) {
      updateData.$push = {
        history: {
          status: body.status,
          at: new Date(),
          note: `Status updated by warehouse staff`
        }
      };
    }

    const packageData = await Package.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(packageData);
  } catch (error) {
    console.error("Error updating package:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const packageData = await Package.findByIdAndDelete(params.id);
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Package deleted successfully" });
  } catch (error) {
    console.error("Error deleting package:", error);
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
  }
}
