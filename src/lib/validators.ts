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
  user_code: z.string().min(1),
  carrier: z.string().optional(),
  origin: z.string().optional(),
  expected_date: z.string().optional(),
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
export const customerPreAlertCreateSchema = preAlertCreateSchema;

export const supportContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export const tasokoAddPackageSchema = addPackageSchema;

export const tasokoUpdatePackageSchema = packageUpdateSchema;

export const deletePackageSchema = z.object({
  id: z.string(),
  reason: z.string().optional(),
});

export const manifestSchema = z.object({
  id: z.string().optional(),
  tracking_number: z.string().min(3).max(50),
  carrier: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const updatePackageSchema = packageUpdateSchema;