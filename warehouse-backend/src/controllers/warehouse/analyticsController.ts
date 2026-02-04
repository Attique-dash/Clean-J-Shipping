import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { Inventory } from '../../models/Inventory';
import { User } from '../../models/User';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalPackages,
      pendingPackages,
      inTransitPackages,
      deliveredPackages,
      totalCustomers,
      totalInventory,
      lowStockItems
    ] = await Promise.all([
      Package.countDocuments(),
      Package.countDocuments({ status: 'pending' }),
      Package.countDocuments({ status: 'in-transit' }),
      Package.countDocuments({ status: 'delivered' }),
      User.countDocuments({ role: 'customer' }),
      Inventory.countDocuments({ isActive: true }),
      Inventory.countDocuments({
        $expr: { $lte: ['$quantity', '$minStockLevel'] },
        isActive: true
      })
    ]);

    const stats = {
      packages: {
        total: totalPackages,
        pending: pendingPackages,
        inTransit: inTransitPackages,
        delivered: deliveredPackages
      },
      customers: {
        total: totalCustomers
      },
      inventory: {
        total: totalInventory,
        lowStock: lowStockItems
      }
    };

    successResponse(res, stats);
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    errorResponse(res, 'Failed to get dashboard stats');
  }
};

export const getPackageAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const [
      totalPackages,
      statusBreakdown,
      dailyPackages
    ] = await Promise.all([
      Package.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Package.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Package.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    successResponse(res, {
      total: totalPackages,
      statusBreakdown,
      dailyPackages
    });
  } catch (error) {
    logger.error('Error getting package analytics:', error);
    errorResponse(res, 'Failed to get package analytics');
  }
};

export const getInventoryAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalItems,
      categoryBreakdown,
      warehouseBreakdown,
      totalValue
    ] = await Promise.all([
      Inventory.countDocuments({ isActive: true }),
      Inventory.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } }
      ]),
      Inventory.aggregate([
        { $match: { isActive: true, 'location.warehouse': { $exists: true } } },
        {
          $group: {
            _id: '$location.warehouse',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        },
        { $lookup: { from: 'warehouses', localField: '_id', foreignField: '_id', as: 'warehouse' } },
        { $unwind: '$warehouse' }
      ]),
      Inventory.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
      ])
    ]);

    successResponse(res, {
      total: totalItems,
      categoryBreakdown,
      warehouseBreakdown,
      totalValue: totalValue[0]?.totalValue || 0
    });
  } catch (error) {
    logger.error('Error getting inventory analytics:', error);
    errorResponse(res, 'Failed to get inventory analytics');
  }
};

export const getCustomerAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const [
      totalCustomers,
      newCustomers,
      activeCustomers,
      topCustomers
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      User.countDocuments({
        role: 'customer',
        lastLogin: { $gte: startDate }
      }),
      Package.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$senderId',
            packageCount: { $sum: 1 },
            totalValue: { $sum: '$value' }
          }
        },
        { $sort: { packageCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'customer' } },
        { $unwind: '$customer' }
      ])
    ]);

    successResponse(res, {
      total: totalCustomers,
      new: newCustomers,
      active: activeCustomers,
      topCustomers
    });
  } catch (error) {
    logger.error('Error getting customer analytics:', error);
    errorResponse(res, 'Failed to get customer analytics');
  }
};

export const getRevenueAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const [
      totalRevenue,
      dailyRevenue,
      revenueByService
    ] = await Promise.all([
      Package.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate }, cost: { $exists: true } } },
        { $group: { _id: null, total: { $sum: '$cost' } } }
      ]),
      Package.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate }, cost: { $exists: true } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$cost' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Package.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate }, cost: { $exists: true } } },
        {
          $group: {
            _id: '$shippingMethod',
            revenue: { $sum: '$cost' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    successResponse(res, {
      total: totalRevenue[0]?.total || 0,
      dailyRevenue,
      revenueByService
    });
  } catch (error) {
    logger.error('Error getting revenue analytics:', error);
    errorResponse(res, 'Failed to get revenue analytics');
  }
};

export const getPerformanceMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const [
      averageDeliveryTime,
      onTimeDeliveryRate,
      packageVolume
    ] = await Promise.all([
      Package.aggregate([
        { $match: { 
          status: 'delivered',
          actualDelivery: { $exists: true },
          estimatedDelivery: { $exists: true },
          createdAt: { $gte: startDate, $lte: endDate }
        }},
        {
          $project: {
            deliveryTime: { $subtract: ['$actualDelivery', '$createdAt'] }
          }
        },
        { $group: { _id: null, avgTime: { $avg: '$deliveryTime' } } }
      ]),
      Package.aggregate([
        { $match: { 
          status: 'delivered',
          actualDelivery: { $exists: true },
          estimatedDelivery: { $exists: true },
          createdAt: { $gte: startDate, $lte: endDate }
        }},
        {
          $group: {
            _id: null,
            onTime: { $sum: { $cond: [{ $lte: ['$actualDelivery', '$estimatedDelivery'] }, 1, 0] } },
            total: { $sum: 1 }
          }
        }
      ]),
      Package.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: { $multiply: ['$dimensions.length', '$dimensions.width', '$dimensions.height'] } },
            totalWeight: { $sum: '$weight' }
          }
        }
      ])
    ]);

    const onTimeRate = onTimeDeliveryRate[0] ? (onTimeDeliveryRate[0].onTime / onTimeDeliveryRate[0].total) * 100 : 0;

    successResponse(res, {
      averageDeliveryTime: averageDeliveryTime[0]?.avgTime || 0,
      onTimeDeliveryRate: onTimeRate,
      packageVolume: packageVolume[0] || { totalVolume: 0, totalWeight: 0 }
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    errorResponse(res, 'Failed to get performance metrics');
  }
};
