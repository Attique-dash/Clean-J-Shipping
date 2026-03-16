import { Response, Request } from 'express';
import { ApiKey } from '../../models/ApiKey';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import crypto from 'crypto';
import mongoose from 'mongoose';

interface ApiKeyRequest extends Request {
  body: {
    name?: string;
    permissions?: string[];
    description?: string;
    expiresAt?: string;
    warehouseId?: string;
  };
  user?: any;
}

export class apiKeyController {
  
  // Create new API key for KCD integration
  static async createKCDApiKey(req: ApiKeyRequest, res: Response): Promise<void> {
    try {
      const { name, permissions, description, expiresAt, warehouseId } = req.body;

      // Auto-resolve warehouse if not provided
      let resolvedWarehouseId = warehouseId;
      if (!resolvedWarehouseId) {
        const { Warehouse } = await import('../../models/Warehouse');
        const warehouse = await Warehouse.findOne({ isActive: true }).sort({ isDefault: -1 });
        if (!warehouse) {
          errorResponse(res, 'No active warehouse found. Please create a warehouse first.', 400);
          return;
        }
        resolvedWarehouseId = warehouse._id.toString();
      }

      // Generate API key without kcd prefix
      const apiKey = crypto.randomBytes(32).toString('hex');
      
      const newApiKey = new ApiKey({
        key: apiKey,
        name: name || 'KCD Logistics Webhook',
        permissions: permissions || ['kcd_webhook', 'webhook', 'all'],
        description: description || 'API key for KCD Logistics packing system',
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        warehouseId: new mongoose.Types.ObjectId(resolvedWarehouseId),
        createdBy: req.user?.id || new mongoose.Types.ObjectId()
      });

      await newApiKey.save();

      logger.info(`KCD API key created: ${newApiKey.name}`);

      // Fix for Vercel: ensure HTTPS protocol is used
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const base = `${proto}://${req.get('host')}`;

      successResponse(res, {
        id: newApiKey._id,
        key: apiKey, // Return the key only once
        name: newApiKey.name,
        description: newApiKey.description,
        permissions: newApiKey.permissions,
        isActive: newApiKey.isActive,
        warehouseId: newApiKey.warehouseId,
        createdAt: newApiKey.createdAt,
        nextSteps: {
          step1: 'Copy the "key" value above',
          step2: 'Go to https://pack.kcdlogistics.com → Couriers → Edit → Courier System API tab',
          step3: 'Paste the key into the "API Access Token" field',
          step4: 'Enter these endpoint URLs:',
          endpoints: {
            getCustomers:   `${base}/api/warehouse/customers`,
            addPackage:     `${base}/api/warehouse/packages/add`,
            updatePackage:  `${base}/api/warehouse/packages/:id`,
            deletePackage:  `${base}/api/webhooks/kcd/package-deleted`,
            updateManifest: `${base}/api/webhooks/kcd/manifest-created`,
          },
        },
      }, '✅ KCD API key generated. Copy the "key" value NOW — it will not be shown again.');

    } catch (error) {
      logger.error('Error creating KCD API key:', error);
      errorResponse(res, 'Failed to create API key', 500);
    }
  }

  // List all API keys
  static async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const apiKeys = await ApiKey.find({})
        .select('-key') // Don't expose the actual keys
        .sort({ createdAt: -1 });

      successResponse(res, {
        apiKeys,
        total: apiKeys.length
      }, 'API keys retrieved successfully');

    } catch (error) {
      logger.error('Error listing API keys:', error);
      errorResponse(res, 'Failed to retrieve API keys', 500);
    }
  }

  // Deactivate API key
  static async deactivateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;

      const apiKey = await ApiKey.findByIdAndUpdate(
        keyId,
        { isActive: false },
        { new: true }
      ).populate('warehouseId', 'name');

      if (!apiKey) {
        errorResponse(res, 'API key not found', 404);
        return;
      }

      logger.info(`API key deactivated: ${apiKey.name}`);

      successResponse(res, {
        id: apiKey._id,
        name: apiKey.name,
        warehouseId: apiKey.warehouseId,
        isActive: apiKey.isActive,
        deactivatedAt: new Date()
      }, 'API key deactivated successfully. KCD will no longer be able to use it.');

    } catch (error) {
      logger.error('Error deactivating API key:', error);
      errorResponse(res, 'Failed to deactivate API key', 500);
    }
  }

  // Activate API key
  static async activateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;

      const apiKey = await ApiKey.findByIdAndUpdate(
        keyId,
        { isActive: true },
        { new: true }
      ).populate('warehouseId', 'name');

      if (!apiKey) {
        errorResponse(res, 'API key not found', 404);
        return;
      }

      logger.info(`API key activated: ${apiKey.name}`);

      successResponse(res, {
        id: apiKey._id,
        name: apiKey.name,
        warehouseId: apiKey.warehouseId,
        isActive: apiKey.isActive,
        activatedAt: new Date()
      }, 'API key activated successfully');

    } catch (error) {
      logger.error('Error activating API key:', error);
      errorResponse(res, 'Failed to activate API key', 500);
    }
  }

  // Delete API key
  static async deleteApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;

      const apiKey = await ApiKey.findByIdAndDelete(keyId);

      if (!apiKey) {
        errorResponse(res, 'API key not found', 404);
        return;
      }

      logger.info(`API key deleted: ${apiKey.name}`);

      successResponse(res, {
        id: apiKey._id,
        name: apiKey.name,
        deletedAt: new Date()
      }, 'API key permanently deleted');

    } catch (error) {
      logger.error('Error deleting API key:', error);
      errorResponse(res, 'Failed to delete API key', 500);
    }
  }

  // Get KCD connection instructions
  static async getKCDConnectionInfo(req: Request, res: Response): Promise<void> {
    try {
      // Fix for Vercel: ensure HTTPS protocol is used
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const base = `${proto}://${req.get('host')}`;
      const activeKeys = await ApiKey.find({ isActive: true }).select('-key').sort({ createdAt: -1 });

      const connectionInfo = {
        hasActiveKey: activeKeys.length > 0,
        activeKeyCount: activeKeys.length,
        instruction: activeKeys.length === 0
          ? 'No active key found. Call POST /api/admin/api-keys/kcd to generate one.'
          : 'Active key exists. Use POST /api/admin/api-keys/kcd to get a new key value if needed.',
        kcdPortalFields: {
          apiAccessToken: activeKeys.length > 0
            ? '✅ Key exists — regenerate via POST /api/admin/api-keys/kcd to get the value'
            : '❌ Generate a key first via POST /api/admin/api-keys/kcd',
          getCustomers:   `${base}/api/warehouse/customers`,
          addPackage:     `${base}/api/warehouse/packages/add`,
          updatePackage:  `${base}/api/warehouse/packages/:id`,
          deletePackage:  `${base}/api/webhooks/kcd/package-deleted`,
          updateManifest: `${base}/api/webhooks/kcd/manifest-created`,
        },
      };

      successResponse(res, connectionInfo, 'KCD connection information retrieved successfully');

    } catch (error) {
      logger.error('Error getting KCD connection info:', error);
      errorResponse(res, 'Failed to retrieve connection info', 500);
    }
  }
}
