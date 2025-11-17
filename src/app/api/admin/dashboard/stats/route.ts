// src/app/api/admin/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { PreAlert } from "@/models/PreAlert";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Get stats
    const [totalPackages, newToday, pendingAlerts, recentPackages, preAlerts] = await Promise.all([
      Package.countDocuments({ status: { $ne: "Deleted" } }),
      Package.countDocuments({ 
        createdAt: { $gte: startOfToday },
        status: { $ne: "Deleted" }
      }),
      PreAlert.countDocuments({ status: "submitted" }),
      Package.find({ status: { $ne: "Deleted" } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("trackingNumber createdAt status")
        .lean(),
      PreAlert.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select("trackingNumber status createdAt")
        .lean()
    ]);

    // Mock revenue for now - you can replace with actual payment data
    const revenueToday = 0;

    // Format recent activity
    const recentActivity = recentPackages.map((pkg) => ({
      time: pkg.createdAt?.toISOString() || new Date().toISOString(),
      text: `Package ${pkg.trackingNumber} ${pkg.status || 'created'}`,
      right: pkg.status
    }));

    return NextResponse.json({
      totalPackages,
      newToday,
      pendingAlerts,
      revenueToday,
      recentActivity,
      preAlerts: preAlerts.map(p => ({
        trackingNumber: p.trackingNumber,
        status: p.status || 'submitted',
        createdAt: p.createdAt?.toISOString() || new Date().toISOString()
      }))
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}