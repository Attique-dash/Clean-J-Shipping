import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  await dbConnect();

  const email = "admin@example.com";
  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json({ message: "Admin already exists", userCode: existing.userCode });
  }

  const passwordHash = await hashPassword("admin123");
  const user = await User.create({
    userCode: `A${Date.now()}`,
    firstName: "Admin",
    lastName: "User",
    email,
    passwordHash,
    role: "admin",
  });

  return NextResponse.json({ message: "Admin created", email, password: "admin123", userCode: user.userCode });
}
