import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';

export const validateAddPackage = [
  // Core Tasoko API required fields
  body('PackageID')
    .optional()
    .isUUID()
    .withMessage('PackageID must be a valid UUID'),
  
  body('CourierID')
    .optional()
    .isUUID()
    .withMessage('CourierID must be a valid UUID'),
  
  body('TrackingNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 50 })
    .withMessage('TrackingNumber must be 10-50 characters'),
  
  body('ControlNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('ControlNumber is required'),
  
  body('FirstName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('FirstName is required'),
  
  body('LastName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('LastName is required'),
  
  body('UserCode')
    .isString()
    .trim()
    .matches(/^[A-Z]{2,6}-\d{3,5}$/)
    .withMessage('UserCode must be in format CLEAN-XXXX (3-5 digits)'),
  
  body('Weight')
    .isFloat({ min: 0 })
    .withMessage('Weight must be greater than or equal to 0'),
  
  body('Shipper')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Shipper is required'),
  
  body('EntryStaff')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('EntryStaff cannot exceed 100 characters'),
  
  body('EntryDate')
    .optional()
    .isISO8601()
    .withMessage('EntryDate must be a valid date'),
  
  body('EntryDateTime')
    .optional()
    .isISO8601()
    .withMessage('EntryDateTime must be a valid date'),
  
  body('Branch')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Branch is required'),
  
  body('APIToken')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('APIToken cannot exceed 500 characters'),
  
  body('ManifestCode')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('ManifestCode cannot exceed 100 characters'),
  
  body('CollectionCode')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('CollectionCode cannot exceed 100 characters'),
  
  body('Description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('HSCode')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('HSCode cannot exceed 20 characters'),
  
  body('Unknown')
    .optional()
    .isBoolean()
    .withMessage('Unknown must be a boolean'),
  
  body('AIProcessed')
    .optional()
    .isBoolean()
    .withMessage('AIProcessed must be a boolean'),
  
  body('OriginalHouseNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('OriginalHouseNumber cannot exceed 100 characters'),
  
  body('Cubes')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cubes must be greater than or equal to 0'),
  
  body('Length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be greater than or equal to 0'),
  
  body('Width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be greater than or equal to 0'),
  
  body('Height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be greater than or equal to 0'),
  
  body('Pieces')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Pieces must be at least 1'),
  
  body('Discrepancy')
    .optional()
    .isBoolean()
    .withMessage('Discrepancy must be a boolean'),
  
  body('DiscrepancyDescription')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('DiscrepancyDescription cannot exceed 500 characters'),
  
  body('ServiceTypeID')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('ServiceTypeID cannot exceed 100 characters'),
  
  body('HazmatCodeID')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('HazmatCodeID cannot exceed 100 characters'),
  
  body('Coloaded')
    .optional()
    .isBoolean()
    .withMessage('Coloaded must be a boolean'),
  
  body('ColoadIndicator')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('ColoadIndicator cannot exceed 50 characters'),
  
  // Legacy fields for backward compatibility
  body('trackingNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Tracking number must be 10-20 alphanumeric characters')
    .matches(/^[A-Z0-9]{10,20}$/)
    .withMessage('Tracking number must contain only uppercase letters and numbers'),
  
  body('userCode')
    .optional()
    .isString()
    .trim()
    .matches(/^[A-Z]{2,6}-\d{3,5}$/)
    .withMessage('User code must be in format CLEAN-XXXX (3-5 digits)'),
  
  body('serviceMode')
    .optional()
    .isIn(['air', 'ocean', 'local'])
    .withMessage('Service mode must be air, ocean, or local'),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  
  body('dimensions.unit')
    .optional()
    .isIn(['cm', 'in'])
    .withMessage('Unit must be cm or in'),
  
  body('recipient.name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Recipient name must be between 1 and 100 characters'),
  
  body('recipient.email')
    .optional()
    .isEmail()
    .withMessage('Valid recipient email is required'),
  
  body('recipient.phone')
    .optional()
    .isString()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Valid phone number is required'),
  
  body('recipient.address')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
  
  body('warehouseLocation')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Warehouse location must be between 1 and 200 characters'),
  
  body('customsRequired')
    .optional()
    .isBoolean()
    .withMessage('Customs required must be a boolean'),
  
  body('isFragile')
    .optional()
    .isBoolean()
    .withMessage('Fragile flag must be a boolean'),
  
  body('isHazardous')
    .optional()
    .isBoolean()
    .withMessage('Hazardous flag must be a boolean'),
  
  body('requiresSignature')
    .optional()
    .isBoolean()
    .withMessage('Signature required flag must be a boolean'),
  
  body('specialInstructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters'),
  
  handleValidationErrors
];

export const validateUpdatePackage = [
  body('weight')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Weight must be greater than 0 and a valid number'),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  
  body('dimensions.unit')
    .optional()
    .isIn(['cm', 'in'])
    .withMessage('Unit must be cm or in'),
  
  body('recipient.name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Recipient name must be between 1 and 100 characters'),
  
  body('recipient.email')
    .optional()
    .isEmail()
    .withMessage('Valid recipient email is required'),
  
  body('recipient.phone')
    .optional()
    .isString()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Valid phone number is required'),
  
  body('recipient.address')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
  
  body('warehouseLocation')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Warehouse location must be between 1 and 200 characters'),
  
  body('specialInstructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters'),
  
  handleValidationErrors
];

export const validateUpdatePackageStatus = [
  body('status')
    .isIn(['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned'])
    .withMessage('Status must be one of: received, in_transit, out_for_delivery, delivered, pending, customs, returned'),
  
  body('location')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Location must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('estimatedDelivery')
    .optional()
    .isISO8601()
    .withMessage('Estimated delivery must be a valid date'),
  
  handleValidationErrors
];
