import { Package, IPackage } from '../models/Package';
import { User } from '../models/User';
import { generateTrackingNumber, calculateShippingCost, calculateVolume } from '../utils/helpers';
import { PACKAGE_STATUSES } from '../utils/constants';
import { logger } from '../utils/logger';

export class PackageService {
  static async createPackage(packageData: Partial<IPackage>, createdBy: string): Promise<IPackage> {
    try {
      const trackingNumber = generateTrackingNumber();
      
      const newPackage = new Package({
        ...packageData,
        trackingNumber,
        createdBy,
        status: PACKAGE_STATUSES.PENDING
      });

      await newPackage.save();
      await newPackage.populate('senderId recipientId createdBy', 'name email');

      logger.info(`Package created: ${trackingNumber}`);
      return newPackage;
    } catch (error) {
      logger.error('Error creating package:', error);
      throw error;
    }
  }

  static async updatePackageStatus(packageId: string, status: string, location?: string, description?: string): Promise<IPackage | null> {
    try {
      const packageData = await Package.findById(packageId);
      if (!packageData) {
        throw new Error('Package not found');
      }

      packageData.status = status;
      packageData.trackingHistory.push({
        timestamp: new Date(),
        status,
        location: location || 'Unknown',
        description
      });

      if (status === PACKAGE_STATUSES.DELIVERED) {
        packageData.actualDelivery = new Date();
      }

      await packageData.save();
      await packageData.populate('senderId recipientId', 'name email');

      logger.info(`Package status updated: ${packageData.trackingNumber} -> ${status}`);
      return packageData;
    } catch (error) {
      logger.error('Error updating package status:', error);
      throw error;
    }
  }

  static async calculatePackageCost(packageData: Partial<IPackage>): Promise<number> {
    try {
      if (!packageData.weight || !packageData.dimensions) {
        throw new Error('Weight and dimensions are required for cost calculation');
      }

      const volume = calculateVolume(
        packageData.dimensions.length,
        packageData.dimensions.width,
        packageData.dimensions.height
      );

      const cost = calculateShippingCost(packageData.weight, volume);
      return cost;
    } catch (error) {
      logger.error('Error calculating package cost:', error);
      throw error;
    }
  }

  static async getPackageByTrackingNumber(trackingNumber: string): Promise<IPackage | null> {
    try {
      const packageData = await Package.findOne({ trackingNumber: trackingNumber.toUpperCase() })
        .populate('senderId recipientId', 'name email');
      
      return packageData;
    } catch (error) {
      logger.error('Error getting package by tracking number:', error);
      throw error;
    }
  }

  static async getCustomerPackages(customerId: string, page: number = 1, limit: number = 20): Promise<{ packages: IPackage[], total: number }> {
    try {
      const skip = (page - 1) * limit;

      const packages = await Package.find({
        $or: [
          { senderId: customerId },
          { recipientId: customerId }
        ]
      })
        .populate('senderId recipientId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Package.countDocuments({
        $or: [
          { senderId: customerId },
          { recipientId: customerId }
        ]
      });

      return { packages, total };
    } catch (error) {
      logger.error('Error getting customer packages:', error);
      throw error;
    }
  }

  static async searchPackages(query: any): Promise<IPackage[]> {
    try {
      const packages = await Package.find(query)
        .populate('senderId recipientId createdBy', 'name email')
        .sort({ createdAt: -1 });

      return packages;
    } catch (error) {
      logger.error('Error searching packages:', error);
      throw error;
    }
  }

  static async getPackageAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
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

      return {
        total: totalPackages,
        statusBreakdown,
        dailyPackages
      };
    } catch (error) {
      logger.error('Error getting package analytics:', error);
      throw error;
    }
  }
}
