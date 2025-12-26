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
    
    // Get existing package to preserve required fields that aren't in the form
    const existingPackage = await Package.findById(params.id);
    if (!existingPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    
    // Create update object with proper field mapping
    const updateData: any = {
      updatedAt: new Date(),
      // Basic fields - only update if provided
      ...(body.trackingNumber && { trackingNumber: body.trackingNumber }),
      ...(body.userCode && { userCode: body.userCode }),
      ...(body.weight !== undefined && { weight: typeof body.weight === "number" ? body.weight : Number(body.weight) || existingPackage.weight }),
      ...(body.shipper !== undefined && { shipper: body.shipper }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status && { status: body.status }),
      ...(body.entryDate && { entryDate: new Date(body.entryDate) }),
      
      // New warehouse form fields
      ...(body.dimensions && { dimensions: body.dimensions }),
      ...(body.recipient && { recipient: body.recipient }),
      ...(body.sender && { sender: body.sender }),
      ...(body.contents !== undefined && { contents: body.contents }),
      ...(body.value !== undefined && { value: typeof body.value === "number" ? body.value : Number(body.value) || existingPackage.value }),
      ...(body.specialInstructions !== undefined && { specialInstructions: body.specialInstructions }),
      ...(body.entryStaff !== undefined && { entryStaff: body.entryStaff }),
      ...(body.branch !== undefined && { branch: body.branch }),
      
      // Map to existing fields for compatibility
      ...(body.itemDescription !== undefined && { itemDescription: body.itemDescription }),
      ...(body.value !== undefined && { itemValue: body.value }),
      
      // Map recipient object to flat fields
      ...(body.recipient?.name && { receiverName: body.recipient.name }),
      ...(body.recipient?.email && { receiverEmail: body.recipient.email }),
      ...(body.recipient?.phone && { receiverPhone: body.recipient.phone }),
      ...(body.recipient?.address && { receiverAddress: body.recipient.address }),
      ...(body.recipient?.country && { receiverCountry: body.recipient.country }),
      
      // Map sender object to flat fields
      ...(body.sender?.name && { senderName: body.sender.name }),
      ...(body.sender?.email && { senderEmail: body.sender.email }),
      ...(body.sender?.phone && { senderPhone: body.sender.phone }),
      ...(body.sender?.address && { senderAddress: body.sender.address }),
      ...(body.sender?.country && { senderCountry: body.sender.country }),
      
      // Map dimensions to flat fields
      ...(body.dimensions?.length !== undefined && { length: Number(body.dimensions.length) || existingPackage.length }),
      ...(body.dimensions?.width !== undefined && { width: Number(body.dimensions.width) || existingPackage.width }),
      ...(body.dimensions?.height !== undefined && { height: Number(body.dimensions.height) || existingPackage.height }),
      ...(body.dimensions?.unit && { dimensionUnit: body.dimensions.unit }),
    };

    // Add to history if status changed
    if (body.status && body.status !== existingPackage.status) {
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
      { new: true, runValidators: false } // Disable validators for partial updates
    );

    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(packageData);
  } catch (error) {
    console.error("Error updating package:", error);
    
    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ 
        error: "Validation failed: " + validationErrors.join(", "),
        details: validationErrors 
      }, { status: 400 });
    }
    
    if (error.name === 'CastError') {
      return NextResponse.json({ 
        error: "Invalid data format provided",
        details: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Failed to update package. Please check your data and try again.",
      details: error.message 
    }, { status: 500 });
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
