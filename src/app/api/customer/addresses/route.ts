import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { ShippingAddress } from '@/models/ShippingAddress';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const addresses = await ShippingAddress.find({ 
      userId: session.user.id,
      isActive: true 
    }).sort({ isDefault: -1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      addresses
    });

  } catch (error) {
    console.error('[Addresses API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load addresses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    await dbConnect();

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await ShippingAddress.updateMany(
        { userId: session.user.id },
        { isDefault: false }
      );
    }

    const address = new ShippingAddress({
      userId: session.user.id,
      label: body.label,
      contactName: body.contactName,
      phone: body.phone,
      address: body.address,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      country: body.country,
      addressType: body.addressType || 'both',
      notes: body.notes,
      isDefault: body.isDefault || false,
      isActive: true,
    });

    await address.save();

    return NextResponse.json({
      success: true,
      message: 'Address created successfully',
      address
    });

  } catch (error) {
    console.error('[Addresses API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create address' },
      { status: 500 }
    );
  }
}
