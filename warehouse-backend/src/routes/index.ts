import { Router } from 'express';
import authRoutes from './auth';
import warehouseRoutes from './warehouse';
import customerRoutes from './customer';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/warehouse', warehouseRoutes);
router.use('/customer', customerRoutes);

export default router;