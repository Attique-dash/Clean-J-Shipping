import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  await dbConnect();
  const payload = await  getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pl = payload as { uid?: string; _id?: string };
  const userId = pl.uid || pl._id;
  const user = userId
    ? await User.findById(userId)
        .select("firstName lastName email phone address userCode role accountStatus createdAt lastLogin name")
        .lean<{
          firstName?: string;
          lastName?: string;
          name?: string;
          email: string;
          phone?: string;
          userCode: string;
          accountStatus?: "active" | "inactive";
          address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
          createdAt?: Date;
          lastLogin?: Date;
        }>()
    : null;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get name from firstName/lastName or name field
  const full_name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "";
  const address = user.address
    ? {
        street: user.address.street,
        city: user.address.city,
        state: user.address.state,
        zip_code: user.address.zipCode,
        country: user.address.country,
      }
    : undefined;

  return NextResponse.json({
    user_code: user.userCode,
    full_name,
    email: user.email,
    phone: user.phone,
    address,
    accountStatus: user.accountStatus ?? undefined,
    createdAt: user.createdAt ?? undefined,
    lastLogin: user.lastLogin ?? undefined,
  });
}

export async function PUT(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = raw as Partial<{
    full_name: string;
    email: string;
    phone: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zip_code?: string;
      country?: string;
    };
  }>;

  const update: Record<string, unknown> = {};
  if (typeof data.email === "string" && data.email) update.email = data.email.trim();
  if (typeof data.phone === "string") update.phone = data.phone.trim();
  if (typeof data.full_name === "string" && data.full_name.trim()) {
    const parts = data.full_name.trim().split(/\s+/);
    if (parts.length === 1) {
      update.firstName = parts[0];
      update.lastName = "";
    } else {
      update.lastName = parts.pop();
      update.firstName = parts.join(" ");
    }
  }
  if (data.address) {
    update.address = {
      street: data.address.street,
      city: data.address.city,
      state: data.address.state,
      zipCode: data.address.zip_code,
      country: data.address.country,
    };
  }

  const pl2 = payload as { uid?: string; _id?: string };
  const updated = await User.findByIdAndUpdate(pl2.uid || pl2._id, { $set: update }, { new: true })
    .select("firstName lastName email phone address userCode accountStatus createdAt lastLogin")
    .lean<{
      firstName?: string;
      lastName?: string;
      email: string;
      phone?: string;
      userCode: string;
      accountStatus?: "active" | "inactive";
      address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
      createdAt?: Date;
      lastLogin?: Date;
    }>();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full_name = [updated.firstName, updated.lastName].filter(Boolean).join(" ");
  const address = updated.address
    ? {
        street: updated.address.street,
        city: updated.address.city,
        state: updated.address.state,
        zip_code: updated.address.zipCode,
        country: updated.address.country,
      }
    : undefined;

  return NextResponse.json({
    user_code: updated.userCode,
    full_name,
    email: updated.email,
    phone: updated.phone,
    address,
    accountStatus: updated.accountStatus ?? undefined,
    createdAt: updated.createdAt ?? undefined,
    lastLogin: updated.lastLogin ?? undefined,
  });
}
