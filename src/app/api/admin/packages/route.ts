import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const per_page = Math.min(Math.max(parseInt(url.searchParams.get("per_page") || "20", 10), 1), 100);

    // Build query filter
    const filter: Record<string, unknown> = {};
    
    if (q) {
      filter.$or = [
        { trackingNumber: { $regex: q, $options: 'i' } },
        { referenceNumber: { $regex: q, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const [packages, total_count, status_counts] = await Promise.all([
      Package.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * per_page)
        .limit(per_page),
      Package.countDocuments(filter),
      Package.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const statusCountsMap = status_counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    const formattedPackages = packages.map(p => ({
      id: p._id,
      tracking_number: p.trackingNumber,
      customer_name: (p.userId as unknown as { name?: string; email: string; shippingId?: string })?.name || 'Unknown',
      customer_id: p.userId,
      user_code: (p.userId as unknown as { shippingId?: string })?.shippingId || '',
      status: p.status,
      current_location: p.currentLocation || undefined,
      branch: p.currentLocation || undefined,
      weight: p.weight,
      dimensions: p.length && p.width && p.height 
        ? `${p.length}×${p.width}×${p.height} cm` 
        : undefined,
      description: p.itemDescription || undefined,
      received_date: p.createdAt?.toISOString(),
      created_at: p.createdAt?.toISOString(),
      updated_at: p.updatedAt?.toISOString(),
    }));

    return NextResponse.json({ 
      packages: formattedPackages, 
      total_count,
      status_counts: statusCountsMap,
      page, 
      per_page 
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { 
      trackingNumber, 
      userCode, 
      weight, 
      shipper,
      description, 
      entryDate,
      status,
      dimensions,
      recipient,
      sender,
      contents,
      value,
      specialInstructions,
      branch
    } = body;

    if (!trackingNumber || !userCode) {
      return NextResponse.json(
        { error: "trackingNumber and userCode are required" }, 
        { status: 400 }
      );
    }

    // Find user by userCode
    const user = await User.findOne({ shippingId: userCode });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Package.findOne({ trackingNumber: trackingNumber });
    if (existing) {
      return NextResponse.json(
        { error: "Tracking number already exists" }, 
        { status: 409 }
      );
    }

    // Create package with extended information
    const packageData: Record<string, unknown> = {
      trackingNumber: trackingNumber,
      userId: user._id,
      userCode: userCode,
      weight: weight || 0,
      shipper: shipper || "Unknown Shipper",
      description: description || "Package description",
      entryDate: entryDate || new Date(),
      status: status || "received",
      dimensions: dimensions || {
        length: 0,
        width: 0,
        height: 0,
        unit: "cm"
      },
      recipient: {
        name: recipient?.name || user.name,
        email: recipient?.email || user.email,
        shippingId: recipient?.shippingId || user.shippingId,
        phone: recipient?.phone || user.phone,
        address: recipient?.address || user.address?.street,
        country: recipient?.country || user.address?.country
      },
      sender: sender || {
        name: "Warehouse",
        email: "warehouse@shipping.com",
        phone: "0000000000",
        address: branch || "Main Warehouse",
        country: "Jamaica"
      },
      contents: contents || "",
      value: value || 0,
      specialInstructions: specialInstructions || "",
      branch: branch || "Main Warehouse",
      // Legacy fields for compatibility
      itemDescription: description || "Package description",
      itemValue: value || 0,
      senderName: sender?.name || "Warehouse",
      senderPhone: sender?.phone || "0000000000",
      senderAddress: sender?.address || branch || "Main Warehouse",
      receiverName: recipient?.name || user.name,
      receiverPhone: recipient?.phone || user.phone,
      receiverAddress: recipient?.address || user.address?.street,
      receiverEmail: recipient?.email || user.email,
      currentLocation: branch || "Main Warehouse",
      packageType: "parcel",
      serviceType: "standard",
      deliveryType: "door_to_door",
      shippingCost: 0,
      totalAmount: 0,
      paymentMethod: "cash",
      receivedAt: new Date()
    };

    const created = await Package.create(packageData);

    return NextResponse.json({ 
      ok: true, 
      id: created._id, 
      trackingNumber: created.trackingNumber,
      userCode: created.userCode,
      package: created
    });
  } catch (error) {
    console.error("Error creating package:", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { id, status, weight, description, branch, length, width, height } = body;

    if (!id) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
    }

    // Get current package to track changes
    const currentPackage = await Package.findById(id);

    if (!currentPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const changedFields: string[] = [];

    if (status !== undefined && status !== currentPackage.status) {
      updateData.status = status;
      changedFields.push('status');
    }
    if (weight !== undefined && weight !== currentPackage.weight) {
      updateData.weight = weight;
      changedFields.push('weight');
    }
    if (description !== undefined && description !== currentPackage.itemDescription) {
      updateData.itemDescription = description;
      changedFields.push('description');
    }
    if (branch !== undefined && branch !== currentPackage.currentLocation) {
      updateData.currentLocation = branch;
      changedFields.push('branch');
    }
    if (length !== undefined) {
      updateData.length = length;
      changedFields.push('length');
    }
    if (width !== undefined && width !== currentPackage.width) {
      updateData.width = width;
      changedFields.push('width');
    }
    if (height !== undefined && height !== currentPackage.height) {
      updateData.height = height;
      changedFields.push('height');
    }

    if (changedFields.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        id: currentPackage._id, 
        tracking_number: currentPackage.trackingNumber,
        message: "No changes detected"
      });
    }

    const updated = await Package.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      ok: true, 
      id: updated._id, 
      tracking_number: updated.trackingNumber 
    });
  } catch (error) {
    console.error("Error updating package:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
    }

    // Soft delete by setting status to "returned" (marked as deleted)
    const updated = await Package.findByIdAndUpdate(
      id, 
      { 
        status: "returned",
        statusReason: "Deleted by admin",
        updatedAt: new Date()
      }, 
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      ok: true, 
      id: updated._id, 
      message: "Package deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting package:", error);
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
  }
}
