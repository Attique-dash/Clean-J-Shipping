import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getAllowedWarehouseKeys } from "@/lib/rbac";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("id") || ""; // APITOKEN expected via ?id=

  const allowed = getAllowedWarehouseKeys();
  if (!token || !allowed.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const customers = await User.find({ role: "customer" })
    .select("userCode firstName lastName branch serviceTypeIDs")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  // Map to required payload shape (array of objects)
  const payload = customers.map((c: any) => ({
    UserCode: c.userCode || "",
    FirstName: c.firstName || "",
    LastName: c.lastName || "",
    Branch: c.branch || "",
    CustomerServiceTypeID: "", // Not tracked; left empty as per example
    CustomerLevelInstructions: "", // Not tracked; left empty as per example
    CourierServiceTypeID: "", // Not tracked; left empty as per example
    CourierLevelInstructions: "", // Not tracked; left empty as per example
  }));

  return NextResponse.json(payload);
}
