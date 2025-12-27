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
    const userCode = (url.searchParams.get("userCode") || "").trim();
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const per_page = Math.min(Math.max(parseInt(url.searchParams.get("per_page") || "20", 10), 1), 100);

    // Build query filter
    const filter: Record<string, unknown> = {};
    
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { trackingNumber: regex },
        { description: regex },
        { shipper: regex },
        { controlNumber: regex },
        { manifestId: regex }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (userCode) {
      // Find user by userCode and get their packages
      const user = (await User.findOne({ userCode: userCode }).select('_id').lean()) as unknown as { _id?: unknown } | null;
      if (user?._id) {
        filter.userId = user._id;
      } else {
        // If no user found with this userCode, return empty results
        return NextResponse.json({
          packages: [],
          total_count: 0,
          status_counts: {},
          page, 
          per_page 
        });
      }
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

    // Get user information for all packages to include shippingId (userCode) in response
    const userIds = packages
      .map((p: any) => p?.userId?._id || p?.userId)
      .filter(Boolean);
    const userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const users = (await User.find({ _id: { $in: userIds } }).select('_id shippingId').lean()) as unknown as Array<{ _id?: unknown; shippingId?: string }>;
      users.forEach((user) => {
        userMap.set(String(user._id), user.shippingId || '');
      });
    }

    // Add userCode to each package
    const packagesWithUserCode = packages.map((p: any) => ({
      _id: p._id,
      trackingNumber: p.trackingNumber,
      userCode: userMap.get(String(p?.userId?._id || p?.userId)) || '',
      status: p.status,
      weight: p.weight,
      shipper: p.shipper,
      description: p.description,
      dimensions: p.length && p.width && p.height 
        ? `${p.length}×${p.width}×${p.height} cm` 
        : undefined,
      itemDescription: p.itemDescription,
      createdAt: p.createdAt ? (p.createdAt instanceof Date ? p.createdAt.toISOString() : new Date(p.createdAt).toISOString()) : undefined,
      updatedAt: p.updatedAt ? (p.updatedAt instanceof Date ? p.updatedAt.toISOString() : new Date(p.updatedAt).toISOString()) : undefined,
      // Include additional fields for frontend compatibility
      length: p.length,
      width: p.width,
      height: p.height,
      dimensionUnit: p.dimensionUnit,
      receiverName: p.receiverName,
      receiverEmail: p.receiverEmail,
      receiverPhone: p.receiverPhone,
      receiverAddress: p.receiverAddress,
      receiverCountry: p.receiverCountry,
      senderName: p.senderName,
      senderEmail: p.senderEmail,
      senderPhone: p.senderPhone,
      senderAddress: p.senderAddress,
      senderCountry: p.senderCountry,
    }));

    return NextResponse.json({ 
      packages: packagesWithUserCode, 
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
        name: (recipient as any)?.name || (user as any).name || "",
        email: (recipient as any)?.email || (user as any).email,
        shippingId: (recipient as any)?.shippingId || (user as any).userCode,
        phone: (recipient as any)?.phone || (user as any).phone || "",
        address: (recipient as any)?.address || (user as any).address?.street || "",
        country: (recipient as any)?.country || (user as any).address?.country || "Jamaica",
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
      senderName: (sender as any)?.name || "Warehouse",
      senderPhone: (sender as any)?.phone || "0000000000",
      senderAddress: (sender as any)?.address || branch || "Main Warehouse",
      receiverName: (recipient as any)?.name || (user as any).name || "",
      receiverPhone: (recipient as any)?.phone || (user as any).phone || "",
      receiverAddress: (recipient as any)?.address || (user as any).address?.street || "",
      receiverEmail: (recipient as any)?.email || (user as any).email,
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
