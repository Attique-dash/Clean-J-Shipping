import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
});

// Package Validation
export const packageCreateSchema = z.object({
  tracking_number: z.string().min(3).max(50),
  user_code: z.string().min(1),
  weight: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
  branch: z.string().optional(),
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  shipper: z.string().optional(),
  service_type: z.string().optional(),
});

export const packageUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(["At Warehouse", "In Transit", "At Local Port", "Delivered", "Unknown"]).optional(),
  weight: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
  branch: z.string().optional(),
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
});

// Customer Validation
export const adminCreateCustomerSchema = z.object({
  full_name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

export const adminUpdateCustomerSchema = z.object({
  id: z.string(),
  full_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  account_status: z.enum(["active", "inactive", "suspended"]).optional(),
});

// Broadcast Validation
export const adminBroadcastCreateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  channels: z.array(z.enum(["email", "portal"])).min(1),
  scheduled_at: z.string().datetime().optional(),
});

// POS Transaction Validation
export const adminPosTransactionCreateSchema = z.object({
  customer_code: z.string().optional(),
  method: z.enum(["cash", "card", "bank", "visa", "mastercard", "amex", "wallet"]),
  items: z.array(z.object({
    sku: z.string().optional(),
    product_id: z.string().optional(),
    name: z.string().optional(),
    qty: z.number().int().min(1),
    unit_price: z.number().min(0),
  })).min(1),
  notes: z.string().max(500).optional(),
});

// Pre-Alert Validation
export const preAlertCreateSchema = z.object({
  tracking_number: z.string().min(3).max(50),
  user_code: z.string().min(1).optional(), // Optional - will be set from auth
  carrier: z.string().min(1, "Carrier is required"),
  origin: z.string().min(1, "Origin is required"),
  expected_date: z.string().min(1, "Expected arrival date is required"),
  notes: z.string().max(1000).optional(),
});

// Customer Pre-Alert Validation (without user_code requirement)
export const customerPreAlertCreateSchema = z.object({
  tracking_number: z.string().min(3).max(50),
  carrier: z.string().min(1, "Carrier is required"),
  origin: z.string().min(1, "Origin is required"),
  expected_date: z.string().min(1, "Expected arrival date is required"),
  notes: z.string().max(1000).optional(),
});

// Receival Validation
export const addPackageSchema = z.object({
  trackingNumber: z.string().min(3).max(50),
  userCode: z.string().min(1),
  weight: z.number().min(0).optional(),
  shipper: z.string().optional(),
  description: z.string().max(500).optional(),
  itemDescription: z.string().max(500).optional(),
  entryDate: z.string().optional(),
  status: z.string().optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    unit: z.string().optional(),
    weight: z.number().min(0).optional(),
    weightUnit: z.string().optional(),
  }).optional(),
  recipient: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    shippingId: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  sender: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  contents: z.string().optional(),
  value: z.number().min(0).optional(),
  specialInstructions: z.string().optional(),
  receivedBy: z.string().optional(),
  warehouse: z.string().optional(),
});

// Staff Validation
export const staffCreateSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  branch: z.string().optional(),
});

export const staffUpdateSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  branch: z.string().optional(),
});

// Message Validation
export const messageCreateSchema = z.object({
  user_code: z.string().min(1),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
});

// Additional missing validators
export const supportContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

// International Package Validation Schema
export const internationalPackageSchema = z.object({
  // Basic validation
  trackingNumber: z.string().min(3).max(50),
  weight: z.number().min(0.01, "Weight must be greater than 0").max(1000, "Weight exceeds maximum limit"),
  length: z.number().min(0).max(500, "Length exceeds maximum limit (500cm)").optional(),
  width: z.number().min(0).max(500, "Width exceeds maximum limit (500cm)").optional(),
  height: z.number().min(0).max(500, "Height exceeds maximum limit (500cm)").optional(),
  
  // Country validation
  senderCountry: z.string().min(2, "Sender country is required").max(100),
  receiverCountry: z.string().min(2, "Receiver country is required").max(100),
  countryOfOrigin: z.string().min(2, "Country of origin is required for international packages").max(100).optional(),
  
  // HS Code validation (format: XXXX.XX.XX)
  hsCode: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/, "HS Code must be in format XXXX.XX.XX (e.g., 8517.12.00)").optional(),
  
  // International shipping fields
  exportLicenseNumber: z.string().max(100).optional(),
  importLicenseNumber: z.string().max(100).optional(),
  dangerousGoods: z.boolean().optional(),
  dangerousGoodsClass: z.string().max(50).optional(),
  dangerousGoodsUnNumber: z.string().max(20).optional(),
  
  // Value validation
  itemValue: z.number().min(0).max(1000000, "Item value exceeds maximum limit").optional(),
  
  // Service mode validation
  serviceMode: z.enum(['air', 'ocean', 'local']),
  isInternational: z.boolean(),
});

// Date validation utilities
export function validateDate(date: Date | string, allowFuture: boolean = false): { valid: boolean; error?: string } {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: "Invalid date format" };
    }
    
    if (!allowFuture && dateObj > new Date()) {
      return { valid: false, error: "Date cannot be in the future" };
    }
    
    // Check if date is too far in the past (more than 10 years)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (dateObj < tenYearsAgo) {
      return { valid: false, error: "Date is too far in the past" };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid date" };
  }
}

// HS Code format validation
export function validateHSCode(hsCode: string): { valid: boolean; error?: string } {
  if (!hsCode) {
    return { valid: true }; // Optional field
  }
  
  // HS Code format: XXXX.XX.XX (6-10 digits with dots)
  const hsCodeRegex = /^\d{4}(\.\d{2}){0,2}$/;
  
  if (!hsCodeRegex.test(hsCode)) {
    return { valid: false, error: "HS Code must be in format XXXX.XX.XX (e.g., 8517.12.00)" };
  }
  
  return { valid: true };
}

// Country code validation
export function validateCountryCode(country: string): { valid: boolean; error?: string } {
  if (!country || country.length < 2) {
    return { valid: false, error: "Country code must be at least 2 characters" };
  }
  
  // List of valid country codes (ISO 3166-1 alpha-2)
  const validCountries = [
    'US', 'JM', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
    'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'GR', 'PT', 'IE', 'IS', 'LU', 'MT', 'CY', 'EE', 'LV', 'LT', 'SI',
    'SK', 'JP', 'CN', 'KR', 'IN', 'SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'TW', 'HK', 'NZ', 'ZA', 'EG', 'NG',
    'KE', 'GH', 'TZ', 'UG', 'MA', 'DZ', 'TN', 'LY', 'AE', 'SA', 'IL', 'TR', 'RU', 'BR', 'MX', 'AR', 'CL',
    'CO', 'PE', 'UY', 'VE', 'PK', 'BD', 'LK', 'NP', 'AF', 'IQ', 'IR', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB',
    'SY', 'YE', 'MM', 'KH', 'LA', 'BN', 'FJ', 'PG', 'SB', 'VU', 'NC', 'PF', 'WS', 'TO', 'KI', 'TV', 'NR',
    'PW', 'FM', 'MH', 'AS', 'GU', 'MP', 'VI', 'PR', 'DO', 'HT', 'CU', 'BS', 'BB', 'TT', 'GD', 'LC', 'VC',
    'AG', 'DM', 'KN', 'BZ', 'CR', 'PA', 'HN', 'NI', 'SV', 'GT', 'BO', 'PY', 'GY', 'SR', 'GF', 'FK', 'GS',
    'AQ', 'TF', 'HM', 'CC', 'CX', 'NF', 'PN', 'SH', 'AC', 'TA', 'IO', 'VG', 'AI', 'AW', 'BM', 'BV', 'KY',
    'EH', 'GG', 'GI', 'JE', 'MS', 'PM', 'TC', 'WF', 'AD', 'AL', 'AM', 'AO', 'AZ', 'BA', 'BJ', 'BT', 'BW',
    'BY', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'DM', 'ER', 'ET', 'GA', 'GE', 'GM', 'GN', 'GQ', 'GW',
    'GY', 'KG', 'KM', 'KP', 'KZ', 'LR', 'LS', 'MD', 'MG', 'ML', 'MN', 'MR', 'MU', 'MV', 'MW', 'MZ', 'NA',
    'NE', 'RE', 'RW', 'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG', 'TJ', 'TM', 'TN', 'TZ',
    'UA', 'UZ', 'VA', 'XK', 'YT', 'ZM', 'ZW'
  ];
  
  // Check if it's a 2-letter country code
  if (country.length === 2) {
    const upperCountry = country.toUpperCase();
    if (validCountries.includes(upperCountry)) {
      return { valid: true };
    }
  }
  
  // Allow full country names as well
  return { valid: true };
}

// File upload validation
export function validateFileUpload(file: File, maxSizeMB: number = 10, allowedTypes: string[] = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }
  
  return { valid: true };
}

export const tasokoAddPackageSchema = z.object({
  integration_id: z.string().min(1),
  tracking_number: z.string().min(3).max(50),
  customer_id: z.string().min(1),
  description: z.string().max(500).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  origin: z.string().optional(),
  order_id: z.string().optional(),
  supplier: z.string().optional(),
  ship_date: z.string().optional(),
});

export const tasokoUpdatePackageSchema = z.object({
  tracking_number: z.string().min(3).max(50),
  new_status: z.string().min(1),
  update_date: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  additional_data: z.record(z.string(), z.unknown()).optional(),
});

export const deletePackageSchema = z.object({
  trackingNumber: z.string().min(3).max(50),
  reason: z.string().optional(),
});

export const manifestSchema = z.object({
  id: z.string().optional(),
  manifestId: z.string().optional(),
  tracking_number: z.string().min(3).max(50).optional(),
  description: z.string().optional(),
  data: z.unknown().optional(),
  carrier: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const updatePackageSchema = packageUpdateSchema;