import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { isWarehouseAuthorized } from "@/lib/rbac";

export async function GET(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();
  const url = new URL(req.url);
  const tracking = (url.searchParams.get("tracking") || "").trim();
  if (!tracking) return NextResponse.json({ error: "tracking is required" }, { status: 400 });
  const exists = !!(await Package.exists({ trackingNumber: tracking }));
  return NextResponse.json({ exists });
}
