// src/app/api/admin/staff/route.ts
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
  const staff = await User.find({ role: "warehouse" })
    .select("firstName lastName email userCode branch createdAt")
    .sort({ createdAt: -1 })
    .limit(500);
  return NextResponse.json({ items: staff });
}

export async function POST(req: Request) {
  await dbConnect();
  // CRITICAL FIX: Add await
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { firstName, lastName, email, password, branch } = body || {};
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const exists = await User.findOne({ email });
  if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  const userCode = `W${Date.now()}`;
  const passwordHash = await hashPassword(password);
  const created = await User.create({
    userCode,
    firstName,
    lastName,
    email,
    passwordHash,
    branch,
    role: "warehouse",
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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id, firstName, lastName, email, password, branch } = body || {};
  if (!id || !Types.ObjectId.isValid(String(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const update: any = {};
  if (firstName !== undefined) update.firstName = firstName;
  if (lastName !== undefined) update.lastName = lastName;
  if (email !== undefined) update.email = email;
  if (branch !== undefined) update.branch = branch;
  if (password) update.passwordHash = await hashPassword(password);

  const updated = await User.findOneAndUpdate({ _id: id, role: "warehouse" }, { $set: update }, { new: true });
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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id } = body || {};
  if (!id || !Types.ObjectId.isValid(String(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const deleted = await User.findOneAndDelete({ _id: id, role: "warehouse" });
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}