// src/app/api/warehouse/analytics/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    console.log("📊 Warehouse analytics request received");
    
    const auth = await getAuthFromRequest(req);
    if (!auth || !['admin', 'warehouse'].includes(auth.role)) {
      console.error("❌ Unauthorized access to analytics:", auth?.role);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Auth verified for analytics, user:", auth.email, "role:", auth.role);
    await dbConnect();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    console.log("📅 Analytics date ranges calculated");

    // Total packages by status (excluding deleted packages)
    const statusCounts = await Package.aggregate([
      {
        $match: {
          status: { $ne: "Deleted" }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate total packages (sum of all status counts)
    const totalPackages = statusCounts.reduce((sum, item) => sum + item.count, 0);

    // Today's statistics
    const todayStats = await Package.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalWeight: { $sum: "$weight" }
        }
      }
    ]);

    // Weekly trend
    const weeklyTrend = await Package.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Monthly statistics
    const monthlyStats = await Package.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
          },
          inTransit: {
            $sum: { $cond: [{ $eq: ["$status", "in_transit"] }, 1, 0] }
          }
        }
      }
    ]);

    // Top customers
    const topCustomers = await Package.aggregate([
      {
        $group: {
          _id: "$userCode",
          packageCount: { $sum: 1 },
          totalWeight: { $sum: "$weight" }
        }
      },
      { $sort: { packageCount: -1 } },
      { $limit: 10 }
    ]);

    // Total customers
    const totalCustomers = await User.countDocuments({ role: "customer" });

    // Calculate average processing time (time from "received" to "in_transit")
    const processingTimeData = await Package.aggregate([
      {
        $match: {
          status: { $in: ["in_transit", "delivered"] },
          history: { $exists: true, $ne: [] }
        }
      },
      {
        $project: {
          history: 1,
          status: 1
        }
      }
    ]);

    let totalProcessingTime = 0;
    let processingCount = 0;

    processingTimeData.forEach((pkg) => {
      const history = (pkg.history || []) as Array<{ status: string; at: Date }>;
      const receivedAt = history.find(h => h.status === "received" || h.status === "pending")?.at;
      const shippedAt = history.find(h => h.status === "in_transit")?.at;
      
      if (receivedAt && shippedAt) {
        const diff = new Date(shippedAt).getTime() - new Date(receivedAt).getTime();
        const hours = diff / (1000 * 60 * 60);
        if (hours > 0 && hours < 168) { // Valid range: 0-7 days
          totalProcessingTime += hours;
          processingCount++;
        }
      }
    });

    const avgProcessingTime = processingCount > 0 ? (totalProcessingTime / processingCount).toFixed(1) : "0";

    // Packages ready to ship (ready_to_ship)
    const readyToShip = statusCounts.find(item => item._id === "ready_to_ship")?.count || 0;

    const analyticsData = {
      totalPackages,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id || "Unknown"] = item.count;
        return acc;
      }, {} as Record<string, number>),
      today: {
        packages: todayStats[0]?.total || 0,
        weight: todayStats[0]?.totalWeight || 0
      },
      weeklyTrend,
      monthly: {
        total: monthlyStats[0]?.total || 0,
        delivered: monthlyStats[0]?.delivered || 0,
        inTransit: monthlyStats[0]?.inTransit || 0
      },
      topCustomers,
      totalCustomers,
      readyToShip,
      avgProcessingTime: parseFloat(avgProcessingTime)
    };

    console.log("📊 Analytics data calculated successfully:", {
      totalPackages,
      totalCustomers,
      readyToShip,
      avgProcessingTime
    });

    const response = NextResponse.json(analyticsData);
    console.log("📤 Sending analytics response");
    return response;

  } catch (error: any) {
    console.error("❌ Analytics API error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json({ 
      error: "Failed to load analytics data",
      details: error.message 
    }, { status: 500 });
  }
}