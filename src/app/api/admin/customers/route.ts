import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User, IUser } from "@/models/User";
import { Package } from "@/models/Package";
import { Types, FilterQuery } from "mongoose";
import { hashPassword } from "@/lib/auth";
import { getAuthFromRequest } from "@/lib/rbac";
import { adminCreateCustomerSchema, adminUpdateCustomerSchema, adminDeleteCustomerSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { hasPermission, type AdminRole } from "@/lib/permissions";

export async function GET(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = (url.searchParams.get("status") || "").trim().toLowerCase(); // active|inactive
  const type = (url.searchParams.get("type") || "").trim(); // serviceType filter id
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const per_pageRaw = Math.max(parseInt(url.searchParams.get("per_page") || "20", 10) || 20, 1);
  const per_page = Math.min(per_pageRaw, 100);

  const filter: FilterQuery<IUser> = { role: "customer" };
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { userCode: regex },
      { phone: regex },
      { "address.city": regex },
      { "address.state": regex },
    ];
  }
  if (status === "active" || status === "inactive") {
    filter.accountStatus = status;
  }
  if (type) {
    filter.serviceTypeIDs = { $in: [type] };
  }

  const total_count = await User.countDocuments(filter);
  const customers = await User.find(filter)
    .select("firstName lastName email phone address createdAt accountStatus userCode emailVerified accountType branch serviceTypeIDs")
    .sort({ createdAt: -1 })
    .skip((page - 1) * per_page)
    .limit(per_page);

  // Compute package counts by userCode for the current page of customers
  const userCodes = customers.map((u) => u.userCode);
  const pkgAgg = await Package.aggregate<{
    _id: string;
    count: number;
  }>([
    { $match: { userCode: { $in: userCodes }, status: { $ne: "Deleted" } } },
    { $group: { _id: "$userCode", count: { $sum: 1 } } },
  ]);
  const countsByUserCode = new Map<string, number>(pkgAgg.map((x) => [x._id, x.count]));

  const result = customers.map((u) => {
    const full_name = [u.firstName, u.lastName].filter(Boolean).join(" ");
    const member_since = u.createdAt ? u.createdAt.toISOString() : undefined;
    const address = u.address
      ? {
          street: u.address.street,
          city: u.address.city,
          state: u.address.state,
          zip_code: u.address.zipCode,
          country: u.address.country,
        }
      : undefined;
    return {
      customer_id: String(u._id),
      userCode: u.userCode,
      full_name,
      email: u.email,
      phone: u.phone,
      branch: u.branch,
      serviceTypeIDs: u.serviceTypeIDs || [],
      address,
      email_verified: Boolean(u.emailVerified),
      account_status: u.accountStatus || "active",
      account_type: u.accountType,
      package_count: countsByUserCode.get(u.userCode) || 0,
      member_since,
    };
  });

  return NextResponse.json({ customers: result, total_count, page, per_page });
}

export async function POST(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = adminCreateCustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    full_name,
    firstName: firstNameIn,
    lastName: lastNameIn,
    email,
    password,
    branch,
    serviceTypeIDs,
    userCode,
    phone,
    address: addr,
    accountStatus,
    emailVerified,
    accountType,
  } = parsed.data;
  // Derive names
  let firstName = firstNameIn;
  let lastName = lastNameIn;
  if (full_name && (!firstName || !lastName)) {
    const parts: string[] = full_name.trim().split(/\s+/);
    if (parts.length === 1) {
      firstName = parts[0];
      lastName = "";
    } else {
      lastName = parts.pop() as string;
      firstName = parts.join(" ");
    }
  }
  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }
  const passwordHash = await hashPassword(password);
  const code = userCode?.trim() || `U${Date.now()}`;
  const created = await User.create({
    userCode: code,
    firstName,
    lastName,
    email,
    passwordHash,
    branch,
    serviceTypeIDs,
    phone,
    address: addr
      ? {
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zip_code,
          country: addr.country,
        }
      : undefined,
    accountStatus,
    emailVerified,
    accountType,
    role: "customer",
  });
  // Audit log create
  await logAudit({
    userId: String((payload as { _id?: string; uid?: string; email?: string } | null)?.uid || (payload as { _id?: string } | null)?._id || ""),
    userEmail: String((payload as { email?: string } | null)?.email || ""),
    action: "create",
    resource: "customer",
    resourceId: String(created._id),
    changes: {
      email: { old: undefined, new: created.email },
      userCode: { old: undefined, new: created.userCode },
    },
    req,
  });
  return NextResponse.json({ ok: true, id: created._id, userCode: created.userCode });
}

export async function PUT(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ar = (payload && (payload as { adminRole?: AdminRole }).adminRole) as AdminRole | undefined;
  if (!ar || !hasPermission(ar, "customers:write")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = adminUpdateCustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, password, full_name, address: addr, ...rest } = parsed.data;
  const trimmedId = id.trim();
  if (!Types.ObjectId.isValid(trimmedId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const update: Record<string, unknown> = { ...rest };
  // Map full_name into first/last if provided
  if (full_name) {
    const parts: string[] = full_name.trim().split(/\s+/);
    if (parts.length === 1) {
      update.firstName = parts[0];
      update.lastName = "";
    } else {
      update.lastName = parts.pop() as string;
      update.firstName = parts.join(" ");
    }
  }
  // Map address zip_code to zipCode
  if (addr) {
    update.address = {
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zip_code,
      country: addr.country,
    };
  }
  if (password) {
    update.passwordHash = await hashPassword(password);
  }

  const updated = await User.findByIdAndUpdate(trimmedId, { $set: update }, { new: true });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Audit log update
  await logAudit({
    userId: String((payload as { _id?: string; uid?: string; email?: string } | null)?.uid || (payload as { _id?: string } | null)?._id || ""),
    userEmail: String((payload as { email?: string } | null)?.email || ""),
    action: "update",
    resource: "customer",
    resourceId: trimmedId,
    changes: {
      ...(update.firstName !== undefined ? { firstName: { old: (await User.findById(trimmedId).lean())?.firstName, new: update.firstName } } : {}),
      ...(update.email !== undefined ? { email: { old: (await User.findById(trimmedId).lean())?.email, new: update.email } } : {}),
    },
    req,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = adminDeleteCustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = parsed.data;
  const trimmedId = id.trim();
  if (!Types.ObjectId.isValid(trimmedId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const deleted = await User.findByIdAndDelete(trimmedId);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Audit log delete
  await logAudit({
    userId: String((payload as { _id?: string; uid?: string; email?: string } | null)?.uid || (payload as { _id?: string } | null)?._id || ""),
    userEmail: String((payload as { email?: string } | null)?.email || ""),
    action: "delete",
    resource: "customer",
    resourceId: trimmedId,
    changes: {
      email: { old: deleted.email, new: undefined },
      userCode: { old: deleted.userCode, new: undefined },
    },
    req,
  });
  return NextResponse.json({ ok: true });
}
