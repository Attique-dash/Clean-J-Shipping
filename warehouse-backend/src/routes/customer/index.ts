import { Router } from 'express';
import packageRoutes from './packages';
import shippingRoutes from './shipping';
import profileRoutes from './profile';
import shippingAddressesRoutes from './shippingAddresses';

const router = Router();

/**
 * @swagger
 * /api/customer:
 *   get:
 *     summary: Get customer profile
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
// Main customer endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Customer endpoints available',
    endpoints: [
      '/packages',
      '/shipping',
      '/profile',
      '/shipping-addresses'
    ]
  });
});

// Mount customer route modules
router.use('/packages', packageRoutes);
router.use('/shipping', shippingRoutes);
router.use('/profile', profileRoutes);
router.use('/shipping-addresses', shippingAddressesRoutes);

export default router;