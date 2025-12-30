import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    await dbConnect();
    let body: unknown = null;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { token, password, email } = parsed.data;

    // Find the reset token
    const rec = await PasswordResetToken.findOne({ token, used: false });
    if (!rec) return NextResponse.json({ error: "Invalid or expired token/OTP" }, { status: 400 });
    
    if (rec.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Token/OTP expired" }, { status: 400 });
    }

    const user = await User.findById(rec.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Validate email if provided (for OTP flow)
    if (email && user.email !== email.toLowerCase()) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
    }

    user.passwordHash = await hashPassword(password);
    await user.save();

    rec.used = true;
    await rec.save();

    console.log('[Password Reset] Password reset successful for user:', user.email);

    return NextResponse.json({ message: "Password reset successful" });
  } catch (e) {
    console.error("/api/auth/password/reset failed", e);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
