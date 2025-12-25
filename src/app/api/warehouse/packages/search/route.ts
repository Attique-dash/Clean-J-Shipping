// src/app/api/warehouse/packages/search/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";
  const userCode = url.searchParams.get("userCode")?.trim() || "";
  const dateFrom = url.searchParams.get("dateFrom")?.trim() || "";
  const dateTo = url.searchParams.get("dateTo")?.trim() || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  // Build filter
  const filter: Record<string, unknown> = {};

  if (query) {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
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
    // Find user by shippingId (userCode) and get their packages
    const user = await User.findOne({ shippingId: userCode }).select('_id').lean();
    if (user) {
      filter.userId = user._id;
    } else {
      // If no user found with this shippingId, return empty results
      return NextResponse.json({
        packages: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      });
    }
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      filter.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const [packages, total] = await Promise.all([
    Package.find(filter)
      .select("trackingNumber userId status weight shipper description createdAt updatedAt branch manifestId receiverName receiverEmail receiverPhone receiverAddress receiverCountry senderName senderEmail senderPhone senderAddress senderCountry length width height dimensionUnit itemDescription itemValue contents specialInstructions")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Package.countDocuments(filter)
  ]);

  // Get user information for all packages to include shippingId (userCode) in response
  const userIds = packages.map(p => p.userId).filter(Boolean);
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const users = await User.find({ _id: { $in: userIds } }).select('_id shippingId').lean();
    users.forEach((user: { _id: string; shippingId: string }) => {
      userMap.set(String(user._id), user.shippingId || '');
    });
  }

  // Add userCode to each package
  const packagesWithUserCode = packages.map((pkg: { userId: string; [key: string]: unknown }) => ({
    ...pkg,
    userCode: userMap.get(String(pkg.userId)) || ''
  }));

  return NextResponse.json({
    packages: packagesWithUserCode,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}