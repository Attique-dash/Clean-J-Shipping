// src/app/api/admin/customers/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { Package } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { adminCreateCustomerSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const per_page = Math.min(Math.max(parseInt(url.searchParams.get("per_page") || "20", 10), 1), 100);

    const filter: any = { role: "customer" };
    
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
        { userCode: regex }
      ];
    }

    if (status === "active" || status === "inactive") {
      filter.accountStatus = status;
    }

    const [customers, total_count] = await Promise.all([
      User.find(filter)
        .select("userCode firstName lastName email phone address accountStatus emailVerified createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * per_page)
        .limit(per_page)
        .lean(),
      User.countDocuments(filter)
    ]);

    // Get package counts for each customer
    const userCodes = customers.map(c => c.userCode);
    const packageCounts = await Package.aggregate([
      { 
        $match: { 
          userCode: { $in: userCodes },
          status: { $ne: "Deleted" }
        }
      },
      { 
        $group: { 
          _id: "$userCode",
          count: { $sum: 1 }
        }
      }
    ]);

    const packageCountMap = new Map(
      packageCounts.map(pc => [pc._id, pc.count])
    );

    const result = customers.map(u => ({
      customer_id: u._id.toString(),
      full_name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      phone: u.phone || undefined,
      address: u.address ? {
        street: u.address.street,
        city: u.address.city,
        state: u.address.state,
        zip_code: u.address.zipCode,
        country: u.address.country,
      } : undefined,
      email_verified: u.emailVerified || false,
      account_status: u.accountStatus || "active",
      package_count: packageCountMap.get(u.userCode) || 0,
      member_since: u.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({ customers: result, total_count, page, per_page });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
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

    const { full_name, email, password, phone, address } = parsed.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    
    // Split full name
    const nameParts = full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Generate unique user code
    const userCode = `C${Date.now()}`;
    
    const created = await User.create({
      userCode,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone,
      address: address ? {
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zip_code,
        country: address.country,
      } : undefined,
      role: "customer",
      accountStatus: "active",
      emailVerified: false
    });

    return NextResponse.json({ 
      ok: true, 
      id: created._id.toString(),
      user_code: created.userCode
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { id, password, full_name, address, ...rest } = raw as any;
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const updateData: any = { ...rest };
    
    if (full_name) {
      const nameParts = full_name.trim().split(/\s+/);
      updateData.firstName = nameParts[0] || '';
      updateData.lastName = nameParts.slice(1).join(' ') || '';
    }
    
    if (address) {
      updateData.address = {
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zip_code,
        country: address.country,
      };
    }
    
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { id } = raw as { id: string };

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}