import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  await dbConnect();

  const userCode = "C176824610743581L";
  const email = "attiqueshafeeq246@gmail.com";
  const existing = await User.findOne({ userCode });
  if (existing) {
    return NextResponse.json({ message: "Customer already exists", userCode: existing.userCode });
  }

  const passwordHash = await hashPassword("test123");
  const user = await User.create({
    userCode,
    firstName: "Muhammad",
    lastName: "Attique",
    email,
    passwordHash,
    role: "customer",
    accountStatus: "active",
    emailVerified: true,
    registrationStep: 3
  });

  return NextResponse.json({ 
    message: "Customer created", 
    email, 
    password: "test123", 
    userCode: user.userCode,
    userId: user._id
  });
}
