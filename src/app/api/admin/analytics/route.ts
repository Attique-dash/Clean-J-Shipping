// my-app/src/app/api/admin/analytics/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import { getAuthFromRequest } from "@/lib/rbac";

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  console.log('Analytics endpoint called');
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    console.log('Unauthorized access attempt');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log('Connecting to database...');
  try {
    await dbConnect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ error: "Database connection error" }, { status: 500 });
  }

  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "30d";
  console.log('Date range:', range);

  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  
  // Prevent loading all data - limit "all" to 1 year max to avoid memory issues
  switch (range) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      // Limit "all" to 1 year to prevent memory issues
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }
  
  console.log('Querying data with start date:', startDate);

  // Previous period for comparison
  const diff = now.getTime() - startDate.getTime();
  const previousStart = new Date(startDate.getTime() - diff);
  const previousEnd = new Date(startDate.getTime());

  try {
    // Log collection counts for debugging
    try {
      const packageCount = await Package.countDocuments({});
      const userCount = await User.countDocuments({});
      const paymentCount = await Payment.countDocuments({});
      
      console.log('Collection counts:', {
        packages: packageCount,
        users: userCount,
        payments: paymentCount
      });
    } catch (err) {
      console.error('Error getting collection counts:', err);
    }

    // Current period metrics
    console.log('Starting analytics queries...');
    const [
      currentPackages,
      previousPackages,
      currentCustomers,
      previousCustomers,
      revenueAgg,
      previousRevenueAgg,
      packagesByStatus,
      packagesByBranch,
      topCustomersData
    ] = await Promise.all([
      // Current packages
      Package.countDocuments({ 
        createdAt: { $gte: startDate }, 
        status: { $ne: "Deleted" } 
      }),
      // Previous packages
      Package.countDocuments({ 
        createdAt: { $gte: previousStart, $lt: previousEnd }, 
        status: { $ne: "Deleted" } 
      }),
      // Current customers
      User.countDocuments({ 
        role: "customer", 
        createdAt: { $gte: startDate } 
      }),
      // Previous customers
      User.countDocuments({ 
        role: "customer", 
        createdAt: { $gte: previousStart, $lt: previousEnd } 
      }),
      // Current revenue - include both "captured" and "completed" for consistency
      Payment.aggregate([
        { $match: { 
          status: { $in: ["captured", "completed", "succeeded"] }, 
          createdAt: { $gte: startDate } 
        }},
        { $group: { _id: null, total: { $sum: "$amount" } }}
      ]),
      // Previous revenue - include both "captured" and "completed" for consistency
      Payment.aggregate([
        { $match: { 
          status: { $in: ["captured", "completed", "succeeded"] }, 
          createdAt: { $gte: previousStart, $lt: previousEnd } 
        }},
        { $group: { _id: null, total: { $sum: "$amount" } }}
      ]),
      // Packages by status
      Package.aggregate([
        { $match: { status: { $ne: "Deleted" }, createdAt: { $gte: startDate } }},
        { $group: { _id: "$status", count: { $sum: 1 }}},
        { $sort: { count: -1 }},
        { $limit: 20 } // Limit to prevent excessive results
      ]),
      // Packages by branch
      Package.aggregate([
        { $match: { status: { $ne: "Deleted" }, createdAt: { $gte: startDate }, branch: { $exists: true, $ne: null }}},
        { $group: { _id: "$branch", count: { $sum: 1 }}},
        { $sort: { count: -1 }},
        { $limit: 10 }
      ]),
      // Top customers - optimized to avoid large lookups
      Package.aggregate([
        { $match: { 
          status: { $ne: "Deleted" }, 
          createdAt: { $gte: startDate },
          customer: { $exists: true, $ne: null }
        }},
        { $group: {
          _id: "$customer",
          packages: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ["$weight", 0] } }
        }},
        { $sort: { packages: -1 }},
        { $limit: 10 },
        { $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "customerData",
          pipeline: [
            { $project: { 
              firstName: 1, 
              lastName: 1 
            }}
          ]
        }},
        { $unwind: { path: "$customerData", preserveNullAndEmptyArrays: true }},
        { $project: {
          _id: 1,
          name: { 
            $concat: [
              { $ifNull: ["$customerData.firstName", ""] }, 
              " ", 
              { $ifNull: ["$customerData.lastName", "Unknown"] }
            ]
          },
          packages: 1,
          totalWeight: 1
        }}
      ])
    ]);

    console.log('Analytics query results:', {
      currentPackages,
      previousPackages,
      currentCustomers,
      previousCustomers,
      revenueAgg,
      previousRevenueAgg,
      packagesByStatus,
      packagesByBranch,
      topCustomersData
    });

    const currentRevenue = revenueAgg[0]?.total || 0;
    const previousRevenue = previousRevenueAgg[0]?.total || 0;
    
    console.log('Processed values:', {
      currentRevenue,
      previousRevenue,
      currentPackages,
      previousPackages,
      currentCustomers,
      previousCustomers
    });

    // Calculate growth percentages
    const packagesGrowth = previousPackages > 0 
      ? Number(((currentPackages - previousPackages) / previousPackages * 100).toFixed(1))
      : 100;
    
    const customersGrowth = previousCustomers > 0
      ? Number(((currentCustomers - previousCustomers) / previousCustomers * 100).toFixed(1))
      : 100;
    
    const revenueGrowth = previousRevenue > 0
      ? Number(((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1))
      : 100;

    const avgValue = currentPackages > 0 ? currentRevenue / currentPackages : 0;
    const previousAvgValue = previousPackages > 0 ? previousRevenue / previousPackages : 0;
    const valueGrowth = previousAvgValue > 0
      ? Number(((avgValue - previousAvgValue) / previousAvgValue * 100).toFixed(1))
      : 100;

    // Format packages by status
    const totalPackagesForStatus = packagesByStatus.reduce((sum, item) => sum + item.count, 0);
    const formattedPackagesByStatus = packagesByStatus.map(item => ({
      status: item._id,
      count: item.count,
      percentage: totalPackagesForStatus > 0 
        ? ((item.count / totalPackagesForStatus) * 100).toFixed(1)
        : 0
    }));

    // Revenue by month (last 6 months) - optimized with single aggregation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const [revenueByMonthData, packagesByMonthData] = await Promise.all([
      Payment.aggregate([
        { $match: { 
          status: { $in: ["captured", "completed", "succeeded"] }, 
          createdAt: { $gte: sixMonthsAgo }
        }},
        { $group: { 
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          total: { $sum: "$amount" }
        }},
        { $sort: { "_id.year": 1, "_id.month": 1 }}
      ]),
      Package.aggregate([
        { $match: {
          status: { $ne: "Deleted" },
          createdAt: { $gte: sixMonthsAgo }
        }},
        { $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }},
        { $sort: { "_id.year": 1, "_id.month": 1 }}
      ])
    ]);

    // Build revenue by month array for last 6 months
    const revenueByMonth = [];
    const revenueMap = new Map(
      revenueByMonthData.map(r => [`${r._id.year}-${r._id.month}`, r.total])
    );
    const packagesMap = new Map(
      packagesByMonthData.map(p => [`${p._id.year}-${p._id.month}`, p.count])
    );

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`;
      
      revenueByMonth.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        revenue: revenueMap.get(key) || 0,
        packages: packagesMap.get(key) || 0
      });
    }

    // Mock revenue for top customers (you should join with actual payment data)
    const topCustomers = topCustomersData.map(c => ({
      name: c.name || 'Unknown',
      packages: c.packages,
      revenue: c.packages * 50 // Mock: Replace with actual revenue calculation
    }));

    // Recent Activity - Get recent packages, payments, and customer registrations
    // Add date filter to limit data and prevent memory issues
    const recentDateLimit = new Date();
    recentDateLimit.setDate(recentDateLimit.getDate() - 90); // Last 90 days only
    
    const [recentPackages, recentPayments, recentCustomers] = await Promise.all([
      Package.find({ 
        status: { $ne: "Deleted" },
        createdAt: { $gte: recentDateLimit }
      })
        .select("trackingNumber status createdAt")
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      Payment.find({ 
        status: { $in: ["captured", "completed", "succeeded"] },
        createdAt: { $gte: recentDateLimit }
      })
        .select("amount createdAt")
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),
      User.find({ 
        role: "customer",
        createdAt: { $gte: recentDateLimit }
      })
        .select("firstName lastName createdAt")
        .sort({ createdAt: -1 })
        .limit(2)
        .lean()
    ]);

    const recentActivity = [
      ...recentPackages.map((p) => ({
        title: 'New package received',
        desc: `Package ${(p as any).trackingNumber} has been received`,
        time: formatTimeAgo((p as any).createdAt instanceof Date ? (p as any).createdAt : new Date((p as any).createdAt)),
        timestamp: new Date((p as any).createdAt).getTime(),
        icon: 'Package',
        color: 'blue'
      })),
      ...recentPayments.map((p) => {
        const payment = p as unknown as { amount: number; createdAt: Date | string };
        return {
          title: 'Payment processed',
          desc: `Payment of ${formatCurrency(payment.amount)} received`,
          time: formatTimeAgo(payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt)),
          timestamp: new Date(payment.createdAt).getTime(),
          icon: 'CreditCard',
          color: 'green'
        };
      }),
      ...recentCustomers.map((c) => {
        const customer = c as unknown as { firstName?: string; lastName?: string; createdAt: Date | string };
        return {
          title: 'New customer registered',
          desc: `${customer.firstName || ''} ${customer.lastName || ''} joined the platform`.trim(),
          time: formatTimeAgo(customer.createdAt instanceof Date ? customer.createdAt : new Date(customer.createdAt)),
          timestamp: new Date(customer.createdAt).getTime(),
          icon: 'Users',
          color: 'purple'
        };
      })
    ]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 4);

    const response = {
      overview: {
        totalRevenue: currentRevenue,
        revenueGrowth: revenueGrowth,
        totalPackages: currentPackages,
        packagesGrowth: packagesGrowth,
        totalCustomers: currentCustomers,
        customersGrowth: customersGrowth,
        averageValue: avgValue,
        valueGrowth: valueGrowth
      },
      packagesByStatus: formattedPackagesByStatus,
      revenueByMonth,
      topCustomers,
      packagesByBranch: packagesByBranch.map(b => ({
        branch: b._id || 'Unknown',
        count: b.count
      })),
      recentActivity
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Analytics error:", error);
    
    // Handle memory-related errors specifically
    if (error instanceof RangeError && error.message.includes('Array buffer')) {
      console.error("Memory allocation error - likely too much data");
      return NextResponse.json(
        { 
          error: "Data set too large. Please try a shorter time range.",
          code: "MEMORY_ERROR"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch analytics",
        code: "ANALYTICS_ERROR"
      },
      { status: 500 }
    );
  }
}