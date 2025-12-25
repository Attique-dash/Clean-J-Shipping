// src/app/api/warehouse/packages/unknown/count/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const count = await Package.countDocuments({ status: "unknown" });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error counting unknown packages:", error);
    return NextResponse.json({ error: "Failed to count unknown packages" }, { status: 500 });
  }
}
