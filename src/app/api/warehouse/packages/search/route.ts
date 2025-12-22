// src/app/api/warehouse/packages/search/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { isWarehouseAuthorized } from "@/lib/rbac";

export async function GET(req: Request) {
  if (!isWarehouseAuthorized(req)) {
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
    filter.userCode = userCode;
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
      .select("trackingNumber userCode status weight shipper description createdAt updatedAt branch manifestId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Package.countDocuments(filter)
  ]);

  return NextResponse.json({
    packages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}