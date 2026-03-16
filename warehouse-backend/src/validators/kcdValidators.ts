import { body, query, validationResult } from 'express-validator';

// Validation for generating API key
export const generateApiKeyValidation = [
  body('courierCode')
    .notEmpty()
    .withMessage('Courier code is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Courier code must be 2-20 characters')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Courier code can only contain uppercase letters, numbers, and hyphens'),
  
  body('expiresIn')
    .optional()
    .isInt({ min: 1, max: 3650 })
    .withMessage('Expires in must be between 1 and 3650 days'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

// Validation for adding package - complete warehouse fields
export const addPackageValidation = [
  body('trackingNumber')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tracking number must be 3-50 characters'),
  
  body('userCode')
    .notEmpty()
    .withMessage('Customer code is required')
    .matches(/^[A-Z]{2,6}-\d{3,5}$/)
    .withMessage('Customer code must be in format CLEAN-XXXX (3-5 digits)'),
  
  body('weight')
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('shipper')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Shipper name cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('itemDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Item description cannot exceed 500 characters'),
  
  body('serviceMode')
    .optional()
    .isIn(['air', 'ocean', 'local'])
    .withMessage('Service mode must be air, ocean, or local'),
  
  body('status')
    .optional()
    .isIn(['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned', 'at_warehouse', 'processing', 'ready_for_pickup'])
    .withMessage('Invalid package status'),
  
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
    .withMessage('Unit must be either cm or in'),
  
  body('senderName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Sender name cannot exceed 100 characters'),
  
  body('senderEmail')
    .optional()
    .isEmail()
    .withMessage('Sender email must be valid'),
  
  body('senderPhone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Sender phone must be valid'),
  
  body('senderAddress')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Sender address cannot exceed 500 characters'),
  
  body('senderCountry')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Sender country cannot exceed 100 characters'),
  
  body('recipient.name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Recipient name cannot exceed 100 characters'),
  
  body('recipient.email')
    .optional()
    .isEmail()
    .withMessage('Recipient email must be valid'),
  
  body('recipient.phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Recipient phone must be valid'),
  
  body('recipient.address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Recipient address cannot exceed 500 characters'),
  
  body('itemValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item value must be a positive number'),
  
  body('specialInstructions')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Special instructions cannot exceed 1000 characters'),
  
  body('isFragile')
    .optional()
    .isBoolean()
    .withMessage('Is fragile must be boolean'),
  
  body('isHazardous')
    .optional()
    .isBoolean()
    .withMessage('Is hazardous must be boolean'),
  
  body('requiresSignature')
    .optional()
    .isBoolean()
    .withMessage('Requires signature must be boolean'),
  
  body('customsRequired')
    .optional()
    .isBoolean()
    .withMessage('Customs required must be boolean'),
  
  body('customsStatus')
    .optional()
    .isIn(['not_required', 'pending', 'cleared'])
    .withMessage('Customs status must be not_required, pending, or cleared'),
  
  body('entryDate')
    .optional()
    .isISO8601()
    .withMessage('Entry date must be a valid date')
];

// Validation for updating package - ID-based with complete fields (ID from URL parameter)
export const updatePackageValidation = [
  body('trackingNumber')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tracking number must be 3-50 characters'),
  
  body('userCode')
    .optional()
    .matches(/^[A-Z]{2,6}-\d{3,5}$/)
    .withMessage('Customer code must be in format CLEAN-XXXX (3-5 digits)'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('shipper')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Shipper name cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('itemDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Item description cannot exceed 500 characters'),
  
  body('serviceMode')
    .optional()
    .isIn(['air', 'ocean', 'local'])
    .withMessage('Service mode must be air, ocean, or local'),
  
  body('status')
    .optional()
    .isIn(['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned', 'at_warehouse', 'processing', 'ready_for_pickup'])
    .withMessage('Invalid package status'),
  
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
    .withMessage('Unit must be either cm or in'),
  
  body('senderName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Sender name cannot exceed 100 characters'),
  
  body('senderEmail')
    .optional()
    .isEmail()
    .withMessage('Sender email must be valid'),
  
  body('senderPhone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Sender phone must be valid'),
  
  body('senderAddress')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Sender address cannot exceed 500 characters'),
  
  body('senderCountry')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Sender country cannot exceed 100 characters'),
  
  body('recipient.name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Recipient name cannot exceed 100 characters'),
  
  body('recipient.email')
    .optional()
    .isEmail()
    .withMessage('Recipient email must be valid'),
  
  body('recipient.phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Recipient phone must be valid'),
  
  body('recipient.address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Recipient address cannot exceed 500 characters'),
  
  body('itemValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item value must be a positive number'),
  
  body('specialInstructions')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Special instructions cannot exceed 1000 characters'),
  
  body('isFragile')
    .optional()
    .isBoolean()
    .withMessage('Is fragile must be boolean'),
  
  body('isHazardous')
    .optional()
    .isBoolean()
    .withMessage('Is hazardous must be boolean'),
  
  body('requiresSignature')
    .optional()
    .isBoolean()
    .withMessage('Requires signature must be boolean'),
  
  body('customsRequired')
    .optional()
    .isBoolean()
    .withMessage('Customs required must be boolean'),
  
  body('customsStatus')
    .optional()
    .isIn(['not_required', 'pending', 'cleared'])
    .withMessage('Customs status must be not_required, pending, or cleared'),
  
  body('warehouseLocation')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Warehouse location cannot exceed 100 characters'),
  
  body('notes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters')
];

// Validation for getting customers (GET request - use query, not body)
export const getCustomersValidation = [
  query('courierCode')
    .optional()
    .isLength({ min: 2, max: 20 })
    .withMessage('Courier code must be 2-20 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

// Helper function to check validation results
export const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err: any) => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};
