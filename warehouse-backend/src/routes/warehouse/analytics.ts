import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as analyticsController from '../../controllers/warehouse/analyticsController';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/warehouse/analytics/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieves key performance indicators and summary statistics for the warehouse dashboard. Includes real-time metrics for packages, customers, revenue, and operational efficiency.
 *     tags: [Warehouse Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *           default: month
 *         description: Time period for statistics
 *       - in: query
 *         name: warehouseLocation
 *         schema:
 *           type: string
 *         description: Filter by specific warehouse location
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 overview:
 *                   totalPackages: 1247
 *                   activePackages: 234
 *                   deliveredPackages: 1013
 *                   totalCustomers: 892
 *                   newCustomersThisMonth: 47
 *                   revenueThisMonth: 28450.75
 *                   averageDeliveryTime: "2.3 days"
 *                   onTimeDeliveryRate: 94.5
 *                 trends:
 *                   packagesTrend: "+12.5%"
 *                   revenueTrend: "+8.3%"
 *                   customersTrend: "+15.2%"
 *                 topRoutes:
 *                   - route: "Los Angeles to New York"
 *                     packageCount: 156
 *                   - route: "Chicago to Miami"
 *                     packageCount: 142
 *                 recentActivity:
 *                   - type: "package_delivered"
 *                     trackingNumber: "TRK123456789"
 *                     timestamp: "2024-01-15T14:30:00Z"
 *                   - type: "new_customer"
 *                     customerName: "Jane Smith"
 *                     timestamp: "2024-01-15T13:45:00Z"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
// Analytics endpoints
router.get('/dashboard', asyncHandler(analyticsController.getDashboardStats));
/**
 * @swagger
 * /api/warehouse/analytics/packages:
 *   get:
 *     summary: Get package analytics
 *     description: Provides detailed analytics and insights about package operations including volume trends, status distribution, service mode performance, and delivery metrics.
 *     tags: [Warehouse Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis (YYYY-MM-DD)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Group data by time period
 *       - in: query
 *         name: serviceMode
 *         schema:
 *           type: string
 *           enum: [air, ocean, local]
 *         description: Filter by service mode
 *     responses:
 *       200:
 *         description: Package analytics retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 summary:
 *                   totalPackages: 1247
 *                   averageWeight: 3.2
 *                   totalWeight: 3990.4
 *                   revenue: 45678.90
 *                 statusDistribution:
 *                   received: 45
 *                   in_transit: 234
 *                   out_for_delivery: 123
 *                   delivered: 845
 *                 serviceModeBreakdown:
 *                   air: 678 (54.4%)
 *                   ocean: 234 (18.8%)
 *                   local: 335 (26.8%)
 *                 deliveryPerformance:
 *                   averageDeliveryTime: "2.3 days"
 *                   onTimeDeliveryRate: 94.5
 *                   deliveryTrend: "+2.1%"
 *                 timeSeriesData:
 *                   - date: "2024-01-01"
 *                     packages: 45
 *                     revenue: 1234.56
 *                   - date: "2024-01-02"
 *                     packages: 52
 *                     revenue: 1456.78
 *       401:
 *         description: Unauthorized
 */
router.get('/packages', asyncHandler(analyticsController.getPackageAnalytics));
router.get('/inventory', asyncHandler(analyticsController.getInventoryAnalytics));
router.get('/customers', asyncHandler(analyticsController.getCustomerAnalytics));
/**
 * @swagger
 * /api/warehouse/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     description: Comprehensive revenue analysis including total revenue, revenue trends, service mode breakdown, customer segments, and financial performance metrics.
 *     tags: [Warehouse Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *         description: Time period for revenue analysis
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [USD, EUR, GBP]
 *           default: USD
 *         description: Currency for revenue reporting
 *       - in: query
 *         name: compareWithPrevious
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include comparison with previous period
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalRevenue: 45678.90
 *                 previousPeriodRevenue: 42123.45
 *                 revenueGrowth: "+8.4%"
 *                 averageOrderValue: 36.60
 *                 revenueByServiceMode:
 *                   air: 28450.75 (62.3%)
 *                   ocean: 8923.20 (19.5%)
 *                   local: 8304.95 (18.2%)
 *                 revenueByRegion:
 *                   "North America": 28450.75
 *                   "Europe": 12345.60
 *                   "Asia": 4882.55
 *                 monthlyTrend:
 *                   - month: "2023-10"
 *                     revenue: 38234.50
 *                   - month: "2023-11"
 *                     revenue: 42123.45
 *                   - month: "2023-12"
 *                     revenue: 45678.90
 *                 topCustomers:
 *                   - customerName: "Acme Corp"
 *                     revenue: 2345.60
 *                     packages: 67
 *                   - customerName: "Global Industries"
 *                     revenue: 1876.40
 *                     packages: 52
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions for financial data
 */
router.get('/revenue', asyncHandler(analyticsController.getRevenueAnalytics));
router.get('/performance', asyncHandler(analyticsController.getPerformanceMetrics));

export default router;
