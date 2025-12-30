import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    await dbConnect();
    let body: unknown = null;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
    const schema = z.object({ email: z.string().trim().toLowerCase().email() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    const { email } = parsed.data;

    const user = await User.findOne({ email });
    // Always respond success to avoid leaking user existence
    if (!user) return NextResponse.json({ message: "If the email exists, a reset OTP has been sent." });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await PasswordResetToken.create({ userId: user._id, token: otp, expiresAt });

    console.log('[Password Reset] Generated OTP:', otp, 'for user:', email);

    // Send OTP via email (modify email template to send OTP instead of link)
    try {
      await sendPasswordResetEmail({ 
        to: user.email, 
        firstName: user.firstName, 
        resetUrl: `Your OTP is: ${otp}`, 
        isOtp: true 
      });
    } catch (emailError) {
      console.error('[Password Reset] Error sending OTP email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ message: "If the email exists, a reset OTP has been sent." });
  } catch (e) {
    console.error("/api/auth/password/request failed", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
