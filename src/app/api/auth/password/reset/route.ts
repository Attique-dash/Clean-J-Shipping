import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await dbConnect();
    let body: unknown = null;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const token = typeof (body as any)?.token === "string" ? (body as any).token : null;
    const password = typeof (body as any)?.password === "string" ? (body as any).password : null;
    if (!token || !password) return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const rec = await PasswordResetToken.findOne({ token });
    if (!rec) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    if (rec.used) return NextResponse.json({ error: "Token already used" }, { status: 400 });
    if (rec.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Token expired" }, { status: 400 });

    const user = await User.findById(rec.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.passwordHash = await hashPassword(password);
    await user.save();

    rec.used = true;
    await rec.save();

    return NextResponse.json({ message: "Password reset successful" });
  } catch (e) {
    console.error("/api/auth/password/reset failed", e);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
