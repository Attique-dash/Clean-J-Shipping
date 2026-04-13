import { Router } from 'express';
import authRoutes from './auth';
import warehouseRoutes from './warehouse';
import customerRoutes from './customer';
import adminRoutes from './admin';
import kcdWebhookRoutes from './webhooks/kcd';
import kcdRoutes from './kcd';
import courierRoutes from './courier';
import testEmailRoutes from './test/email';
import { ensureDatabaseConnection } from '../middleware/databaseConnection';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: API health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 version:
 *                   type: string
 */
// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Debug endpoint - check KCD_API_KEY env var
router.get('/debug/kcd-env', (req, res) => {
  const kcdApiKey = process.env.KCD_API_KEY;
  res.json({
    kcdApiKeyExists: !!kcdApiKey,
    kcdApiKeyLength: kcdApiKey ? kcdApiKey.length : 0,
    kcdApiKeyPrefix: kcdApiKey ? kcdApiKey.substring(0, 15) + '...' : null,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Apply database connection middleware to all routes except health
router.use('/auth', ensureDatabaseConnection, authRoutes);
router.use('/warehouse', ensureDatabaseConnection, warehouseRoutes);
router.use('/customer', ensureDatabaseConnection, customerRoutes);
router.use('/admin', ensureDatabaseConnection, adminRoutes);
router.use('/webhooks/kcd', ensureDatabaseConnection, kcdWebhookRoutes);
router.use('/kcd', ensureDatabaseConnection, kcdRoutes);
router.use('/Courier', ensureDatabaseConnection, courierRoutes);
router.use('/test/email', ensureDatabaseConnection, testEmailRoutes);

export default router;