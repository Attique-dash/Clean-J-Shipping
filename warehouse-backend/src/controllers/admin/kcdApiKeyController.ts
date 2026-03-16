import { Request, Response } from 'express';
import { ApiKey } from '../../models/ApiKey';
import { AuthRequest } from '../../middleware/auth';
import { generateApiKey } from '../../middleware/authKcd';
import { logger } from '../../utils/logger';

// ─────────────────────────────────────────────────────────────
// POST /api/admin/api-keys/kcd
// Generates a NEW plain 48-char API key for KCD Logistics
// ⚠️  Shown ONLY ONCE — copy it immediately into the KCD portal
// ─────────────────────────────────────────────────────────────
export const generateKCDApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const {
      courierCode = 'CLEAN',
      expiresIn = 365,
      description = 'KCD Logistics Integration API Key'
    } = req.body;

    if (!courierCode || typeof courierCode !== 'string' || courierCode.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Courier code is required' });
      return;
    }

    // Generate plain 48-char alphanumeric key — NO PREFIX
    // KCD portal expects a plain token, not "kcd_live_xxx" or any other prefix
    const rawApiKey = generateApiKey();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    const kcdKeyRecord = await ApiKey.create({
      key: rawApiKey,               // ← stored as-is, no prefix
      name: `KCD ${courierCode.trim().toUpperCase()} Integration`,
      description: description?.trim() || 'KCD Logistics Integration API Key',
      courierCode: courierCode.trim().toUpperCase(),
      permissions: ['kcd_integration'],
      expiresAt,
      isActive: true,
      createdBy: adminUser._id,
      usageCount: 0
    });

    logger.info(`KCD API key generated`, {
      courierCode: kcdKeyRecord.courierCode,
      keyId: kcdKeyRecord._id,
      createdBy: adminUser.email
    });

    // ⚠️ Return the raw key ONCE ONLY
    res.status(201).json({
      success: true,
      message: '✅ KCD API key generated. Copy the key NOW — it will NOT be shown again.',
      data: {
        apiKey: rawApiKey,   // plain 48-char token, no prefix — paste this directly into KCD portal
        courierCode: kcdKeyRecord.courierCode,
        description: kcdKeyRecord.description,
        expiresAt: kcdKeyRecord.expiresAt,
        createdAt: kcdKeyRecord.createdAt,
        keyLength: rawApiKey.length,
        note: 'Paste this key as-is into the KCD portal "API Access Token" field. Do NOT add "Bearer " or any prefix.',
        nextSteps: [
          '1. Copy the apiKey value above (plain token, no prefix)',
          '2. Go to https://pack.kcdlogistics.com',
          '3. Admin → Couriers → CLEAN → Edit',
          '4. Go to "Courier System API" tab',
          '5. Paste the key into the "API Access Token" field',
          '6. Save and test'
        ]
      }
    });
  } catch (error: any) {
    logger.error('generateKCDApiKey error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate API key',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/api-keys/list
// Lists all KCD API keys (key value is NEVER returned here)
// ─────────────────────────────────────────────────────────────
export const listApiKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const keys = await ApiKey.find({ courierCode: { $exists: true } })
      .select('-key')   // NEVER return actual key in list
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        total: keys.length,
        active: keys.filter(k => k.isActive).length,
        apiKeys: keys.map(key => ({
          _id: key._id,
          courierCode: key.courierCode,
          description: key.description,
          isActive: key.isActive,
          expiresAt: key.expiresAt,
          createdAt: key.createdAt,
          lastUsed: key.lastUsed,
          usageCount: key.usageCount,
          createdBy: key.createdBy,
          isExpired: key.expiresAt ? key.expiresAt < new Date() : false
        }))
      }
    });
  } catch (error: any) {
    logger.error('listApiKeys error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list API keys' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/api-keys/:keyId/deactivate
// ─────────────────────────────────────────────────────────────
export const deactivateApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { keyId } = req.params;
    const key = await ApiKey.findByIdAndUpdate(
      keyId,
      { isActive: false },
      { new: true }
    ).select('-key');

    if (!key) {
      res.status(404).json({ success: false, message: 'API key not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'API key deactivated. KCD will no longer be able to use it.',
      data: key
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to deactivate API key' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/api-keys/:keyId/activate
// ─────────────────────────────────────────────────────────────
export const activateApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { keyId } = req.params;
    const key = await ApiKey.findByIdAndUpdate(
      keyId,
      { isActive: true },
      { new: true }
    ).select('-key');

    if (!key) {
      res.status(404).json({ success: false, message: 'API key not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'API key reactivated', data: key });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to activate API key' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/api-keys/:keyId
// ─────────────────────────────────────────────────────────────
export const deleteApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { keyId } = req.params;
    const key = await ApiKey.findByIdAndDelete(keyId);

    if (!key) {
      res.status(404).json({ success: false, message: 'API key not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'API key permanently deleted',
      data: { deletedKeyId: key._id, courierCode: key.courierCode }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete API key' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/api-keys/kcd-info
// Returns the exact URLs to paste into the KCD portal
// ─────────────────────────────────────────────────────────────
export const getKCDConnectionInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    // Build base URL (works on Vercel and locally)
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const base = `${proto}://${req.get('host')}`;

    const activeKeys = await ApiKey.find({
      isActive: true,
      courierCode: { $exists: true }
    }).select('-key').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        hasActiveKey: activeKeys.length > 0,
        activeKeyCount: activeKeys.length,
        instruction: activeKeys.length === 0
          ? '❌ No active key. Generate one via POST /api/admin/api-keys/kcd'
          : '✅ Active key exists. Get the value by generating a new one via POST /api/admin/api-keys/kcd',
        kcdPortalConfiguration: {
          portalUrl: 'https://pack.kcdlogistics.com/',
          loginCredentials: { username: 'CleanJShip', password: 'CleanJ$h!p' },
          steps: [
            'Login → Admin → Couriers → CLEAN → Edit',
            'Go to "Courier System API" tab',
            'Paste plain API token (48 chars, no prefix) into "API Access Token" field',
            'Fill in the endpoint URLs below',
            'Click Save, then test each endpoint'
          ],
          apiTokenNote: 'Use the plain key from POST /api/admin/api-keys/kcd — NO "Bearer" prefix, NO "kcd_live_" prefix',
          endpoints: {
            getCustomers:   `${base}/api/kcd/customers`,
            addPackage:     `${base}/api/kcd/packages/add`,
            updatePackage:  `${base}/api/kcd/packages/{trackingNumber}`,
            deletePackage:  `${base}/api/kcd/packages/{trackingNumber}/delete`,
            updateManifest: `${base}/api/kcd/packages/{trackingNumber}/manifest`,
          }
        },
        activeKeys: activeKeys.map(k => ({
          _id: k._id,
          courierCode: k.courierCode,
          createdAt: k.createdAt,
          expiresAt: k.expiresAt,
          usageCount: k.usageCount,
          lastUsed: k.lastUsed
        }))
      }
    });
  } catch (error: any) {
    logger.error('getKCDConnectionInfo error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get KCD connection info' });
  }
};