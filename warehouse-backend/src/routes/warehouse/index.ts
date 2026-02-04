import { Router } from 'express';
import packageRoutes from './packages';
import customerRoutes from './customers';
import messageRoutes from './messages';
import manifestRoutes from './manifests';
import inventoryRoutes from './inventory';
import analyticsRoutes from './analytics';
import accountRoutes from './account';
import settingsRoutes from './settings';
import reportsRoutes from './reports';

const router = Router();

// Mount warehouse route modules
router.use('/packages', packageRoutes);
router.use('/customers', customerRoutes);
router.use('/messages', messageRoutes);
router.use('/manifests', manifestRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/account', accountRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportsRoutes);

export default router;
