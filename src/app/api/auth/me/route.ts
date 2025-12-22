// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated', authenticated: false },
        { status: 401 }
      );
    }

    await dbConnect();

    // Check if admin
    const isAdmin = session.user.role === 'admin';
    
    let userData;
    if (isAdmin) {
      // For admin, return basic info
      userData = {
        id: session.user.id || 'admin',
        email: session.user.email,
        name: session.user.name || 'Admin',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
      };
    } else {
      // For regular users, fetch from database
      const user = await User.findOne({ email: session.user.email });
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found', authenticated: false },
          { status: 404 }
        );
      }

      // Get name from firstName/lastName or name field
      const fullName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.name || user.email;
      
      userData = {
        id: user._id.toString(),
        email: user.email,
        name: fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        userCode: user.userCode,
        phone: user.phone,
        address: user.address?.street,
        city: user.address?.city,
        state: user.address?.state,
        zipCode: user.address?.zipCode,
        country: user.address?.country,
        isActive: user.accountStatus === 'active',
        isVerified: user.emailVerified || false,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || null,
        role: user.role,
      };
    }

    return NextResponse.json({
      authenticated: true,
      user: userData,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        authenticated: false,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}