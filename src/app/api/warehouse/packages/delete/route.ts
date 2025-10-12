import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { isWarehouseAuthorized } from "@/lib/rbac";
import { deletePackageSchema } from "@/lib/validators";

export async function POST(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deletePackageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trackingNumber } = parsed.data;

  const now = new Date();
  const pkg = await Package.findOneAndUpdate(
    { trackingNumber },
    {
      $set: { status: "Deleted", updatedAt: now },
      $push: { history: { status: "Deleted", at: now, note: "Deleted by warehouse" } },
    },
    { new: true }
  );

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, package: pkg });
}
