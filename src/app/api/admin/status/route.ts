import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { PreAlert } from "@/models/PreAlert";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  // Check authentication
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    // Define time ranges
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Fetch all data in parallel
    const [
      totalPackages,
      newToday,
      pendingAlerts,
      revenueAgg,
      recentPackages,
      recentPayments,
      recentCustomers,
      preAlertsList,
    ] = await Promise.all([
      Package.countDocuments({}),
      Package.countDocuments({ createdAt: { $gte: startOfToday, $lt: endOfToday } }),
      PreAlert.countDocuments({ status: "submitted" }),
      Payment.aggregate([
        { $match: { status: "captured", createdAt: { $gte: startOfToday, $lt: endOfToday } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Package.find({})
        .select("trackingNumber status updatedAt userCode")
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
      Payment.find({ status: "captured" })
        .select("amount userCode createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.find({ role: "customer" })
        .select("email createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      PreAlert.find({})
        .select("trackingNumber status createdAt")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    const revenueToday = Number(revenueAgg?.[0]?.total || 0);

    // Build recent activity
    interface Activity {
      time: Date;
      text: string;
      right?: string;
    }

    interface PackageDocument {
      trackingNumber: string;
      status: string;
      updatedAt: string;
      userCode: string;
    }

    interface PaymentDocument {
      amount: number;
      userCode: string;
      createdAt: string;
    }

    interface CustomerDocument {
      email: string;
      createdAt: string;
    }

    interface PreAlertDocument {
      trackingNumber: string;
      status: string;
      createdAt: string;
    }

    const activities: Activity[] = [];

    recentPackages.forEach((p: PackageDocument) => {
      activities.push({ 
        time: new Date(p.updatedAt), 
        text: `Package ${p.trackingNumber} ${p.status}` 
      });
    });

    recentPayments.forEach((pay: PaymentDocument) => {
      activities.push({ 
        time: new Date(pay.createdAt), 
        text: `Payment captured $${pay.amount.toFixed(2)}`, 
        right: pay.userCode 
      });
    });

    recentCustomers.forEach((u: CustomerDocument) => {
      activities.push({ 
        time: new Date(u.createdAt), 
        text: `New customer registered`, 
        right: u.email 
      });
    });

    // Sort by time and take top 8
    activities.sort((a, b) => b.time.getTime() - a.time.getTime());
    const recentActivity = activities.slice(0, 8).map(a => ({
      time: a.time.toISOString(),
      text: a.text,
      right: a.right,
    }));

    const preAlerts = preAlertsList.map((p: PreAlertDocument) => ({
      trackingNumber: p.trackingNumber,
      status: p.status,
      createdAt: p.createdAt,
    }));

    // Return all stats
    return NextResponse.json({
      totalPackages,
      newToday,
      pendingAlerts,
      revenueToday,
      recentActivity,
      preAlerts,
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}