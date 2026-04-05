import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export const dynamic = 'force-dynamic';

// Default shipping addresses configuration
const DEFAULT_SHIPPING_ADDRESSES = [
  {
    type: "air" as const,
    street: "3200 NW 112th Ave",
    city: "Doral",
    state: "Florida",
    zipCode: "33172",
    country: "USA",
    addressLine2: "KCDE-{MAILBOX}",
    isDefault: true,
  },
  {
    type: "sea" as const,
    street: "3200 NW 112th Ave",
    city: "Doral",
    state: "Florida",
    zipCode: "33172",
    country: "USA",
    addressLine2: "KCDX-{MAILBOX}",
    isDefault: false,
  },
  {
    type: "china" as const,
    street: "Baoshan No.2 Industrial Zone",
    city: "Shenzhen",
    state: "Guangdong Province",
    zipCode: "518000",
    country: "China",
    addressLine2: "{MAILBOX}",
    isDefault: false,
  },
];

export async function GET(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const pl = payload as { uid?: string; _id?: string };
  const userId = pl.uid || pl._id;
  
  const user = userId
    ? await User.findById(userId)
        .select("firstName lastName email phone address userCode role accountStatus emailVerified isActive lastLogin assignedWarehouse permissions createdBy branch preferences createdAt updatedAt")
        .lean<{
          firstName?: string;
          lastName?: string;
          name?: string;
          email: string;
          phone?: string;
          userCode: string;
          role?: string;
          accountStatus?: "active" | "inactive" | "pending";
          emailVerified?: boolean;
          isActive?: boolean;
          address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
          createdAt?: Date;
          updatedAt?: Date;
          lastLogin?: Date;
          assignedWarehouse?: string | null;
          permissions?: string[];
          branch?: string;
          preferences?: {
            emailNotifications?: boolean;
            smsNotifications?: boolean;
            pushNotifications?: boolean;
            language?: string;
            timezone?: string;
          };
        }>()
    : null;
    
  if (!user) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Generate shipping addresses with user's mailbox code
  const mailboxCode = user.userCode;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  
  const shippingAddresses = DEFAULT_SHIPPING_ADDRESSES.map((addr, index) => ({
    _id: `addr_${index}`,
    ...addr,
    addressLine2: addr.addressLine2.replace("{MAILBOX}", mailboxCode),
    fullName,
    mailboxCode,
    displayName: `${fullName} ${mailboxCode}`,
    createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
  }));

  const responseData = {
    _id: userId,
    userCode: user.userCode,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email,
    phone: user.phone || "",
    role: user.role || "customer",
    mailboxNumber: user.userCode, // Use userCode as mailbox number
    accountStatus: user.accountStatus || "active",
    emailVerified: user.emailVerified ?? true,
    isActive: user.isActive ?? true,
    lastLogin: user.lastLogin?.toISOString() || new Date().toISOString(),
    assignedWarehouse: user.assignedWarehouse || null,
    permissions: user.permissions || [],
    createdBy: null,
    passwordResetAt: null,
    branch: user.branch || "Downtown",
    address: user.address || {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
    },
    preferences: user.preferences || {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      language: "en",
      timezone: "UTC",
    },
    shippingAddresses,
    createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    message: "Success",
    data: responseData,
    timestamp: new Date().toISOString(),
  });
}

export async function PUT(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const data = raw as Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  }>;

  const update: Record<string, unknown> = {};
  if (typeof data.email === "string" && data.email) update.email = data.email.trim();
  if (typeof data.phone === "string") update.phone = data.phone.trim();
  if (typeof data.firstName === "string") update.firstName = data.firstName.trim();
  if (typeof data.lastName === "string") update.lastName = data.lastName.trim();
  
  if (data.address) {
    update.address = {
      street: data.address.street,
      city: data.address.city,
      state: data.address.state,
      zipCode: data.address.zipCode,
      country: data.address.country,
    };
  }

  const pl2 = payload as { uid?: string; _id?: string };
  const updated = await User.findByIdAndUpdate(pl2.uid || pl2._id, { $set: update }, { new: true })
    .select("firstName lastName email phone address userCode role accountStatus emailVerified isActive lastLogin assignedWarehouse permissions branch preferences createdAt updatedAt")
    .lean() as { 
      firstName?: string; 
      lastName?: string; 
      email: string; 
      phone?: string; 
      address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string }; 
      userCode: string; 
      role?: string; 
      accountStatus?: "active" | "inactive" | "pending"; 
      emailVerified?: boolean; 
      isActive?: boolean; 
      lastLogin?: Date; 
      assignedWarehouse?: string | null; 
      permissions?: string[]; 
      branch?: string; 
      preferences?: any; 
      createdAt?: Date; 
      updatedAt?: Date; 
    } | null;
    
  if (!updated) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Re-generate shipping addresses for updated user
  const mailboxCode = updated.userCode;
  const fullName = [updated.firstName, updated.lastName].filter(Boolean).join(" ");
  
  const shippingAddresses = DEFAULT_SHIPPING_ADDRESSES.map((addr, index) => ({
    _id: `addr_${index}`,
    ...addr,
    addressLine2: addr.addressLine2.replace("{MAILBOX}", mailboxCode),
    fullName,
    mailboxCode,
    displayName: `${fullName} ${mailboxCode}`,
    createdAt: updated.createdAt?.toISOString() || new Date().toISOString(),
  }));

  const responseData = {
    _id: pl2.uid || pl2._id,
    userCode: updated.userCode,
    firstName: updated.firstName || "",
    lastName: updated.lastName || "",
    email: updated.email,
    phone: updated.phone || "",
    role: updated.role || "customer",
    mailboxNumber: updated.userCode,
    accountStatus: updated.accountStatus || "active",
    emailVerified: (updated as {emailVerified?: boolean}).emailVerified ?? true,
    isActive: (updated as {isActive?: boolean}).isActive ?? true,
    lastLogin: updated.lastLogin?.toISOString() || new Date().toISOString(),
    assignedWarehouse: (updated as {assignedWarehouse?: string | null}).assignedWarehouse || null,
    permissions: (updated as {permissions?: string[]}).permissions || [],
    createdBy: null,
    passwordResetAt: null,
    branch: (updated as {branch?: string}).branch || "Downtown",
    address: (updated as {address?: {street?: string; city?: string; state?: string; zipCode?: string; country?: string}}).address || {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
    },
    preferences: (updated as {preferences?: {emailNotifications?: boolean; smsNotifications?: boolean; pushNotifications?: boolean; language?: string; timezone?: string}}).preferences || {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      language: "en",
      timezone: "UTC",
    },
    shippingAddresses,
    createdAt: updated.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: updated.updatedAt?.toISOString() || new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    message: "Profile updated successfully",
    data: responseData,
    timestamp: new Date().toISOString(),
  });
}
