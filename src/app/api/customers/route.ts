// src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "warehouse")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    
    const query: Record<string, unknown> = { role: "customer" };
    
    if (search) {
      query.$or = [
        { userCode: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const customers = await User.find(query)
      .select("userCode firstName lastName email")
      .sort({ firstName: 1, lastName: 1 })
      .limit(50);

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
