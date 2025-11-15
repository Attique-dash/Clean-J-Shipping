import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json(
        { error: "If an account exists with this email, a verification link has been sent" },
        { status: 200 } // Don't reveal if user exists or not
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Generate verification token (you might want to use a more secure method)
    const verificationToken = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    // Send verification email
    await sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verifyUrl,
    });

    return NextResponse.json(
      { message: "Verification email sent. Please check your inbox." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in resend-verification:", error);
    return NextResponse.json(
      { error: "Failed to process verification request" },
      { status: 500 }
    );
  }
}
