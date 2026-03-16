import axios from 'axios';
import { IPackage } from '../models/Package';
import { logger } from '../utils/logger';

export class TasokoService {
  private static baseUrl = process.env.TASOKO_API_URL || '';
  private static apiToken = process.env.TASOKO_API_TOKEN || '';

  /**
   * Check if Tasoko service is properly configured
   */
  static isConfigured(): boolean {
    return !!(this.baseUrl && this.apiToken);
  }

  /**
   * Get configuration status for logging
   */
  static getConfigStatus(): { baseUrl: boolean; apiToken: boolean; fullyConfigured: boolean } {
    return {
      baseUrl: !!this.baseUrl,
      apiToken: !!this.apiToken,
      fullyConfigured: this.isConfigured()
    };
  }

  /**
   * Send package data to Tasoko after creation
   * Endpoint: Add Package (PDF page 3)
   */
  static async sendPackageCreated(packageData: IPackage): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        const config = this.getConfigStatus();
        logger.warn('Tasoko API not configured, skipping webhook', {
          trackingNumber: packageData.trackingNumber,
          configStatus: config,
          missingVars: [
            !config.baseUrl ? 'TASOKO_API_URL' : null,
            !config.apiToken ? 'TASOKO_API_TOKEN' : null
          ].filter(Boolean)
        });
        return false;
      }

      const payload = this.formatPackagePayload(packageData);
      
      const response = await axios.post(
        `${this.baseUrl}/api/packages/add`,
        [payload], // Array format as per spec
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': this.apiToken
          },
          timeout: 10000
        }
      );

      // ✅ ADD THIS - Validate response
      if (!response || response.status !== 200) {
        logger.error(`Tasoko API returned status ${response?.status}`);
        return false;
      }

      logger.info(`Package sent to Tasoko: ${packageData.trackingNumber}`);
      return true;

    } catch (error: any) {
      logger.error('Failed to send package to Tasoko:', {
        message: error.message,
        trackingNumber: packageData.trackingNumber,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * Send package update to Tasoko
   * Endpoint: Update Package (PDF page 4)
   */
  static async sendPackageUpdated(packageData: IPackage): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        const config = this.getConfigStatus();
        logger.warn('Tasoko API not configured, skipping package update', {
          trackingNumber: packageData.trackingNumber,
          configStatus: config,
          missingVars: [
            !config.baseUrl ? 'TASOKO_API_URL' : null,
            !config.apiToken ? 'TASOKO_API_TOKEN' : null
          ].filter(Boolean)
        });
        return false;
      }

      const payload = this.formatPackagePayload(packageData);
      
      const response = await axios.post(
        `${this.baseUrl}/api/packages/edit`,
        [payload],
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': this.apiToken
          },
          timeout: 10000
        }
      );

      // ✅ ADD THIS - Validate response
      if (!response || response.status !== 200) {
        logger.error(`Tasoko API returned status ${response?.status}`);
        return false;
      }

      logger.info(`Package update sent to Tasoko: ${packageData.trackingNumber}`);
      return true;

    } catch (error: any) {
      logger.error('Failed to send update to Tasoko:', {
        message: error.message,
        trackingNumber: packageData.trackingNumber,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * Send package deletion to Tasoko
   * Endpoint: Delete Package (PDF page 5)
   */
  static async sendPackageDeleted(packageData: IPackage): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        const config = this.getConfigStatus();
        logger.warn('Tasoko API not configured, skipping package deletion', {
          trackingNumber: packageData.trackingNumber,
          configStatus: config,
          missingVars: [
            !config.baseUrl ? 'TASOKO_API_URL' : null,
            !config.apiToken ? 'TASOKO_API_TOKEN' : null
          ].filter(Boolean)
        });
        return false;
      }

      const payload = this.formatPackagePayload(packageData);
      
      const response = await axios.post(
        `${this.baseUrl}/api/packages/delete`,
        [payload],
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': this.apiToken
          },
          timeout: 10000
        }
      );

      // Validate response
      if (!response || response.status !== 200) {
        logger.error(`Tasoko API returned status ${response?.status}`);
        return false;
      }

      logger.info(`Package deletion sent to Tasoko: ${packageData.trackingNumber}`);
      return true;

    } catch (error: any) {
      logger.error('Failed to send deletion to Tasoko:', {
        message: error.message,
        trackingNumber: packageData.trackingNumber,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * Format package data to match Tasoko API specification (PDF page 3)
   */
  private static formatPackagePayload(pkg: any) {
    const payload = {
      PackageID: pkg._id?.toString() || '',
      CourierID: pkg.courierId || '',
      ManifestID: pkg.manifestId || '',
      CollectionID: pkg.collectionId || '',
      TrackingNumber: pkg.trackingNumber,
      ControlNumber: pkg.controlNumber || '',
      FirstName: pkg.recipient?.name?.split(' ')[0] || '',
      LastName: pkg.recipient?.name?.split(' ').slice(1).join(' ') || '',
      UserCode: pkg.userCode,
      Weight: pkg.weight || 0,
      Shipper: pkg.shipper || '',
      EntryStaff: pkg.entryStaff || '',
      EntryDate: pkg.entryDate || new Date().toISOString().split('T')[0],
      EntryDateTime: pkg.entryDateTime || new Date().toISOString(),
      Branch: pkg.branch || '',
      Claimed: pkg.claimed || false,
      ShowControls: pkg.showControls || false,
      Description: pkg.description || '',
      HSCode: pkg.hsCode || '',
      Unknown: pkg.unknown || false,
      AIProcessed: pkg.aiProcessed || false,
      OriginalHouseNumber: pkg.originalHouseNumber || '',
      Cubes: pkg.cubes || 0,
      Length: pkg.dimensions?.length || 0,
      Width: pkg.dimensions?.width || 0,
      Height: pkg.dimensions?.height || 0,
      Pieces: pkg.pieces || 1,
      Discrepancy: pkg.discrepancy || false,
      DiscrepancyDescription: pkg.discrepancyDescription || '',
      ServiceTypeID: pkg.serviceTypeId || '',
      HazmatCodeID: pkg.hazmatCodeId || '',
      Coloaded: pkg.coloaded || false,
      ColoadIndicator: pkg.coloadIndicator || '',
      PackageStatus: pkg.packageStatus || 0,
      PackagePayments: pkg.packagePayments || ''
    };

    // Only add APIToken if it's configured and not empty
    if (this.apiToken && this.apiToken.trim() !== '') {
      (payload as any).APIToken = this.apiToken;
    }

    return payload;
  }
}
