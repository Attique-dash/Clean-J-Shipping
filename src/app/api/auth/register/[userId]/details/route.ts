import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await dbConnect();
    
    const resolvedParams = await params;
    const { userId } = resolvedParams;
    const body = await request.json();
    
    const {
      phone,
      address,
      city,
      state,
      zipCode,
      country = 'Jamaica',
    } = body;

    // Validate required fields
    if (!phone || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { success: false, error: 'All address fields are required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already completed this step
    if (user.registrationStep >= 2) {
      return NextResponse.json(
        { success: false, error: 'Profile already completed' },
        { status: 400 }
      );
    }

    // Update user with additional details
    user.phone = phone;
    user.address = {
      street: address,
      city,
      state,
      zipCode,
      country
    };
    
    // Assign unique warehouse shipping address for customer
    // Format: Clean J Shipping, [UserCode], Warehouse A, [City], [Country]
    const warehouseAddress = {
      street: `Clean J Shipping, ${user.userCode}`,
      city: city || 'Kingston',
      state: state || 'Kingston',
      zipCode: zipCode || '00000',
      country: country || 'Jamaica',
      warehouse: 'Warehouse A', // Can be assigned based on location or load balancing
      isWarehouseAddress: true, // Flag to identify this as the warehouse address
    };
    
    // Store warehouse address separately or as primary shipping address
    // For now, we'll store it in a separate field or use the address field
    // The customer will use this address for all online purchases
    (user as any).warehouseAddress = warehouseAddress;
    
    // Mark registration as complete
    user.registrationStep = 2;
    user.accountStatus = 'active';
    
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        userCode: user.userCode,
        role: user.role,
      },
      nextStep: '/customer/dashboard'
    });

  } catch (error: unknown) {
    console.error('Profile update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}