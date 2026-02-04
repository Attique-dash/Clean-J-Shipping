// Package statuses
export const PACKAGE_STATUSES = {
  PENDING: 'pending',
  IN_TRANSIT: 'in-transit',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  LOST: 'lost'
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  WAREHOUSE_STAFF: 'warehouse_staff',
  CUSTOMER: 'customer'
} as const;

// Message types
export const MESSAGE_TYPES = {
  NOTIFICATION: 'notification',
  ALERT: 'alert',
  UPDATE: 'update',
  INQUIRY: 'inquiry'
} as const;

// Inventory transaction types
export const INVENTORY_TRANSACTION_TYPES = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer'
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Warehouse endpoints
  WAREHOUSE: {
    PACKAGES: '/api/warehouse/packages',
    CUSTOMERS: '/api/warehouse/customers',
    MESSAGES: '/api/warehouse/messages',
    MANIFESTS: '/api/warehouse/manifests',
    INVENTORY: '/api/warehouse/inventory',
    ANALYTICS: '/api/warehouse/analytics',
    ACCOUNT: '/api/warehouse/account',
    SETTINGS: '/api/warehouse/settings',
    REPORTS: '/api/warehouse/reports'
  },
  // Customer endpoints
  CUSTOMER: {
    PACKAGES: '/api/customer/packages',
    SHIPPING: '/api/customer/shipping',
    PROFILE: '/api/customer/profile'
  }
} as const;

// Error messages
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',
  DUPLICATE_ENTRY: 'Duplicate entry',
  INVALID_CREDENTIALS: 'Invalid credentials',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  DATABASE_ERROR: 'Database operation failed',
  NETWORK_ERROR: 'Network error occurred'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  RETRIEVED: 'Resource retrieved successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  EMAIL_SENT: 'Email sent successfully',
  UPLOAD_SUCCESS: 'File uploaded successfully',
  OPERATION_SUCCESS: 'Operation completed successfully'
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv'],
  UPLOAD_PATH: './uploads'
} as const;

// Rate limiting
export const RATE_LIMITING = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // limit each IP to 100 requests per windowMs
  SUCCESS_MESSAGE: 'Request successful',
  BLOCK_MESSAGE: 'Too many requests from this IP, please try again later'
} as const;

// JWT configuration
export const JWT_CONFIG = {
  ALGORITHM: 'HS256',
  EXPIRES_IN: '7d',
  REFRESH_TOKEN_EXPIRES_IN: '30d'
} as const;

// Email templates
export const EMAIL_TEMPLATES = {
  PACKAGE_CREATED: 'package_created',
  PACKAGE_DELIVERED: 'package_delivered',
  PACKAGE_SHIPPED: 'package_shipped',
  WELCOME_EMAIL: 'welcome_email',
  PASSWORD_RESET: 'password_reset',
  ACCOUNT_VERIFICATION: 'account_verification'
} as const;

// Database collection names
export const COLLECTIONS = {
  USERS: 'users',
  PACKAGES: 'packages',
  MANIFESTS: 'manifests',
  MESSAGES: 'messages',
  INVENTORY: 'inventory',
  INVENTORY_TRANSACTIONS: 'inventory_transactions',
  WAREHOUSES: 'warehouses',
  API_KEYS: 'api_keys'
} as const;

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  PACKAGE_DETAILS: (packageId: string) => `package:${packageId}:details`,
  INVENTORY_COUNT: 'inventory:count',
  ACTIVE_USERS: 'users:active',
  SYSTEM_STATS: 'system:stats'
} as const;

// Log levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;
