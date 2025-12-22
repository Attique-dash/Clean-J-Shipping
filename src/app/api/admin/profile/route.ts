import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";

export async function GET(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = payload.uid || payload._id;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  try {
    const user = await User.findById(userId)
      .select("firstName lastName email userCode role createdAt")
      .lean<{
        firstName?: string;
        lastName?: string;
        email: string;
        userCode?: string;
        role?: string;
        createdAt?: Date;
      }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      userCode: user.userCode || "",
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = payload.uid || payload._id;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, email } = body;

    const update: Record<string, unknown> = {};
    
    if (typeof firstName === "string") {
      update.firstName = firstName.trim();
    }
    if (typeof lastName === "string") {
      update.lastName = lastName.trim();
    }
    if (typeof email === "string" && email.trim()) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.trim(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 400 }
        );
      }
      
      update.email = email.trim();
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true }
    )
      .select("firstName lastName email userCode role createdAt")
      .lean<{
        firstName?: string;
        lastName?: string;
        email: string;
        userCode?: string;
        role?: string;
        createdAt?: Date;
      }>();

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      firstName: updated.firstName || "",
      lastName: updated.lastName || "",
      email: updated.email,
      userCode: updated.userCode || "",
      role: updated.role,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

