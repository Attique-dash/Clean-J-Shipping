// src/app/api/warehouse/packages/[id]/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function calcShippingCostJmd(weightLbs: number): number {
  if (weightLbs <= 0) return 0;
  const first = 700;
  const additional = Math.max(0, Math.ceil(weightLbs) - 1) * 350;
  return first + additional;
}

function calculateTotalAmount(itemValue: number, weight: number): number {
  // Convert item value from USD to JMD (assuming 1 USD = 155 JMD)
  const itemValueJmd = itemValue * 155;
  
  // Calculate shipping cost based on weight (convert to lbs first)
  const weightLbs = weight * 2.20462;
  const shippingCostJmd = calcShippingCostJmd(weightLbs);
  
  // Calculate customs duty (15% of item value if > $100 USD)
  const customsDutyJmd = itemValue > 100 ? itemValueJmd * 0.15 : 0;
  
  // Total: shipping + customs (item value is for customs only, not charged to customer)
  return shippingCostJmd + customsDutyJmd;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const packageData = await Package.findById(id);
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(packageData);
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json({ error: "Failed to fetch package" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    
    // Get existing package to preserve required fields that aren't in the form
    const existingPackage = await Package.findById(id);
    if (!existingPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    
    // Calculate shipping costs if weight or value provided
    const itemValueNum = asNumber(body.value !== undefined ? body.value : existingPackage.value);
    const weightNum = asNumber(body.weight !== undefined ? body.weight : existingPackage.weight);
    const shippingCost = calculateTotalAmount(itemValueNum, weightNum);
    
    // Create update object with proper field mapping
    const updateData: any = {
      updatedAt: new Date(),
      // Add calculated costs like admin
      shippingCost: shippingCost,
      totalAmount: shippingCost,
      paymentMethod: "cash",
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
      id,
      updateData,
      { new: true, runValidators: false } // Disable validators for partial updates
    );

    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(packageData);
  } catch (error) {
    const err = error as any;
    console.error("Error updating package:", err);
    
    // Provide more specific error messages
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors || {}).map((e: any) => e.message);
      return NextResponse.json({ 
        error: "Validation failed: " + validationErrors.join(", "),
        details: validationErrors 
      }, { status: 400 });
    }
    
    if (err.name === 'CastError') {
      return NextResponse.json({ 
        error: "Invalid data format provided",
        details: err.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Failed to update package. Please check your data and try again.",
      details: err.message 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const packageData = await Package.findByIdAndDelete(id);
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Package deleted successfully" });
  } catch (error) {
    console.error("Error deleting package:", error);
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
  }
}
