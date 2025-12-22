import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const { email, password, firstName, lastName } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ 
        error: "User already exists", 
        userCode: existing.userCode,
        role: existing.role 
      }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      userCode: `A${Date.now()}`,
      firstName: firstName || "Admin",
      lastName: lastName || "User",
      email: email.toLowerCase(),
      passwordHash,
      role: "admin",
      accountStatus: "active",
      emailVerified: true,
      registrationStep: 4,
    });

    return NextResponse.json({ 
      message: "Admin created successfully", 
      email: user.email,
      userCode: user.userCode,
      role: user.role,
      instructions: {
        login: "/login",
        credentials: { email, password }
      }
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}
