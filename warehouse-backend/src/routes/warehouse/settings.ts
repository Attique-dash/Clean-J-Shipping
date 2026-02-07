import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as shippingAddressSettingsController from '../../controllers/warehouse/shippingAddressSettingsController';
import * as settingsController from '../../controllers/warehouse/settingsController';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// Shipping Addresses Configuration (NEW for Clean J Shipping)
router.get('/shipping-addresses', 
  asyncHandler(shippingAddressSettingsController.getShippingAddressesConfig)
);

router.put('/shipping-addresses', 
  authorize('admin', 'warehouse'),
  asyncHandler(shippingAddressSettingsController.updateShippingAddresses)
);

router.put('/shipping-addresses/air', 
  authorize('admin', 'warehouse'),
  asyncHandler(shippingAddressSettingsController.updateAirAddress)
);

router.put('/shipping-addresses/sea', 
  authorize('admin', 'warehouse'),
  asyncHandler(shippingAddressSettingsController.updateSeaAddress)
);

router.put('/shipping-addresses/china', 
  authorize('admin', 'warehouse'),
  asyncHandler(shippingAddressSettingsController.updateChinaAddress)
);

router.put('/company-abbreviation', 
  authorize('admin'),
  asyncHandler(shippingAddressSettingsController.updateCompanyAbbreviation)
);

// System settings (admin only)
router.get('/system', 
  authorize('admin'), 
  asyncHandler(settingsController.getSystemSettings)
);

router.put('/system', 
  authorize('admin'), 
  asyncHandler(settingsController.updateSystemSettings)
);

// Warehouse settings
router.get('/warehouse', 
  asyncHandler(settingsController.getWarehouseSettings)
);

router.put('/warehouse', 
  authorize('admin', 'warehouse'), 
  asyncHandler(settingsController.updateWarehouseSettings)
);

// Notification settings
router.get('/notifications', 
  asyncHandler(settingsController.getNotificationSettings)
);

router.put('/notifications', 
  asyncHandler(settingsController.updateNotificationSettings)
);

export default router;