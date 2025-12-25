import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get package statistics
    const [
      totalPackages,
      pendingPackages,
      inTransitPackages,
      deliveredPackages,
      todayPackages,
      weeklyPackages,
      monthlyPackages
    ] = await Promise.all([
      Package.countDocuments(),
      Package.countDocuments({ status: /pending|received/i }),
      Package.countDocuments({ status: /in_transit|transit/i }),
      Package.countDocuments({ status: /delivered/i }),
      Package.countDocuments({ createdAt: { $gte: today } }),
      Package.countDocuments({ createdAt: { $gte: lastWeek } }),
      Package.countDocuments({ createdAt: { $gte: thisMonth } })
    ]);

    // Calculate monthly revenue (simplified - assuming average package value)
    const monthlyRevenue = monthlyPackages * 25; // Example: $25 average per package

    return NextResponse.json({
      totalPackages,
      pendingPackages,
      inTransitPackages,
      deliveredPackages,
      todayPackages,
      weeklyPackages,
      monthlyRevenue
    });

  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
