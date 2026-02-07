import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { User } from '../../models/User';
import { Inventory } from '../../models/Inventory';
import { Warehouse } from '../../models/Warehouse';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export const generatePackageReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, format = 'json', warehouseId } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const matchQuery: any = {
      createdAt: { $gte: start, $lte: end }
    };
    
    if (warehouseId) {
      matchQuery.warehouseId = warehouseId;
    }

    const [
      totalPackages,
      statusBreakdown,
      priorityBreakdown,
      shippingMethodBreakdown,
      dailyPackages,
      topDestinations,
      revenueData,
      performanceData
    ] = await Promise.all([
      Package.countDocuments(matchQuery),
      Package.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Package.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Package.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$shippingMethod', count: { $sum: 1 } } }
      ]),
      Package.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            totalValue: { $sum: '$value' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Package.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$recipientAddress.city',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Package.aggregate([
        { $match: { ...matchQuery, cost: { $exists: true } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$cost' },
            averageCost: { $avg: '$cost' }
          }
        }
      ]),
      Package.aggregate([
        { $match: { 
          ...matchQuery,
          status: 'delivered',
          actualDelivery: { $exists: true },
          estimatedDelivery: { $exists: true }
        }},
        {
          $group: {
            _id: null,
            averageDeliveryTime: { $avg: { $subtract: ['$actualDelivery', '$createdAt'] } },
            onTimeDeliveries: {
              $sum: { $cond: [{ $lte: ['$actualDelivery', '$estimatedDelivery'] }, 1, 0] }
            },
            totalDeliveries: { $sum: 1 }
          }
        }
      ])
    ]);

    const report = {
      metadata: {
        reportType: 'package',
        generatedAt: new Date(),
        period: { start, end },
        warehouseId
      },
      summary: {
        totalPackages,
        totalRevenue: revenueData[0]?.totalRevenue || 0,
        averageCost: revenueData[0]?.averageCost || 0,
        averageDeliveryTime: performanceData[0]?.averageDeliveryTime || 0,
        onTimeDeliveryRate: performanceData[0] ? 
          (performanceData[0].onTimeDeliveries / performanceData[0].totalDeliveries) * 100 : 0
      },
      breakdowns: {
        byStatus: statusBreakdown,
        byPriority: priorityBreakdown,
        byShippingMethod: shippingMethodBreakdown
      },
      trends: {
        dailyPackages,
        topDestinations
      }
    };

    if (format === 'csv') {
      // Generate CSV format
      const csvData = generatePackageCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="package-report-${Date.now()}.csv"`);
      res.send(csvData);
    } else {
      successResponse(res, report, 'Package report generated successfully');
    }

  } catch (error) {
    logger.error('Error generating package report:', error);
    errorResponse(res, 'Failed to generate package report');
  }
};

export const generateInventoryReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { warehouseId, category, format = 'json' } = req.query;

    const matchQuery: any = { isActive: true };
    if (warehouseId) matchQuery['location.warehouse'] = warehouseId;
    if (category) matchQuery.category = category;

    const [
      totalItems,
      categoryBreakdown,
      warehouseBreakdown,
      lowStockItems,
      totalValue,
      stockLevels,
      turnoverData
    ] = await Promise.all([
      Inventory.countDocuments(matchQuery),
      Inventory.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } }
          }
        },
        { $sort: { totalValue: -1 } }
      ]),
      Inventory.aggregate([
        { $match: { ...matchQuery, 'location.warehouse': { $exists: true } } },
        {
          $group: {
            _id: '$location.warehouse',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } }
          }
        },
        { $lookup: { from: 'warehouses', localField: '_id', foreignField: '_id', as: 'warehouse' } },
        { $unwind: '$warehouse' }
      ]),
      Inventory.find({
        $expr: { $lte: ['$quantity', '$minStockLevel'] },
        ...matchQuery
      }).populate('location.warehouse', 'name code'),
      Inventory.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
      ]),
      Inventory.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalStock: { $sum: '$quantity' },
            avgStockLevel: { $avg: '$quantity' },
            minStock: { $min: '$quantity' },
            maxStock: { $max: '$quantity' }
          }
        }
      ]),
      Inventory.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$sku',
            totalSold: { $sum: 0 }, // Would need sales data for accurate turnover
            currentStock: { $last: '$quantity' },
            avgStock: { $avg: '$quantity' }
          }
        },
        {
          $addFields: {
            turnoverRate: { $divide: ['$totalSold', '$avgStock'] }
          }
        },
        { $sort: { turnoverRate: -1 } },
        { $limit: 10 }
      ])
    ]);

    const report = {
      metadata: {
        reportType: 'inventory',
        generatedAt: new Date(),
        warehouseId,
        category
      },
      summary: {
        totalItems,
        totalValue: totalValue[0]?.totalValue || 0,
        lowStockCount: lowStockItems.length,
        totalStock: stockLevels[0]?.totalStock || 0,
        averageStockLevel: stockLevels[0]?.avgStockLevel || 0
      },
      breakdowns: {
        byCategory: categoryBreakdown,
        byWarehouse: warehouseBreakdown
      },
      alerts: {
        lowStockItems
      }
    };

    if (format === 'csv') {
      const csvData = generateInventoryCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="inventory-report-${Date.now()}.csv"`);
      res.send(csvData);
    } else {
      successResponse(res, report, 'Inventory report generated successfully');
    }

  } catch (error) {
    logger.error('Error generating inventory report:', error);
    errorResponse(res, 'Failed to generate inventory report');
  }
};

export const generateCustomerReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [
      totalCustomers,
      newCustomers,
      activeCustomers,
      customerSegments,
      topCustomers,
      customerMetrics
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: start, $lte: end }
      }),
      User.countDocuments({
        role: 'customer',
        lastLogin: { $gte: start }
      }),
      Package.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: '$senderId',
            packageCount: { $sum: 1 },
            totalValue: { $sum: '$value' }
          }
        },
        {
          $bucket: {
            groupBy: '$packageCount',
            boundaries: [1, 5, 10, 20, 50, Infinity],
            default: 'Other',
            output: {
              count: { $sum: 1 },
              customers: { $push: '$_id' }
            }
          }
        }
      ]),
      Package.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
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
      ]),
      User.aggregate([
        { $match: { role: 'customer' } },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            averageAge: { $avg: { $subtract: [new Date(), '$createdAt'] } },
            recentLogins: {
              $sum: { $cond: [{ $gte: ['$lastLogin', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const report = {
      metadata: {
        reportType: 'customer',
        generatedAt: new Date(),
        period: { start, end }
      },
      summary: {
        totalCustomers,
        newCustomers,
        activeCustomers,
        churnRate: customerMetrics[0] ? 
          ((customerMetrics[0].totalCustomers - customerMetrics[0].recentLogins) / customerMetrics[0].totalCustomers) * 100 : 0
      },
      segmentation: customerSegments,
      topCustomers
    };

    if (format === 'csv') {
      const csvData = generateCustomerCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="customer-report-${Date.now()}.csv"`);
      res.send(csvData);
    } else {
      successResponse(res, report, 'Customer report generated successfully');
    }

  } catch (error) {
    logger.error('Error generating customer report:', error);
    errorResponse(res, 'Failed to generate customer report');
  }
};

export const generateFinancialReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [
      revenueData,
      dailyRevenue,
      revenueByService,
      revenueByWarehouse,
      profitData
    ] = await Promise.all([
      Package.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, cost: { $exists: true } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$cost' },
            averageRevenue: { $avg: '$cost' },
            totalPackages: { $sum: 1 }
          }
        }
      ]),
      Package.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, cost: { $exists: true } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$cost' },
            packages: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Package.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, cost: { $exists: true } } },
        {
          $group: {
            _id: '$shippingMethod',
            revenue: { $sum: '$cost' },
            packages: { $sum: 1 },
            averageRevenue: { $avg: '$cost' }
          }
        }
      ]),
      Package.aggregate([
        { $match: { 
          createdAt: { $gte: start, $lte: end }, 
          cost: { $exists: true },
          warehouseId: { $exists: true }
        }},
        {
          $group: {
            _id: '$warehouseId',
            revenue: { $sum: '$cost' },
            packages: { $sum: 1 }
          }
        },
        { $lookup: { from: 'warehouses', localField: '_id', foreignField: '_id', as: 'warehouse' } },
        { $unwind: '$warehouse' }
      ]),
      // Simplified profit calculation (would need cost data in real implementation)
      Package.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, cost: { $exists: true } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$cost' },
            estimatedCost: { $sum: { $multiply: ['$cost', 0.7] } } // Assume 70% cost
          }
        }
      ])
    ]);

    const report = {
      metadata: {
        reportType: 'financial',
        generatedAt: new Date(),
        period: { start, end }
      },
      summary: {
        totalRevenue: revenueData[0]?.totalRevenue || 0,
        averageRevenue: revenueData[0]?.averageRevenue || 0,
        totalPackages: revenueData[0]?.totalPackages || 0,
        estimatedProfit: profitData[0] ? 
          profitData[0].totalRevenue - profitData[0].estimatedCost : 0,
        profitMargin: profitData[0] ? 
          ((profitData[0].totalRevenue - profitData[0].estimatedCost) / profitData[0].totalRevenue) * 100 : 0
      },
      breakdowns: {
        dailyRevenue,
        byService: revenueByService,
        byWarehouse: revenueByWarehouse
      }
    };

    if (format === 'csv') {
      const csvData = generateFinancialCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="financial-report-${Date.now()}.csv"`);
      res.send(csvData);
    } else {
      successResponse(res, report, 'Financial report generated successfully');
    }

  } catch (error) {
    logger.error('Error generating financial report:', error);
    errorResponse(res, 'Failed to generate financial report');
  }
};

// CSV generation helper functions
function generatePackageCSV(report: any): string {
  const headers = ['Date', 'Total Packages', 'Status', 'Revenue', 'Average Delivery Time'];
  const rows = report.trends.dailyPackages.map((day: any) => [
    day._id,
    day.count,
    '',
    day.totalValue || 0,
    ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateInventoryCSV(report: any): string {
  const headers = ['Category', 'Total Items', 'Total Quantity', 'Total Value'];
  const rows = report.breakdowns.byCategory.map((cat: any) => [
    cat._id,
    cat.count,
    cat.totalQuantity,
    cat.totalValue
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateCustomerCSV(report: any): string {
  const headers = ['Customer Name', 'Email', 'Packages', 'Total Value'];
  const rows = report.topCustomers.map((cust: any) => [
    cust.customer.name,
    cust.customer.email,
    cust.packageCount,
    cust.totalValue || 0
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateFinancialCSV(report: any): string {
  const headers = ['Date', 'Revenue', 'Packages', 'Average Revenue'];
  const rows = report.breakdowns.dailyRevenue.map((day: any) => [
    day._id,
    day.revenue,
    day.packages,
    day.revenue / day.packages
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
