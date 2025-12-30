import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/utils/passwordResetEmail';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Forgot Password API] Password reset request for:', body.email);

    // Validate input
    const validatedData = forgotPasswordSchema.parse(body);

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ 
      email: validatedData.email.toLowerCase() 
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log('[Forgot Password API] User not found:', validatedData.email);
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token using the User model method
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    console.log('[Forgot Password API] Reset token generated for user:', user.email);

    // Send password reset email
    try {
      const emailResult = await sendPasswordResetEmail({
        email: user.email,
        fullName: user.fullName || `${user.firstName} ${user.lastName}`,
        resetToken,
      });
      
      if (emailResult.success) {
        console.log('[Forgot Password API] Password reset email sent successfully');
      } else {
        console.error('[Forgot Password API] Failed to send password reset email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('[Forgot Password API] Error sending password reset email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('[Forgot Password API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
