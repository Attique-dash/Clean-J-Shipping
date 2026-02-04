import { Router } from 'express';
import packageRoutes from './packages';
import shippingRoutes from './shipping';
import profileRoutes from './profile';

const router = Router();

// Mount customer route modules
router.use('/packages', packageRoutes);
router.use('/shipping', shippingRoutes);
router.use('/profile', profileRoutes);

export default router;
