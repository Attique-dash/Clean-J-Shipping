import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Warehouse } from '../../models/Warehouse';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

/**
 * Get warehouse shipping addresses configuration (Admin)
 * GET /api/warehouse/settings/shipping-addresses
 */
export const getShippingAddressesConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const warehouse = await Warehouse.findOne({ 
      isActive: true,
      $or: [
        { isDefault: true },
        { isDefault: { $exists: false } }
      ]
    }).sort({ isDefault: -1 });

    if (!warehouse) {
      errorResponse(res, 'No warehouse found', 404);
      return;
    }

    const config = {
      warehouseId: warehouse._id,
      warehouseName: warehouse.name,
      companyAbbreviation: warehouse.companyAbbreviation || 'CJS',
      airAddress: warehouse.airAddress || null,
      seaAddress: warehouse.seaAddress || null,
      chinaAddress: warehouse.chinaAddress || null
    };

    successResponse(res, config, 'Shipping addresses configuration retrieved');
  } catch (error) {
    logger.error('Error getting shipping addresses config:', error);
    errorResponse(res, 'Failed to get shipping addresses configuration');
  }
};

/**
 * Update warehouse shipping addresses (Admin)
 * PUT /api/warehouse/settings/shipping-addresses
 */
export const updateShippingAddresses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { airAddress, seaAddress, chinaAddress, companyAbbreviation } = req.body;

    const warehouse = await Warehouse.findOne({ 
      isActive: true,
      $or: [
        { isDefault: true },
        { isDefault: { $exists: false } }
      ]
    }).sort({ isDefault: -1 });

    if (!warehouse) {
      errorResponse(res, 'No warehouse found', 404);
      return;
    }

    // Update addresses
    if (airAddress) {
      warehouse.airAddress = airAddress;
    }

    if (seaAddress) {
      warehouse.seaAddress = seaAddress;
    }

    if (chinaAddress) {
      warehouse.chinaAddress = chinaAddress;
    }

    if (companyAbbreviation) {
      // Validate format (2-5 uppercase letters)
      if (!/^[A-Z]{2,5}$/.test(companyAbbreviation)) {
        errorResponse(res, 'Company abbreviation must be 2-5 uppercase letters', 400);
        return;
      }
      warehouse.companyAbbreviation = companyAbbreviation;
    }

    await warehouse.save();

    logger.info(`Shipping addresses updated for warehouse: ${warehouse.name}`);
    successResponse(res, {
      warehouseId: warehouse._id,
      companyAbbreviation: warehouse.companyAbbreviation,
      airAddress: warehouse.airAddress,
      seaAddress: warehouse.seaAddress,
      chinaAddress: warehouse.chinaAddress
    }, 'Shipping addresses updated successfully');

  } catch (error) {
    logger.error('Error updating shipping addresses:', error);
    errorResponse(res, 'Failed to update shipping addresses');
  }
};

/**
 * Update Air shipping address only
 * PUT /api/warehouse/settings/shipping-addresses/air
 */
export const updateAirAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const addressData = req.body;

    const warehouse = await Warehouse.findOne({ isDefault: true });
    if (!warehouse) {
      errorResponse(res, 'No default warehouse found', 404);
      return;
    }

    warehouse.airAddress = addressData;
    await warehouse.save();

    logger.info(`Air shipping address updated for ${warehouse.name}`);
    successResponse(res, warehouse.airAddress, 'Air shipping address updated');
  } catch (error) {
    logger.error('Error updating air address:', error);
    errorResponse(res, 'Failed to update air shipping address');
  }
};

/**
 * Update Sea shipping address only
 * PUT /api/warehouse/settings/shipping-addresses/sea
 */
export const updateSeaAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const addressData = req.body;

    const warehouse = await Warehouse.findOne({ isDefault: true });
    if (!warehouse) {
      errorResponse(res, 'No default warehouse found', 404);
      return;
    }

    warehouse.seaAddress = addressData;
    await warehouse.save();

    logger.info(`Sea shipping address updated for ${warehouse.name}`);
    successResponse(res, warehouse.seaAddress, 'Sea shipping address updated');
  } catch (error) {
    logger.error('Error updating sea address:', error);
    errorResponse(res, 'Failed to update sea shipping address');
  }
};

/**
 * Update China shipping address only
 * PUT /api/warehouse/settings/shipping-addresses/china
 */
export const updateChinaAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const addressData = req.body;

    const warehouse = await Warehouse.findOne({ isDefault: true });
    if (!warehouse) {
      errorResponse(res, 'No default warehouse found', 404);
      return;
    }

    warehouse.chinaAddress = addressData;
    await warehouse.save();

    logger.info(`China shipping address updated for ${warehouse.name}`);
    successResponse(res, warehouse.chinaAddress, 'China shipping address updated');
  } catch (error) {
    logger.error('Error updating china address:', error);
    errorResponse(res, 'Failed to update China shipping address');
  }
};

/**
 * Update company abbreviation (for mailbox codes)
 * PUT /api/warehouse/settings/company-abbreviation
 */
export const updateCompanyAbbreviation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { abbreviation } = req.body;

    if (!abbreviation) {
      errorResponse(res, 'Abbreviation is required', 400);
      return;
    }

    if (!/^[A-Z]{2,5}$/.test(abbreviation)) {
      errorResponse(res, 'Abbreviation must be 2-5 uppercase letters', 400);
      return;
    }

    const warehouse = await Warehouse.findOne({ isDefault: true });
    if (!warehouse) {
      errorResponse(res, 'No default warehouse found', 404);
      return;
    }

    warehouse.companyAbbreviation = abbreviation;
    await warehouse.save();

    logger.info(`Company abbreviation updated to: ${abbreviation}`);
    successResponse(res, { 
      companyAbbreviation: warehouse.companyAbbreviation 
    }, 'Company abbreviation updated');
  } catch (error) {
    logger.error('Error updating company abbreviation:', error);
    errorResponse(res, 'Failed to update company abbreviation');
  }
};