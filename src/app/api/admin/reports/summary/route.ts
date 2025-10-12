import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Start of current week (Mon 00:00)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // days since Monday
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Summary totals
  const [totalPackages, totalCustomers, inTransitCount] = await Promise.all([
    Package.countDocuments({ status: { $ne: "Deleted" } }),
    User.countDocuments({ role: "customer" }),
    Package.countDocuments({ status: "In Transit" }),
  ]);

  // Revenue approximation: sum of invoiceRecords.totalValue
  // (if multiple records exist per package, take the latest record)
  const revenueAgg = await Package.aggregate([
    { $match: { status: { $ne: "Deleted" }, invoiceRecords: { $exists: true, $ne: [] } } },
    { $project: { latest: { $last: "$invoiceRecords" } } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$latest.totalValue", 0] } } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total || 0;

  // Weekly stats
  const [packagesThisWeek, newCustomersThisWeek, weeklyRevenueAgg] = await Promise.all([
    Package.countDocuments({ createdAt: { $gte: startOfWeek }, status: { $ne: "Deleted" } }),
    User.countDocuments({ role: "customer", createdAt: { $gte: startOfWeek } }),
    Package.aggregate([
      {
        $match: {
          status: { $ne: "Deleted" },
          invoiceRecords: { $exists: true, $ne: [] },
        },
      },
      { $unwind: "$invoiceRecords" },
      { $match: { "invoiceRecords.submittedAt": { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$invoiceRecords.totalValue", 0] } } } },
    ]),
  ]);
  const revenueThisWeek = weeklyRevenueAgg[0]?.total || 0;

  // Alerts
  const [awaitingInvoice, readyForPickup, overduePayments] = await Promise.all([
    // No invoice docs & no invoice records
    Package.countDocuments({ status: { $ne: "Deleted" }, invoiceDocuments: { $size: 0 }, invoiceRecords: { $size: 0 } }),
    // Ready for pickup -> At Local Port
    Package.countDocuments({ status: "At Local Port" }),
    // Overdue payments heuristic: invoiceRecords.status = submitted and submittedAt < startOfWeek (older than ~this week)
    Package.countDocuments({
      status: { $ne: "Deleted" },
      invoiceRecords: {
        $elemMatch: {
          status: "submitted",
          submittedAt: { $lt: startOfWeek },
        },
      },
    }),
  ]);

  // Recent activity (last 10 package events)
  const recent = await Package.find({})
    .select("trackingNumber entryDate createdAt")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const recent_activity = recent.map((p) => ({
    action: p.entryDate ? "package_received" : "package_created",
    description: `Package ${p.trackingNumber} ${p.entryDate ? "received" : "created"}`,
    timestamp: new Date((p.entryDate as Date) || (p.createdAt as Date)).toISOString(),
  }));

  const response = {
    summary: {
      total_packages: totalPackages,
      total_customers: totalCustomers,
      packages_in_transit: inTransitCount,
      total_revenue: totalRevenue,
    },
    weekly_stats: {
      packages_this_week: packagesThisWeek,
      revenue_this_week: revenueThisWeek,
      new_customers_this_week: newCustomersThisWeek,
    },
    alerts: {
      packages_awaiting_invoice: awaitingInvoice,
      packages_ready_for_pickup: readyForPickup,
      overdue_payments: overduePayments,
    },
    recent_activity,
  };

  return NextResponse.json(response);
}
