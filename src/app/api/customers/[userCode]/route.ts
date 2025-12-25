import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(
  req: Request,
  { params }: { params: { userCode: string } }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "warehouse")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const { userCode } = params;

    const customer = await User.findOne({ 
      userCode, 
      role: "customer" 
    }).select(
      "userCode firstName lastName email phone address accountStatus emailVerified"
    );

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}
