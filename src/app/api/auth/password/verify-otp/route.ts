import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { z } from "zod";

const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Verify OTP API] OTP verification request for:', body.email);

    // Validate input
    const validatedData = verifyOtpSchema.parse(body);

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ 
      email: validatedData.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find the reset token by OTP (using OTP as token for simplicity)
    const resetToken = await PasswordResetToken.findOne({ 
      token: validatedData.otp,
      userId: user._id,
      used: false
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    if (resetToken.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "OTP has expired" },
        { status: 400 }
      );
    }

    console.log('[Verify OTP API] OTP verified successfully for user:', user.email);

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully"
    });

  } catch (error) {
    console.error('[Verify OTP API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
