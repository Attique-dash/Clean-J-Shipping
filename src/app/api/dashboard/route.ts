import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Package } from '@/models/Package';
import { User } from '@/models/User';
import { Payment } from '@/models/Payment';
import { DashboardResponse } from '@/types/dashboard';

export async function GET() {
  try {
    await dbConnect();

    // Get date ranges for queries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. Shipment Statistics
    const [
      totalShipments,
      activeShipments,
      deliveredThisMonth,
      inTransit
    ] = await Promise.all([
      Package.countDocuments(),
      Package.countDocuments({ status: { $in: ['in_transit', 'out_for_delivery', 'in_progress'] } }),
      Package.countDocuments({ 
        status: 'delivered',
        updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Package.countDocuments({ status: 'in_transit' })
    ]);

    // Get limited sample of delivered packages for average delivery time calculation
    const deliveredPackagesSample = await Package.find({ status: 'delivered' })
      .select('createdAt updatedAt')
      .limit(1000) // Limit to prevent memory issues
      .lean();

    // Calculate average delivery time from sample
    const deliveredPackages = deliveredPackagesSample.filter(pkg => pkg.createdAt && pkg.updatedAt);
    const totalDeliveryTime = deliveredPackages.reduce((acc, pkg) => {
      const deliveryTime = (new Date(pkg.updatedAt).getTime() - new Date(pkg.createdAt).getTime()) / (1000 * 60 * 60);
      return acc + deliveryTime;
    }, 0);
    const averageDeliveryTime = deliveredPackages.length > 0 
      ? Math.round((totalDeliveryTime / deliveredPackages.length) * 10) / 10 
      : 0;

    // 2. Revenue Data
    const [currentMonthRevenue, lastMonthRevenue, ytdRevenue, revenueByService] = await Promise.all([
      Payment.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            status: 'completed'
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            status: 'completed'
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            createdAt: { $lte: endOfMonth },
            status: 'completed'
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            status: 'completed'
          } 
        },
        { 
          $group: { 
            _id: '$serviceType', 
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          } 
        }
      ])
    ]);

    const currentRevenue = currentMonthRevenue[0]?.total || 0;
    const lastMonthTotal = lastMonthRevenue[0]?.total || 0;
    const growthRate = lastMonthTotal > 0 
      ? Math.round(((currentRevenue - lastMonthTotal) / lastMonthTotal) * 100) 
      : 100;

    // 3. Active Shipments for Map
    const activeShipmentsData = await Package.find({
      status: { $in: ['in_transit', 'out_for_delivery'] }
    })
      .populate('origin destination', 'address coordinates')
      .limit(50)
      .lean();

    // 4. Customer Statistics
    const [totalCustomers, newCustomersThisMonth] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ 
        role: 'customer',
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      })
    ]);

    // 5. Popular Routes
    const popularRoutes = await Package.aggregate([
      { 
        $group: { 
          _id: { 
            origin: '$origin', 
            destination: '$destination' 
          },
          count: { $sum: 1 },
          transitTimes: {
            $push: {
              $cond: [
                { $and: ['$createdAt', '$updatedAt', { $eq: ['$status', 'delivered'] }] },
                { $subtract: ['$updatedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'addresses',
          localField: '_id.origin',
          foreignField: '_id',
          as: 'originData'
        }
      },
      {
        $lookup: {
          from: 'addresses',
          localField: '_id.destination',
          foreignField: '_id',
          as: 'destinationData'
        }
      },
      {
        $project: {
          origin: { $arrayElemAt: ['$originData.address', 0] },
          destination: { $arrayElemAt: ['$destinationData.address', 0] },
          count: 1,
          averageTransitTime: {
            $avg: {
              $filter: {
                input: '$transitTimes',
                as: 'time',
                cond: { $ne: ['$$time', null] }
              }
            }
          }
        }
      }
    ]);

    // Format the response
    const response: DashboardResponse = {
      stats: {
        totalShipments,
        activeShipments,
        deliveredThisMonth,
        inTransit,
        averageDeliveryTime,
        onTimeDeliveryRate: 0 // This would require additional logic to calculate
      },
      revenue: {
        currentMonth: currentRevenue,
        previousMonth: lastMonthTotal,
        totalYTD: ytdRevenue[0]?.total || 0,
        growthRate,
        byService: revenueByService.map(service => ({
          service: service._id || 'Other',
          revenue: service.total,
          percentage: Math.round((service.total / currentRevenue) * 100) || 0
        }))
      },
      activeShipments: activeShipmentsData.map(shipment => ({
        id: shipment._id.toString(),
        trackingNumber: shipment.trackingNumber,
        origin: {
          lat: shipment.origin?.coordinates?.coordinates[1] || 0,
          lng: shipment.origin?.coordinates?.coordinates[0] || 0,
          address: shipment.origin?.address || 'Unknown'
        },
        destination: {
          lat: shipment.destination?.coordinates?.coordinates[1] || 0,
          lng: shipment.destination?.coordinates?.coordinates[0] || 0,
          address: shipment.destination?.address || 'Unknown'
        },
        status: (shipment.status as 'in_transit' | 'out_for_delivery' | 'in_progress') || 'in_progress',
        estimatedDelivery: shipment.estimatedDelivery?.toISOString() || '',
        carrier: shipment.carrier || 'Standard'
      })),
      customerStats: {
        totalCustomers,
        newCustomersThisMonth,
        repeatCustomers: 0, // This would require additional logic
        topCustomers: [] // This would require additional aggregation
      },
      popularRoutes: popularRoutes.map(route => ({
        origin: route.origin || 'Unknown',
        destination: route.destination || 'Unknown',
        count: route.count,
        averageTransitTime: route.averageTransitTime ? route.averageTransitTime / (1000 * 60 * 60) : 0
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
