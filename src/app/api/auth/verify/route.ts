import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { EmailToken } from "@/models/EmailToken";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const token = url.searchParams.get("t");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const rec = await EmailToken.findOne({ token });
    if (!rec) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    if (rec.used) return NextResponse.json({ error: "Token already used" }, { status: 400 });
    if (rec.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    await User.updateOne({ _id: rec.userId }, { $set: { emailVerified: true } });
    rec.used = true;
    await rec.save();

    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/login?verified=1`
      : "/login?verified=1";
    return NextResponse.redirect(redirectTo);
  } catch (e) {
    console.error("/api/auth/verify failed", e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
