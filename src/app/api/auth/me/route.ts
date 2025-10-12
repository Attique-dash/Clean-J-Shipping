import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getAuthFromCookies } from "@/lib/auth";

export async function GET() {
  await dbConnect();
  const auth = await getAuthFromCookies();
  if (!auth) return NextResponse.json({ user: null });

  // Handle admin token without a DB uid
  if (!auth.uid && auth.role === "admin") {
    return NextResponse.json({
      user: {
        id: null,
        user_code: "ADMIN",
        role: "admin",
        full_name: "Administrator",
        email: process.env.ADMIN_EMAIL || "admin",
        phone: undefined,
        address: undefined,
        account_status: "active",
        member_since: undefined,
        last_login: undefined,
      },
    });
  }

  const user = await User.findById(auth.uid).select(
    "firstName lastName email role userCode phone address createdAt lastLogin accountStatus"
  );
  if (!user) return NextResponse.json({ user: null });

  const full_name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const member_since = user.createdAt ? user.createdAt.toISOString() : undefined;
  const last_login = user.lastLogin ? user.lastLogin.toISOString() : undefined;
  const address = user.address
    ? {
        street: user.address.street,
        city: user.address.city,
        state: user.address.state,
        zip_code: user.address.zipCode,
        country: user.address.country,
      }
    : undefined;

  return NextResponse.json({
    user: {
      id: String(user._id),
      user_code: user.userCode,
      role: user.role,
      full_name,
      email: user.email,
      phone: user.phone,
      address,
      account_status: user.accountStatus || "active",
      member_since,
      last_login,
    },
  });
}
