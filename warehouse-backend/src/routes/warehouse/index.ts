import { Router } from 'express';
import packages from './packages';
import customers from './customers';
import messages from './messages';
import manifests from './manifests';
import inventory from './inventory';
import analytics from './analytics';
import account from './account';
import settings from './settings';
import reports from './reports';
import bulkUpload from './bulkUpload';
import staff from './staff';
import addresses from './addresses';

const router = Router();

/**
 * @swagger
 * /api/warehouse:
 *   get:
 *     summary: Get all warehouses
 *     tags: [Warehouse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of warehouses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Warehouse'
 */
// Main warehouse endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Warehouse endpoints available',
    endpoints: [
      '/packages',
      '/customers', 
      '/messages',
      '/manifests',
      '/inventory',
      '/analytics',
      '/account',
      '/settings',
      '/reports',
      '/bulk-upload',
      '/staff',
      '/addresses'
    ]
  });
});

// Mount all warehouse routes
router.use('/packages', packages);
router.use('/customers', customers);
router.use('/messages', messages);
router.use('/manifests', manifests);
router.use('/inventory', inventory);
router.use('/analytics', analytics);
router.use('/account', account);
router.use('/settings', settings);
router.use('/reports', reports);
router.use('/bulk-upload', bulkUpload);
router.use('/staff', staff);
router.use('/addresses', addresses);

export default router;
