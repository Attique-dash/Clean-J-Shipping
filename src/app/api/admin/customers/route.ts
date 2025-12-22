// src/app/api/admin/customers/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";

export async function GET(req: Request) {
  await dbConnect();
  // CRITICAL FIX: Add await
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const customers = await User.find({ role: "customer" })
    .select("firstName lastName email phone userCode address accountStatus emailVerified createdAt")
    .sort({ createdAt: -1 })
    .limit(500);
  return NextResponse.json({ items: customers });
}

export async function POST(req: Request) {
  await dbConnect();
  // CRITICAL FIX: Add await
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { firstName, lastName, email, password, phone, address, country, accountStatus } = body || {};
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  
  // Ensure password is a string
  const passwordStr = String(password);
  if (!passwordStr || passwordStr.trim() === '') {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  }
  const exists = await User.findOne({ email });
  if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  const userCode = `C${Date.now()}`;
  const passwordHash = await hashPassword(passwordStr);
  const created = await User.create({
    userCode,
    firstName,
    lastName,
    email,
    passwordHash,
    phone,
    address: {
      street: address,
      country,
    },
    accountStatus: accountStatus || "active",
    role: "customer",
  });
  return NextResponse.json({ ok: true, id: created._id, userCode });
}

export async function PUT(req: Request) {
  await dbConnect();
  // CRITICAL FIX: Add await
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id, firstName, lastName, email, password, phone, address, country, accountStatus } = body || {};
  if (!id || !Types.ObjectId.isValid(String(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if (firstName !== undefined) update.firstName = firstName;
  if (lastName !== undefined) update.lastName = lastName;
  if (email !== undefined) update.email = email;
  if (phone !== undefined) update.phone = phone;
  if (address !== undefined || country !== undefined) {
    update.address = {
      ...(address !== undefined && { street: address }),
      ...(country !== undefined && { country }),
    };
  }
  if (accountStatus !== undefined) update.accountStatus = accountStatus;
  if (password) {
    const passwordStr = String(password);
    if (passwordStr.trim() !== '') {
      update.passwordHash = await hashPassword(passwordStr);
    }
  }

  const updated = await User.findOneAndUpdate({ _id: id, role: "customer" }, { $set: update }, { new: true });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  await dbConnect();
  // CRITICAL FIX: Add await
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id } = body || {};
  if (!id || !Types.ObjectId.isValid(String(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const deleted = await User.findOneAndDelete({ _id: id, role: "customer" });
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
