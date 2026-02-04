import { body, param, query, validationResult } from 'express-validator';

// Custom validation result handler
export const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Package validation
export const validateCreatePackage = [
  body('trackingNumber')
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tracking number must be between 3 and 50 characters'),
  body('senderName')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Sender name must be between 2 and 100 characters'),
  body('recipientName')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Recipient name must be between 2 and 100 characters'),
  body('weight')
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('dimensions.length')
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),
  body('dimensions.width')
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),
  body('dimensions.height')
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  body('status')
    .isIn(['pending', 'in-transit', 'delivered', 'returned', 'lost'])
    .withMessage('Invalid package status'),
  handleValidationErrors
];

export const validateUpdatePackage = [
  param('id')
    .isMongoId()
    .withMessage('Invalid package ID'),
  body('status')
    .optional()
    .isIn(['pending', 'in-transit', 'delivered', 'returned', 'lost'])
    .withMessage('Invalid package status'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  handleValidationErrors
];

// Customer validation
export const validateCreateCustomer = [
  body('name')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .isString()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  handleValidationErrors
];

// Message validation
export const validateCreateMessage = [
  body('content')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters'),
  body('senderId')
    .isMongoId()
    .withMessage('Invalid sender ID'),
  body('recipientId')
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  handleValidationErrors
];

// Inventory validation
export const validateCreateInventory = [
  body('name')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  handleValidationErrors
];

// Common ID validation
export const validateMongoId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];
