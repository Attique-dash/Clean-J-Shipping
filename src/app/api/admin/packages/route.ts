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
      customer_name: (p.userId as { name?: string; email: string })?.name || 'Unknown',
      customer_id: p.userId,
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

    const { tracking_number, user_id, user_code, weight, description, branch } = body;

    if (!tracking_number || (!user_id && !user_code)) {
      return NextResponse.json(
        { error: "tracking_number and either user_id or user_code are required" }, 
        { status: 400 }
      );
    }

    let user;
    if (user_id) {
      user = await User.findById(user_id);
    } else if (user_code) {
      user = await User.findOne({ userCode: user_code });
    }
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Package.findOne({ trackingNumber: tracking_number });
    if (existing) {
      return NextResponse.json(
        { error: "Tracking number already exists" }, 
        { status: 409 }
      );
    }

    const created = await Package.create({
      trackingNumber: tracking_number,
      userId: user._id,
      weight: weight || 0,
      itemDescription: description || "Package description",
      status: "pending",
      // Use customer info as receiver since admin is creating the package
      senderName: user.name || "Shipper",
      senderPhone: user.phone || "0000000000",
      senderAddress: user.address?.street || "Shipper Address",
      senderCity: user.address?.city || "Shipper City", 
      senderState: user.address?.state || "Shipper State",
      senderZipCode: user.address?.zipCode || "00000",
      receiverName: user.name || "Receiver",
      receiverPhone: user.phone || "0000000000",
      receiverAddress: user.address?.street || "Receiver Address",
      receiverCity: user.address?.city || "Receiver City",
      receiverState: user.address?.state || "Receiver State",
      receiverZipCode: user.address?.zipCode || "00000",
      packageType: "parcel",
      serviceType: "standard",
      deliveryType: "door_to_door",
      shippingCost: 0,
      totalAmount: 0,
      paymentMethod: "cash",
      currentLocation: branch || "Main Warehouse",
    });

    return NextResponse.json({ 
      ok: true, 
      id: created._id, 
      tracking_number: created.trackingNumber 
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
