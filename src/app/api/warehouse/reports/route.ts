// src/app/api/warehouse/reports/route.ts
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
  const reportType = url.searchParams.get("type") || "summary";
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  // Build date filter
  const dateFilter: Record<string, unknown> = {};
  if (dateFrom) {
    dateFilter.$gte = new Date(dateFrom);
  }
  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    dateFilter.$lte = endDate;
  }

  const filter = Object.keys(dateFilter).length > 0 
    ? { createdAt: dateFilter } 
    : {};

  switch (reportType) {
    case "summary": {
      // Overall summary report
      const totalPackages = await Package.countDocuments(filter);
      const byStatus = await Package.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      const totalWeight = await Package.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$weight" } } }
      ]);
      const avgWeight = await Package.aggregate([
        { $match: filter },
        { $group: { _id: null, avg: { $avg: "$weight" } } }
      ]);

      return NextResponse.json({
        reportType: "summary",
        period: { from: dateFrom, to: dateTo },
        totalPackages,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id || "Unknown"] = item.count;
          return acc;
        }, {} as Record<string, number>),
        totalWeight: totalWeight[0]?.total || 0,
        averageWeight: avgWeight[0]?.avg || 0
      });
    }

    case "daily": {
      // Daily breakdown
      const daily = await Package.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            totalWeight: { $sum: "$weight" }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return NextResponse.json({
        reportType: "daily",
        period: { from: dateFrom, to: dateTo },
        data: daily.map(d => ({
          date: d._id,
          packages: d.count,
          weight: d.totalWeight
        }))
      });
    }

    case "customer": {
      // Customer activity report
      const customerStats = await Package.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$userCode",
            totalPackages: { $sum: 1 },
            totalWeight: { $sum: "$weight" },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] }
            },
            inTransit: {
              $sum: { $cond: [{ $eq: ["$status", "In Transit"] }, 1, 0] }
            }
          }
        },
        { $sort: { totalPackages: -1 } },
        { $limit: 50 }
      ]);

      return NextResponse.json({
        reportType: "customer",
        period: { from: dateFrom, to: dateTo },
        data: customerStats.map(c => ({
          userCode: c._id,
          totalPackages: c.totalPackages,
          totalWeight: c.totalWeight,
          delivered: c.delivered,
          inTransit: c.inTransit
        }))
      });
    }

    case "shipper": {
      // Shipper performance report
      const shipperStats = await Package.aggregate([
        { $match: { ...filter, shipper: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$shipper",
            totalPackages: { $sum: 1 },
            totalWeight: { $sum: "$weight" },
            avgWeight: { $avg: "$weight" }
          }
        },
        { $sort: { totalPackages: -1 } },
        { $limit: 20 }
      ]);

      return NextResponse.json({
        reportType: "shipper",
        period: { from: dateFrom, to: dateTo },
        data: shipperStats.map(s => ({
          shipper: s._id,
          totalPackages: s.totalPackages,
          totalWeight: s.totalWeight,
          averageWeight: s.avgWeight
        }))
      });
    }

    case "export": {
      // Export detailed package list
      const packages = await Package.find(filter)
        .select("trackingNumber userCode status weight shipper description createdAt updatedAt branch manifestId")
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean();

      return NextResponse.json({
        reportType: "export",
        period: { from: dateFrom, to: dateTo },
        totalRecords: packages.length,
        data: packages
      });
    }

    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
}