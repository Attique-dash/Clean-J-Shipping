import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const { packageId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const packageData = await Package.findById(packageId)
      .populate('userId', 'firstName lastName email phone userCode')
      .lean();
    
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Format package data with recipient information
    const pkg = packageData as any;
    const formattedData = {
      ...pkg,
      recipient: {
        name: pkg.receiverName || pkg.recipient?.name || (pkg.userId?.firstName && pkg.userId?.lastName ? `${pkg.userId.firstName} ${pkg.userId.lastName}` : null) || null,
        email: pkg.receiverEmail || pkg.recipient?.email || pkg.userId?.email || null,
        phone: pkg.receiverPhone || pkg.recipient?.phone || pkg.userId?.phone || null,
        address: pkg.receiverAddress || pkg.recipient?.address || null,
        country: pkg.receiverCountry || pkg.recipient?.country || null,
        city: pkg.receiverCity || pkg.recipient?.city || null,
        state: pkg.receiverState || pkg.recipient?.state || null,
        zipCode: pkg.receiverZipCode || pkg.recipient?.zipCode || null,
      },
      receiverName: pkg.receiverName || pkg.recipient?.name || (pkg.userId?.firstName && pkg.userId?.lastName ? `${pkg.userId.firstName} ${pkg.userId.lastName}` : null),
      receiverEmail: pkg.receiverEmail || pkg.recipient?.email || pkg.userId?.email || null,
      receiverPhone: pkg.receiverPhone || pkg.recipient?.phone || pkg.userId?.phone || null,
      receiverAddress: pkg.receiverAddress || pkg.recipient?.address || null,
      receiverCountry: pkg.receiverCountry || pkg.recipient?.country || null,
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json({ error: "Failed to fetch package" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const { packageId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Get existing package to preserve required fields that aren't in the form
    const existingPackage = await Package.findById(packageId);
    if (!existingPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    
    // Create update object with proper field mapping
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      // Basic fields - only update if provided
      ...(body.trackingNumber && { trackingNumber: body.trackingNumber }),
      ...(body.userCode && { userCode: body.userCode }),
      ...(body.weight && { weight: typeof body.weight === "number" ? body.weight : Number(body.weight) || existingPackage.weight }),
      ...(body.shipper && { shipper: body.shipper }),
      ...(body.description && { description: body.description }),
      ...(body.itemDescription && { itemDescription: body.itemDescription }),
      ...(body.entryDate && { entryDate: body.entryDate }),
      ...(body.status && { status: body.status }),
      ...(body.serviceMode && { serviceMode: body.serviceMode }),
      
      // Map dimensions to flat fields
      ...(body.dimensions?.length !== undefined && { length: Number(body.dimensions.length) || existingPackage.length }),
      ...(body.dimensions?.width !== undefined && { width: Number(body.dimensions.width) || existingPackage.width }),
      ...(body.dimensions?.height !== undefined && { height: Number(body.dimensions.height) || existingPackage.height }),
      ...(body.dimensions?.unit && { dimensionUnit: body.dimensions.unit }),
      
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
      
      // Additional fields
      ...(body.contents !== undefined && { contents: body.contents }),
      ...(body.value !== undefined && { value: typeof body.value === "number" ? body.value : Number(body.value) || existingPackage.value }),
      ...(body.itemValue !== undefined && { 
        value: typeof body.itemValue === "number" ? body.itemValue : Number(body.itemValue) || existingPackage.value,
        itemValue: typeof body.itemValue === "number" ? body.itemValue : Number(body.itemValue) || existingPackage.itemValue 
      }),
      ...(body.specialInstructions !== undefined && { specialInstructions: body.specialInstructions }),
      ...(body.entryStaff && { entryStaff: body.entryStaff }),
      ...(body.branch && { branch: body.branch }),
      ...(body.customsRequired !== undefined && { customsRequired: body.customsRequired }),
      ...(body.customsStatus && { customsStatus: body.customsStatus }),
    };

    // Add to history if status changed
    if (body.status && body.status !== existingPackage.status) {
      updateData.$push = {
        history: {
          status: body.status,
          at: new Date(),
          note: `Status updated by admin staff`
        }
      };
    }

    const packageData = await Package.findByIdAndUpdate(
      packageId,
      updateData,
      { new: true, runValidators: false } // Disable validators for partial updates
    );

    if (!packageData) {
      return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Package updated successfully",
      package: packageData 
    });
  } catch (error) {
    console.error("Error updating package:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}
