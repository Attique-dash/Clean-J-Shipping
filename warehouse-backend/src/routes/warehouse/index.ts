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

const router = Router();

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

export default router;
