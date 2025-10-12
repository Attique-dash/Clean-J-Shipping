import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  branch: z.string().optional(),
  serviceTypeIDs: z.array(z.string()).optional(),
});

// Admin Broadcast Messages
export const adminBroadcastCreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  channels: z.array(z.enum(["email", "portal"]))
    .default(["portal"]).optional(),
  scheduled_at: z.string().optional(), // ISO date string
});

// Warehouse Manifests
export const warehouseManifestUpdateSchema = z.object({
  manifest_id: z.string().min(1),
  title: z.string().optional(),
  mode: z.enum(["air", "sea", "land"]).optional(),
  batch_date: z.string().optional(), // ISO date string
  shipments: z
    .array(
      z.object({
        tracking_number: z.string().min(1),
        status: z.string().min(1).optional(),
        weight: z.number().nonnegative().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1),
});

// New customer registration schema matching requested payload
// {
//   full_name: "James Wilson",
//   email: "james@email.com",
//   phone: "+15551234567",
//   password: "securepassword123",
//   address: {
//     street: "123 Main St",
//     city: "Miami",
//     state: "FL",
//     zip_code: "33101",
//     country: "United States"
//   }
// }
export const customerRegisterSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  // phone optional in this schema to keep backward compatibility with existing clients
  // validation tightened to 11 digits if provided
  phone: z
    .string()
    .regex(/^\d{11}$/,{ message: "Phone must be exactly 11 digits" })
    .optional(),
  password: z.string().min(6),
  address: z
    .object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zip_code: z.string().min(1),
      country: z.string().min(1),
    })
    .optional(),
});

// Alternative customer registration schema (strict) for user's requested payload
// {
//   fullName: string,
//   email: string,
//   phoneNo: string(11 digits),
//   password: string(min 6),
//   adress: string, // street line
//   city: string,
//   state: string,
//   zip_code: string,
//   country: string
// }
export const customerRegisterAltSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phoneNo: z.string().regex(/^\d{11}$/,{ message: "phoneNo must be exactly 11 digits" }),
  password: z.string().min(6),
  adress: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip_code: z.string().min(1),
  country: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const addPackageSchema = z.object({
  trackingNumber: z.string().min(1),
  userCode: z.string().min(1),
  weight: z.number().optional(),
  shipper: z.string().optional(),
  description: z.string().optional(),
  entryDate: z.string().datetime().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  receivedBy: z.string().optional(),
  warehouse: z.string().optional(),
});

export const updatePackageSchema = z.object({
  trackingNumber: z.string().min(1),
  status: z.enum(["Unknown", "At Warehouse", "In Transit", "At Local Port", "Delivered", "Deleted"]),
  note: z.string().optional(),
  // Optional UI-facing fields
  statusUi: z.enum(["in_transit", "ready_for_pickup", "delivered", "pending"]).optional(),
  location: z.string().optional(),
});

export const deletePackageSchema = z.object({
  trackingNumber: z.string().min(1),
});

export const manifestSchema = z.object({
  manifestId: z.string().min(1),
  data: z.any().optional(),
});

// Tasoko integration: internal add package
export const tasokoAddPackageSchema = z.object({
  integration_id: z.string().min(1),
  tracking_number: z.string().min(1),
  customer_id: z.string().min(1), // maps to User.userCode
  description: z.string().optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().default("USD").optional(),
  origin: z.string().optional(),
  order_id: z.string().optional(),
  supplier: z.string().optional(),
  ship_date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/).optional(),
});

// Tasoko integration: internal status updates
export const tasokoUpdatePackageSchema = z.object({
  tracking_number: z.string().min(1),
  new_status: z.enum([
    "in_transit",
    "ready_for_pickup",
    "delivered",
    "pending",
    "received",
    "cleared_customs",
    "in_customs",
  ]),
  update_date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  additional_data: z
    .object({
      customs_fee: z.number().nonnegative().optional(),
      duty_amount: z.number().nonnegative().optional(),
    })
    .optional(),
});

// Admin: Customers CRUD
export const adminCreateCustomerSchema = z.object({
  // allow either full_name or first/last
  full_name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(6),
  branch: z.string().optional(),
  serviceTypeIDs: z.array(z.string()).optional(),
  userCode: z.string().optional(),
  phone: z.string().min(5).optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip_code: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  accountStatus: z.enum(["active", "inactive"]).optional(),
  emailVerified: z.boolean().optional(),
  accountType: z.string().optional(),
}).refine(
  (data) => Boolean(data.full_name || (data.firstName && data.lastName)),
  { message: "Provide full_name or firstName+lastName", path: ["full_name"] }
);

export const adminUpdateCustomerSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  branch: z.string().optional(),
  serviceTypeIDs: z.array(z.string()).optional(),
  userCode: z.string().optional(),
  phone: z.string().min(5).optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip_code: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  accountStatus: z.enum(["active", "inactive"]).optional(),
  emailVerified: z.boolean().optional(),
  accountType: z.string().optional(),
});

export const adminDeleteCustomerSchema = z.object({
  id: z.string().min(1),
});

// Customer Pre-Alert schemas
export const customerPreAlertCreateSchema = z.object({
  tracking_number: z.string().min(1),
  carrier: z.string().optional(),
  origin: z.string().optional(),
  expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/).optional(),
  notes: z.string().optional(),
});

// Customer Payments
export const customerPaymentCreateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD").optional(),
  method: z.enum(["visa", "mastercard", "amex", "bank", "wallet"]).default("visa").optional(),
  reference: z.string().min(1).optional(),
  // Optional linkage to a tracking number or bill
  tracking_number: z.string().min(1).optional(),
});

// Customer Messages
export const customerMessageCreateSchema = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
});

// Support Contact
export const supportContactSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
  // Optional for authenticated users; required if unauthenticated
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

// Admin POS
export const adminPosTransactionCreateSchema = z.object({
  customer_code: z.string().optional(),
  method: z.enum(["cash", "card", "visa", "mastercard", "amex", "bank", "wallet"]).default("cash"),
  items: z
    .array(
      z.object({
        sku: z.string().optional(),
        product_id: z.string().optional(),
        name: z.string().optional(),
        qty: z.number().positive(),
        unit_price: z.number().nonnegative().optional(),
      })
    )
    .min(1),
  notes: z.string().optional(),
});
