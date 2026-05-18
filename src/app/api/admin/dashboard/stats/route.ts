import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Package } from '@/models/Package';
import { User } from '@/models/User';
import { Payment } from '@/models/Payment';
import { getAuthFromRequest } from '@/lib/rbac';
import { getExternalStatusLabel } from '@/lib/mappings';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Active = not delivered (PackageStatus 4) and not legacy returned */
const ACTIVE_PACKAGE_FILTER = {
  $and: [
    { PackageStatus: { $ne: 4 } },
    { status: { $nin: ['returned', 'delivered', 'cancelled'] } },
  ],
};

const IN_TRANSIT_FILTER = {
  $or: [
    { PackageStatus: { $in: [1, 2] } },
    { status: { $in: ['shipped', 'in_transit', 'in_processing', 'ready_to_ship'] } },
  ],
};

const CUSTOMS_FILTER = {
  $or: [
    { PackageStatus: 3 },
    { status: { $in: ['at_customs', 'customs', 'customs_pending'] } },
  ],
};

export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || !['admin', 'warehouse_staff', 'customer_support'].includes(payload.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    await dbConnect();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      totalPackages,
      packagesLast30Days,
      packagesPrev30Days,
      totalCustomers,
      customersLast30Days,
      customersPrev30Days,
      revenueResult,
      previousRevenueResult,
      activePackages,
      pendingDeliveries,
      newCustomersThisMonth,
      outstandingPaymentsResult,
      packagesInCustoms,
      packagesByStatusRaw,
      packagesByBranchRaw,
    ] = await Promise.all([
      Package.countDocuments({}),
      Package.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Package.countDocuments({
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),
      Payment.aggregate([
        { $match: { status: 'captured' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: 'captured',
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]),
      Package.countDocuments(ACTIVE_PACKAGE_FILTER),
      Package.countDocuments(IN_TRANSIT_FILTER),
      User.countDocuments({ role: 'customer', createdAt: { $gte: thirtyDaysAgo } }),
      Payment.aggregate([
        { $match: { status: { $in: ['pending', 'authorized', 'initiated'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Package.countDocuments(CUSTOMS_FILTER),
      Package.aggregate([
        {
          $group: {
            _id: {
              $ifNull: [
                '$PackageStatus',
                {
                  $switch: {
                    branches: [
                      { case: { $eq: ['$status', 'delivered'] }, then: 4 },
                      { case: { $eq: ['$status', 'at_customs'] }, then: 3 },
                      { case: { $in: ['$status', ['in_transit', 'shipped']] }, then: 2 },
                      { case: { $eq: ['$status', 'ready_to_ship'] }, then: 1 },
                    ],
                    default: 0,
                  },
                },
              ],
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Package.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$Branch', '$branch', 'Unknown'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    const previousTotalRevenue = previousRevenueResult[0]?.totalRevenue || 0;
    const revenueGrowth =
      previousTotalRevenue > 0
        ? Math.round(((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100)
        : totalRevenue > 0
          ? 100
          : 0;

    const packagesGrowth =
      packagesPrev30Days > 0
        ? Math.round(((packagesLast30Days - packagesPrev30Days) / packagesPrev30Days) * 100)
        : packagesLast30Days > 0
          ? 100
          : 0;

    const customersGrowth =
      customersPrev30Days > 0
        ? Math.round(((customersLast30Days - customersPrev30Days) / customersPrev30Days) * 100)
        : customersLast30Days > 0
          ? 100
          : 0;

    const outstandingPayments = outstandingPaymentsResult[0]?.total || 0;

    const response = {
      overview: {
        totalRevenue,
        revenueGrowth,
        totalPackages,
        packagesGrowth,
        totalCustomers,
        customersGrowth,
        averageValue: totalPackages > 0 ? totalRevenue / totalPackages : 0,
        valueGrowth: 0,
        activePackages,
        pendingDeliveries,
        newCustomersThisMonth,
        outstandingPayments,
        packagesInCustoms,
      },
      packagesByStatus: packagesByStatusRaw.map((row) => ({
        status: getExternalStatusLabel(row._id ?? 0),
        count: row.count,
        percentage:
          totalPackages > 0
            ? ((row.count / totalPackages) * 100).toFixed(1) + '%'
            : '0%',
      })),
      revenueByMonth: await getRevenueByMonth(),
      topCustomers: await getTopCustomers(),
      packagesByBranch: packagesByBranchRaw.map((row) => ({
        branch: String(row._id || 'Unknown'),
        count: row.count,
      })),
      recentActivity: await getRecentActivity(),
      alerts: await getAlerts(),
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function getRevenueByMonth() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const result = await Payment.aggregate([
    {
      $match: {
        status: 'captured',
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        packages: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result.map((row) => ({
    month: row._id,
    revenue: Number(row.revenue),
    packages: Number(row.packages),
  }));
}

async function getTopCustomers(limit = 5) {
  const result = await Package.aggregate([
    { $match: { userId: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$userId',
        packages: { $sum: 1 },
      },
    },
    { $sort: { packages: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ['$user.firstName', ''] },
                ' ',
                { $ifNull: ['$user.lastName', ''] },
              ],
            },
          },
        },
        email: '$user.email',
        packages: 1,
      },
    },
  ]);

  return result.map((row) => ({
    name: (row.name as string)?.trim() || row.email || 'Customer',
    packages: row.packages,
    revenue: 0,
  }));
}

async function getRecentActivity(limit = 10) {
  const activities: Array<{
    title: string;
    description: string;
    timestamp: Date;
    icon: string;
  }> = [];

  const recentPackages = await Package.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email')
    .lean();

  for (const pkg of recentPackages) {
    const doc = pkg as Record<string, unknown>;
    const user = doc.userId as { firstName?: string; lastName?: string; email?: string } | null;
    const tracking = String(doc.TrackingNumber || doc.trackingNumber || '');
    const userLabel =
      user && (user.firstName || user.lastName)
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : user?.email || 'customer';
    activities.push({
      title: 'New Package',
      description: `Package #${tracking} for ${userLabel}`,
      timestamp: (doc.createdAt as Date) || new Date(),
      icon: 'Package',
    });
  }

  const recentPayments = await Payment.find({ status: 'captured' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customer', 'firstName lastName email')
    .lean();

  for (const payment of recentPayments) {
    const p = payment as Record<string, unknown>;
    const user = p.customer as { firstName?: string; lastName?: string; email?: string } | null;
    const userLabel =
      user && (user.firstName || user.lastName)
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : user?.email || 'customer';
    activities.push({
      title: 'Payment Received',
      description: `$${p.amount} from ${userLabel}`,
      timestamp: (p.createdAt as Date) || new Date(),
      icon: 'CreditCard',
    });
  }

  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

async function getAlerts() {
  const alerts: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
  }> = [];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const overduePayments = await Payment.countDocuments({
    status: { $in: ['pending', 'initiated', 'authorized'] },
    createdAt: { $lt: sevenDaysAgo },
  });

  if (overduePayments > 0) {
    alerts.push({
      id: 'overdue_payments',
      type: 'overdue_payment',
      title: 'Overdue Payments',
      description: `${overduePayments} payments are overdue`,
      count: overduePayments,
      severity: 'high',
    });
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const delayedDeliveries = await Package.countDocuments({
    ...IN_TRANSIT_FILTER,
    createdAt: { $lt: fourteenDaysAgo },
  });

  if (delayedDeliveries > 0) {
    alerts.push({
      id: 'delayed_deliveries',
      type: 'delayed_delivery',
      title: 'Delayed Deliveries',
      description: `${delayedDeliveries} packages are delayed`,
      count: delayedDeliveries,
      severity: 'medium',
    });
  }

  const customsIssues = await Package.countDocuments({
    ...CUSTOMS_FILTER,
    createdAt: { $lt: fourteenDaysAgo },
  });

  if (customsIssues > 0) {
    alerts.push({
      id: 'customs_issues',
      type: 'customs_issue',
      title: 'Customs Issues',
      description: `${customsIssues} packages in customs`,
      count: customsIssues,
      severity: 'medium',
    });
  }

  return alerts;
}
