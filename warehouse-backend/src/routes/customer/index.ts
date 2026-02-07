import { Router } from 'express';
import packageRoutes from './packages';
import shippingRoutes from './shipping';
import profileRoutes from './profile';
import shippingAddressesRoutes from './ shippingAddresses';

const router = Router();

// Mount customer route modules
router.use('/packages', packageRoutes);
router.use('/shipping', shippingRoutes);
router.use('/profile', profileRoutes);
router.use('/shipping-addresses', shippingAddressesRoutes); // NEW: Warehouse addresses for customers

export default router;