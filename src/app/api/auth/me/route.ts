// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import { IUser } from '@/models/User';
import { authOptions } from '@/lib/auth';
import { Schema, model, models } from 'mongoose';

// Define the User model if it doesn't exist
const User = models.User || model<IUser>('User', new Schema({
  userCode: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "customer", "warehouse"], required: true },
  emailVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  // Add other fields as needed
}));

interface UserResponse {
  id: string;
  email: string;
  role: string;
  userCode: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  lastLogin?: string;
}

interface ErrorResponse {
  error: string;
  authenticated: boolean;
  details?: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    // Connect to database first to ensure we can query
    await dbConnect();
    
    // Get session
    const session = await getServerSession(authOptions);
    
    // If no session, return 401
    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          error: 'Not authenticated', 
          authenticated: false 
        } as ErrorResponse,
        { status: 401 }
      );
    }

    try {
      // Find user without password hash
      const user = await User.findOne({ email: session.user.email })
        .select('-passwordHash')
        .lean();
      
      if (!user) {
        return NextResponse.json(
          { 
            error: 'User not found', 
            authenticated: false 
          } as ErrorResponse,
          { status: 404 }
        );
      }

      // Format user data for response
      const userResponse: UserResponse = {
        id: user._id?.toString() || '',
        email: user.email,
        role: user.role,
        userCode: user.userCode,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin?.toISOString()
      };

      return NextResponse.json({
        authenticated: true,
        user: userResponse,
      });
      
    } catch (dbError) {
      console.error('Database error in /api/auth/me:', dbError);
      return NextResponse.json(
        { 
          error: 'Error fetching user data', 
          authenticated: true,
          details: process.env.NODE_ENV === 'development' ? dbError : undefined
        } as ErrorResponse,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        authenticated: false,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      } as ErrorResponse,
      { status: 500 }
    );
  }
}