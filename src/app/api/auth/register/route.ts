import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    // Connect to database
    const db = await dbConnect();
    
    // Make sure models are registered
    const UserModel = db.models.User || User;
    
    const body = await request.json();
    const { 
      fullName, 
      email, 
      phoneNo, 
      password, 
      adress, 
      city, 
      state, 
      zip_code, 
      country 
    } = body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Split full name
    const nameParts = (fullName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Generate unique user code
    const userCode = `C${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = new UserModel({
      userCode,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      phone: phoneNo,
      address: {
        street: adress,
        city,
        state,
        zipCode: zip_code,
        country,
      },
      role: 'customer',
      accountStatus: 'active',
      emailVerified: false,
    });

    // Save user to database
    await user.save();

    console.log('User created successfully:', user.userCode);

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        userCode: user.userCode,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    const errorMessage = error.code === 11000 ? 'Email already exists' : 'Error creating user';
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}