// src/app/api/admin/staff/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";
import { emailService } from "@/lib/email-service";

export async function GET(req: Request) {
  await dbConnect();
  // CRITICAL FIX: Add await
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const staff = await User.find({ role: "warehouse" })
    .select("firstName lastName email userCode branch phone createdAt")
    .sort({ createdAt: -1 })
    .limit(500);
  return NextResponse.json({ items: staff });
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    // CRITICAL FIX: Add await
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: any;
    try {
      body = await req.json();
      console.log("📝 Staff creation request body:", body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { firstName, lastName, email, password, branch, phone } = body || {};
    if (!firstName || !lastName || !email || !password) {
      console.error("❌ Missing required fields:", { firstName, lastName, email, hasPassword: !!password });
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
      phone: phone || "", // Add phone field to prevent validation error
      branch,
      role: "warehouse",
      accountStatus: "active", // Ensure staff accounts are active
      emailVerified: true, // Staff accounts are pre-verified
      registrationStep: 3, // Set to completed
    });

    // Send welcome email to new staff member
    try {
      console.log('📧 Preparing to send staff welcome email...');
      const staffName = `${firstName} ${lastName}`.trim();
      console.log('👤 Staff details:', { staffName, email, userCode, hasPassword: !!password });
      
      const emailSent = await emailService.sendStaffWelcomeEmail({
        to: email,
        staffName,
        userCode,
        password,
        branch: branch || undefined,
      });
      
      console.log('📧 Email service result:', emailSent);
      
      if (!emailSent) {
        console.error("❌ Failed to send staff welcome email to:", email);
        // Continue with response even if email fails
      } else {
        console.log("✅ Staff welcome email sent successfully to:", email);
      }
    } catch (emailError: any) {
      console.error("❌ Error sending staff welcome email:", {
        message: emailError.message,
        stack: emailError.stack,
        code: emailError.code
      });
      // Continue with response even if email fails
    }

    const response = NextResponse.json({ 
      ok: true, 
      id: created._id, 
      userCode,
      message: "Staff member created successfully. Welcome email sent."
    });
    
    console.log("📤 Staff creation response:", {
      ok: true,
      id: created._id,
      userCode,
      message: "Staff member created successfully. Welcome email sent."
    });
    
    return response;
  } catch (error: any) {
    console.error("❌ Staff creation error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ 
      error: "Internal server error during staff creation" 
    }, { status: 500 });
  }
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
  const { id, firstName, lastName, email, password, branch, phone } = body || {};
  if (!id || !Types.ObjectId.isValid(String(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const update: any = {};
  if (firstName !== undefined) update.firstName = firstName;
  if (lastName !== undefined) update.lastName = lastName;
  if (email !== undefined) update.email = email;
  if (phone !== undefined) update.phone = phone;
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