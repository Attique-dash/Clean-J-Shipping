import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('_id email role accountStatus emailVerified registrationStep passwordHash');
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        registrationStep: user.registrationStep,
        hasPasswordHash: !!user.passwordHash
      }
    });
    
  } catch (error: any) {
    console.error("Staff check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
