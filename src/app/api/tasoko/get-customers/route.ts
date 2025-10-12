import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";

// GET: returns list of customers for warehouse (Tasoko)
export async function GET() {
  await dbConnect();
  const customers = await User.find({ role: "customer" }).select(
    "userCode firstName lastName branch serviceTypeIDs"
  );
  return NextResponse.json(customers);
}
