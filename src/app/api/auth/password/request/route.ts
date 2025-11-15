import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import crypto from "crypto";
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
    if (!user) return NextResponse.json({ message: "If the email exists, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await PasswordResetToken.create({ userId: user._id, token, expiresAt });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
    const resetUrl = `${baseUrl}/password-reset?t=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({ to: user.email, firstName: user.firstName, resetUrl });

    return NextResponse.json({ message: "If the email exists, a reset link has been sent." });
  } catch (e) {
    console.error("/api/auth/password/request failed", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
