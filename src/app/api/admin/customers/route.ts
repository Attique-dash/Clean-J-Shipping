import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { ShippingAddress } from "@/models/ShippingAddress";
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

  const url = new URL(req.url);
  const userCode = url.searchParams.get("userCode")?.trim();

  const query: { role: string; userCode?: string } = { role: "customer" };
  if (userCode) {
    query.userCode = userCode;
  }

  const customers = await User.find(query)
    .select("firstName lastName email phone userCode address accountStatus emailVerified createdAt")
    .sort({ createdAt: -1 })
    .limit(500);
  return NextResponse.json({ items: customers });
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    // CRITICAL FIX: Add await
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      console.log("📝 Customer creation request body:", body);
    } catch (jsonError) {
      console.error("❌ JSON parsing error:", jsonError);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { firstName, lastName, email, password, phone, address, country, accountStatus } = body || {};
    
    // Extract address fields properly with type safety
    const addressObj = (address && typeof address === 'object') ? address as Record<string, string> : {};
    const street = addressObj.street || "";
    const city = addressObj.city || "";
    const state = addressObj.state || "";
    const zipCode = addressObj.zipCode || "";
    const addressCountry = addressObj.country || country || "";
    
    if (!firstName || !lastName || !email || !password) {
      console.error("❌ Missing required fields:", { firstName, lastName, email, hasPassword: !!password });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
  
    // Ensure password is a string
    const passwordStr = String(password);
    if (!passwordStr || passwordStr.trim() === '') {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      console.error("❌ Email already exists:", email);
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
  
    // Generate unique user code
    const userCode = `C${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const passwordHash = await hashPassword(passwordStr);
    
    console.log("👤 Creating customer:", { firstName, lastName, email, userCode });
  
    // Create user
    let created;
    try {
      created = await User.create({
        userCode,
        firstName,
        lastName,
        email,
        passwordHash,
        phone: phone || "", // Ensure phone is not undefined
        address: {
          street,
          city,
          state,
          zipCode,
          country: addressCountry,
        },
        accountStatus: accountStatus || "active",
        role: "customer",
        registrationStep: 3, // Set to completed since admin is creating
        emailVerified: true, // Admin-created customers are considered verified
      });
      console.log("✅ Customer created successfully:", { id: created._id, userCode });
    } catch (userError: any) {
      console.error("❌ User creation failed:", {
        message: userError.message,
        name: userError.name,
        errors: userError.errors,
        stack: userError.stack
      });
      throw userError;
    }

    // Create default shipping address if address provided
    if (address) {
      try {
        await ShippingAddress.create({
          userId: created._id,
          label: "Home",
          contactName: `${firstName} ${lastName}`,
          phone: phone || "",
          address: address,
          city: "",
          state: "",
          zipCode: "",
          country: country || "Jamaica",
          isDefault: true,
          isActive: true,
          addressType: "both",
        });
        console.log("✅ Shipping address created for customer:", created._id);
      } catch (shippingError) {
        console.error("❌ Failed to create shipping address for admin-created customer:", shippingError);
        // Don't fail user creation if shipping address creation fails
      }
    }

    // Send welcome email to new customer
    try {
      console.log('📧 Preparing to send customer welcome email...');
      const customerName = `${firstName} ${lastName}`.trim();
      console.log('👤 Customer details:', { customerName, email, userCode, hasPassword: !!passwordStr });
      
      const emailSent = await emailService.sendWelcomeEmail({
        to: String(email),
        customerName,
        userCode,
      });
      
      console.log('📧 Email service result:', emailSent);
      
      if (!emailSent) {
        console.error("❌ Failed to send customer welcome email to:", email);
        // Continue with response even if email fails
      } else {
        console.log("✅ Customer welcome email sent successfully to:", email);
      }
    } catch (emailError: any) {
      console.error("❌ Error sending customer welcome email:", {
        message: emailError.message,
        stack: emailError.stack,
        code: emailError.code
      });
      // Continue with response even if email fails
    }

    const response = { ok: true, id: created._id, userCode, message: "Customer created successfully. Welcome email sent." };
    console.log("📤 Sending response:", response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ Customer creation error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ 
      error: "Internal server error during customer creation" 
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
