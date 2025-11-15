import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { comparePassword, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = raw as Partial<{ current_password: string; new_password: string; confirm_password: string }>;
  const current = (body.current_password || "").toString();
  const next = (body.new_password || "").toString();
  const confirm = (body.confirm_password || "").toString();

  if (!current || !next || !confirm) {
    return NextResponse.json({ error: "current_password, new_password and confirm_password are required" }, { status: 400 });
  }
  if (next.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }
  if (next !== confirm) {
    return NextResponse.json({ error: "Password confirmation does not match" }, { status: 400 });
  }

  const pl = payload as { uid?: string; _id?: string };
  const userId = pl.uid || pl._id;
  const user = userId
    ? await User.findById(userId)
        .select("passwordHash")
        .lean<{ passwordHash: string }>()
    : null;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ok = await comparePassword(current, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const newHash = await hashPassword(next);
  await User.findByIdAndUpdate(userId!, { $set: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
