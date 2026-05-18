// src/app/api/warehouse/packages/search/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";
import { toKcdPackageArray, packageTextSearchOr } from "@/lib/package-format";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";
  const statuses = url.searchParams.get("statuses")?.trim() || "";
  const userCode = url.searchParams.get("userCode")?.trim() || "";
  const dateFrom = url.searchParams.get("dateFrom")?.trim() || "";
  const dateTo = url.searchParams.get("dateTo")?.trim() || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const filter: Record<string, unknown> = {};

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    filter.$or = packageTextSearchOr(regex);
  }

  const statusToPackageStatus: Record<string, number> = {
    received: 0,
    in_processing: 0,
    ready_to_ship: 1,
    shipped: 2,
    in_transit: 2,
    delivered: 4,
  };

  if (statuses) {
    const list = statuses.split(',').map((s) => s.trim()).filter(Boolean);
    const numericStatuses = list
      .map((s) => statusToPackageStatus[s])
      .filter((n) => n !== undefined);
    if (list.length > 0) {
      filter.$and = [
        ...(Array.isArray(filter.$and) ? (filter.$and as unknown[]) : []),
        {
          $or: [
            { PackageStatus: { $in: numericStatuses } },
            { status: { $in: list } },
          ],
        },
      ];
    }
  } else if (status) {
    const num = statusToPackageStatus[status];
    filter.$and = [
      ...(Array.isArray(filter.$and) ? (filter.$and as unknown[]) : []),
      {
        $or: [
          ...(num !== undefined ? [{ PackageStatus: num }] : []),
          { status },
        ],
      },
    ];
  }

  if (userCode) {
    const user = await User.findOne({
      $or: [{ userCode }, { shippingId: userCode }],
    })
      .select('_id')
      .lean();
    if (user) {
      filter.userId = (user as { _id: unknown })._id;
    } else {
      return NextResponse.json({
        packages: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }
  }

  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      range.$lte = endDate;
    }
    filter.createdAt = range;
  }

  const skip = (page - 1) * limit;
  const [packages, total] = await Promise.all([
    Package.find(filter)
      .populate('userId', 'firstName lastName email phone userCode address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Package.countDocuments(filter),
  ]);

  const kcdPackages = toKcdPackageArray(packages as Array<Record<string, unknown>>);
  console.log('[Warehouse Packages Search] KCD format:', JSON.stringify(kcdPackages, null, 2));

  return NextResponse.json({
    packages: kcdPackages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
