import { Router } from 'express';
import { KCDWebhookController } from '../../controllers/kcd/kcdWebhookController';
import { validateKCDWebhook } from '../../middleware/kcdWebhookAuth';

const router = Router();

/**
 * @swagger
 * /api/webhooks/kcd/package-created:
 *   post:
 *     summary: KCD Logistics - Package Created Webhook
 *     description: Webhook endpoint for KCD Logistics to notify when a package is created in their system
 *     tags: [KCD Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackingNumber, courierCode, packageData]
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 description: KCD tracking number
 *               courierCode:
 *                 type: string
 *                 description: Courier code (CLEAN)
 *               packageData:
 *                 type: object
 *                 description: Package details from KCD
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Event timestamp
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid API key
 *       400:
 *         description: Invalid webhook data
 */
router.post('/package-created', 
  validateKCDWebhook,
  KCDWebhookController.packageCreated
);

/**
 * @swagger
 * /api/webhooks/kcd/package-updated:
 *   post:
 *     summary: KCD Logistics - Package Updated Webhook
 *     description: Webhook endpoint for KCD Logistics to notify when a package status is updated
 *     tags: [KCD Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackingNumber, status, timestamp]
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 description: KCD tracking number
 *               status:
 *                 type: string
 *                 enum: [received, in_transit, out_for_delivery, delivered, pending, customs, returned]
 *                 description: New package status
 *               location:
 *                 type: string
 *                 description: Current package location
 *               notes:
 *                 type: string
 *                 description: Status update notes
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Event timestamp
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid API key
 *       400:
 *         description: Invalid webhook data
 */
router.post('/package-updated', 
  validateKCDWebhook,
  KCDWebhookController.packageUpdated
);

/**
 * @swagger
 * /api/webhooks/kcd/package-delivered:
 *   post:
 *     summary: KCD Logistics - Package Delivered Webhook
 *     description: Webhook endpoint for KCD Logistics to notify when a package is delivered
 *     tags: [KCD Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackingNumber, deliveryData, timestamp]
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 description: KCD tracking number
 *               deliveryData:
 *                 type: object
 *                 properties:
 *                   deliveredAt:
 *                     type: string
 *                     format: date-time
 *                   deliveredBy:
 *                     type: string
 *                   signature:
 *                     type: string
 *                   photoUrl:
 *                     type: string
 *               recipient:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   signature:
 *                     type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Event timestamp
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid API key
 *       400:
 *         description: Invalid webhook data
 */
router.post('/package-delivered', 
  validateKCDWebhook,
  KCDWebhookController.packageDelivered
);

/**
 * @swagger
 * /api/webhooks/kcd/package-deleted:
 *   post:
 *     summary: KCD Logistics - Package Deleted Webhook
 *     description: Webhook endpoint for KCD Logistics to notify when a package is deleted in their system
 *     tags: [KCD Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackingNumber, courierCode]
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 description: KCD tracking number
 *               courierCode:
 *                 type: string
 *                 description: Courier code (CLEAN)
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Event timestamp
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid API key
 *       400:
 *         description: Invalid webhook data
 */
router.post('/package-deleted', 
  validateKCDWebhook,
  KCDWebhookController.packageDeleted
);

/**
 * @swagger
 * /api/webhooks/kcd/manifest-created:
 *   post:
 *     summary: KCD Logistics - Manifest Created Webhook
 *     description: Webhook endpoint for KCD Logistics to notify when a manifest is created
 *     tags: [KCD Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [manifestId, courierCode, packages, timestamp]
 *             properties:
 *               manifestId:
 *                 type: string
 *                 description: KCD manifest ID
 *               courierCode:
 *                 type: string
 *                 description: Courier code (CLEAN)
 *               packages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of tracking numbers
 *               departureDate:
 *                 type: string
 *                 format: date
 *                 description: Manifest departure date
 *               arrivalDate:
 *                 type: string
 *                 format: date
 *                 description: Estimated arrival date
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Event timestamp
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid API key
 *       400:
 *         description: Invalid webhook data
 */
router.post('/manifest-created', 
  validateKCDWebhook,
  KCDWebhookController.manifestCreated
);

/**
 * @swagger
 * /api/webhooks/kcd/test:
 *   post:
 *     summary: KCD Logistics - Test Webhook Connection
 *     description: Test endpoint to verify webhook connectivity between KCD and our backend
 *     tags: [KCD Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               test:
 *                 type: boolean
 *                 description: Test flag
 *               message:
 *                 type: string
 *                 description: Test message
 *     responses:
 *       200:
 *         description: Connection test successful
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
 *                   format: date-time
 *       401:
 *         description: Invalid API key
 */
router.post('/test', 
  validateKCDWebhook,
  KCDWebhookController.testConnection
);

export default router;
