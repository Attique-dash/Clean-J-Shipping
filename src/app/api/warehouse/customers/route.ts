import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User, IUser } from "@/models/User";
import { Package } from "@/models/Package";
import { isWarehouseAuthorized } from "@/lib/rbac";
import { FilterQuery } from "mongoose";

export async function GET(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const filter: FilterQuery<IUser> = { role: "customer" };
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { userCode: regex },
      { phone: regex },
      { "address.street": regex },
      { "address.city": regex },
      { "address.state": regex },
      { "address.zipCode": regex },
    ];
  }

  const customers = await User.find(filter)
    .select("userCode firstName lastName email phone address createdAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const userCodes = customers.map((c) => c.userCode);
  const activeStatuses = ["Unknown", "At Warehouse", "In Transit", "At Local Port"];
  const agg = await Package.aggregate<{ _id: string; count: number }>([
    { $match: { userCode: { $in: userCodes }, status: { $in: activeStatuses } } },
    { $group: { _id: "$userCode", count: { $sum: 1 } } },
  ]);
  const counts = new Map<string, number>(agg.map((a) => [a._id, a.count]));

  const results = customers.map((u) => {
    const full_name = [u.firstName, u.lastName].filter(Boolean).join(" ");
    const address_line = u.address
      ? [u.address.street, u.address.city, u.address.state, u.address.zipCode]
          .filter(Boolean)
          .join(", ")
      : undefined;
    return {
      user_code: u.userCode,
      full_name,
      email: u.email,
      phone: u.phone,
      address_line,
      active_packages: counts.get(u.userCode) || 0,
    };
  });

  return NextResponse.json({ customers: results, total_count: results.length });
}

export async function DELETE(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const user_code = (raw as { user_code?: unknown })?.user_code;
  if (typeof user_code !== "string" || !user_code.trim()) {
    return NextResponse.json({ error: "user_code is required" }, { status: 400 });
  }

  const deleted = await User.findOneAndDelete({ role: "customer", userCode: user_code.trim() });
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
