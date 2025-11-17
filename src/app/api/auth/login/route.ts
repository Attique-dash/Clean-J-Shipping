// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { signIn } from 'next-auth/react';
import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';
import { comparePassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if this is admin login from .env
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      // Find or create admin user
      let admin = await User.findOne({ email: adminEmail, role: 'admin' });
      
      if (!admin) {
        // Create admin user if doesn't exist
        const { hashPassword } = await import('@/lib/auth');
        const passwordHash = await hashPassword(adminPassword);
        
        admin = await User.create({
          userCode: `A${Date.now()}`,
          firstName: 'Admin',
          lastName: 'User',
          email: adminEmail,
          passwordHash,
          role: 'admin',
          accountStatus: 'active',
          emailVerified: true,
        });
      }

      // Use NextAuth signIn
      const result = await signIn('credentials', {
        redirect: false,
        email: adminEmail,
        password: adminPassword,
      });

      if (result?.error) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: admin._id.toString(),
          email: admin.email,
          role: 'admin',
          name: `${admin.firstName} ${admin.lastName}`,
        }
      });
    }

    // Find regular user in database
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Use NextAuth signIn for session management
    const result = await signIn('credentials', {
      redirect: false,
      email: user.email,
      password: password,
    });

    if (result?.error) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}