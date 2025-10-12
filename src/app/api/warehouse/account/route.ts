import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";

export async function GET(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "warehouse" || !payload.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = await User.findById(payload.uid).select("firstName lastName email branch userCode role createdAt updatedAt");
  return NextResponse.json({ user: me });
}

export async function PUT(req: Request) {
  await dbConnect();
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "warehouse" || !payload.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const data = body as Partial<{ firstName: string; lastName: string; email: string; branch?: string; password?: string }>;

  const update: Record<string, unknown> = {};
  if (typeof data.firstName === "string") update.firstName = data.firstName;
  if (typeof data.lastName === "string") update.lastName = data.lastName;
  if (typeof data.email === "string") update.email = data.email;
  if (typeof data.branch === "string") update.branch = data.branch;
  if (typeof data.password === "string" && data.password.trim().length >= 6) {
    update.passwordHash = await hashPassword(data.password.trim());
  }

  const updated = await User.findOneAndUpdate({ _id: payload.uid, role: "warehouse" }, { $set: update }, { new: true }).select("firstName lastName email branch userCode role");
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, user: updated });
}
