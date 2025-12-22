import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Package } from '@/models/Package';
import { User } from '@/models/User';
import { Payment } from '@/models/Payment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { headers } from 'next/headers';

// Enable CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET() {
  try {
    // Get the authorization header - await the headers() call
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    // Try to get session from server-side first
    let session = await getServerSession(authOptions);
    
    // If no session from server-side, try to get from JWT token
    if (!session && authorization) {
      // Extract token from authorization header
      const token = authorization.replace('Bearer ', '');
      try {
        // Decode JWT token manually (basic approach)
        const decoded = JSON.parse(atob(token.split('.')[1]));
        if (decoded) {
          session = {
            user: {
              id: decoded.sub,
              email: decoded.email,
              name: decoded.name,
              role: decoded.role,
            },
            expires: new Date(decoded.exp * 1000).toISOString(),
          };
        }
      } catch (error) {
        console.error('Failed to decode JWT token:', error);
      }
    }

    // Check if user is admin
    if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
      console.log('Unauthorized access attempt:', session?.user);
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    await dbConnect();

    // Get date ranges for growth calculations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const previousPeriodStart = new Date(thirtyDaysAgo);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);

    // Get total packages (excluding deleted packages)
    const totalPackages = await Package.countDocuments({ status: { $ne: 'returned' } });
    const previousTotalPackages = await Package.countDocuments({
      status: { $ne: 'returned' },
      createdAt: {
        $lt: thirtyDaysAgo,
        $gte: previousPeriodStart
      }
    });
    const packagesGrowth = previousTotalPackages > 0 
      ? Math.round(((totalPackages - previousTotalPackages) / previousTotalPackages) * 100)
      : 100;

    // Get total customers (only customers, not admins)
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const previousTotalCustomers = await User.countDocuments({
      role: 'customer',
      createdAt: {
        $lt: thirtyDaysAgo,
        $gte: previousPeriodStart
      }
    });
    const customersGrowth = previousTotalCustomers > 0
      ? Math.round(((totalCustomers - previousTotalCustomers) / previousTotalCustomers) * 100)
      : 100;

    // Get revenue data
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    
    // Calculate growth based on previous period
    const previousRevenueResult = await Payment.aggregate([
      {
        $match: {
          status: 'captured',
          createdAt: { $gte: previousPeriodStart, $lt: thirtyDaysAgo }
        }
      },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const previousTotalRevenue = previousRevenueResult[0]?.totalRevenue || 0;
    const revenueGrowth = previousTotalRevenue > 0
      ? Math.round(((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100)
      : 100;

    // Get packages by status
    const packagesByStatus = await Package.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Format the response
    const response = {
      overview: {
        totalRevenue,
        revenueGrowth,
        totalPackages,
        packagesGrowth,
        totalCustomers,
        customersGrowth,
        averageValue: totalPackages > 0 ? totalRevenue / totalPackages : 0,
        valueGrowth: 0
      },
      packagesByStatus: packagesByStatus.map(pkg => ({
        status: pkg._id,
        count: pkg.count,
        percentage: totalPackages > 0 ? ((pkg.count / totalPackages) * 100).toFixed(1) + '%' : '0%'
      })),
      revenueByMonth: await getRevenueByMonth(),
      topCustomers: await getTopCustomers(),
      packagesByBranch: await getPackagesByBranch(),
      recentActivity: await getRecentActivity()
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch dashboard stats' }),
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
        status: 'completed',
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        packages: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  return result.map(row => ({
    month: row._id,
    revenue: Number(row.revenue),
    packages: Number(row.packages)
  }));
}

async function getTopCustomers(limit = 5) {
  
  const result = await User.aggregate([
    {
      $lookup: {
        from: 'packages',
        localField: '_id',
        foreignField: 'userId',
        as: 'packages'
      }
    },
    {
      $lookup: {
        from: 'payments',
        localField: 'packages._id',
        foreignField: 'packageId',
        as: 'payments'
      }
    },
    { $unwind: '$payments' },
    { $match: { 'payments.status': 'completed' } },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        email: { $first: '$email' },
        package_count: { $addToSet: '$packages._id' },
        total_spent: { $sum: '$payments.amount' }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        packages: { $size: '$package_count' },
        revenue: '$total_spent'
      }
    },
    { $match: { revenue: { $gt: 0 } } },
    { $sort: { revenue: -1 } },
    { $limit: limit }
  ]);

  return result.map(row => ({
    id: row._id,
    name: row.name || row.email,
    packages: row.packages,
    revenue: Number(row.revenue)
  }));
}

async function getPackagesByBranch() {
  
  const result = await Package.aggregate([
    {
      $group: {
        _id: '$branchId',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return result.map(row => ({
    branch: row._id || 'Unknown',
    count: row.count
  }));
}

async function getRecentActivity(limit = 10) {
  const activities = [];
  
  const recentPackages = await Package.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email');

  for (const pkg of recentPackages) {
    interface PopulatedUser {
      name?: string;
      email: string;
    }
    const user = pkg.userId as unknown as PopulatedUser;
    activities.push({
      title: 'New Package',
      description: `Package #${pkg.trackingNumber} created for ${user?.name || user?.email}`,
      timestamp: pkg.createdAt,
      icon: 'Package'
    });
  }

  // Get recent payments
  const recentPayments = await Payment.find({ status: 'captured' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customer', 'name email');

  for (const payment of recentPayments) {
    interface PopulatedUser {
      name?: string;
      email: string;
    }
    const user = payment.customer as unknown as PopulatedUser;
    activities.push({
      title: 'Payment Received',
      description: `$${payment.amount} from ${user?.name || user?.email}`,
      timestamp: payment.createdAt,
      icon: 'CreditCard'
    });
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
