import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { deletePackageSchema } from "@/lib/validators";

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const parsed = deletePackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trackingNumber } = parsed.data;
  const pkg = await Package.findOne({ trackingNumber });
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  pkg.status = "Deleted";
  pkg.history.push({ status: "Deleted", at: new Date(), note: "Marked deleted by Tasoko" });
  await pkg.save();

  return NextResponse.json({ message: "Package deleted", package: pkg });
}
