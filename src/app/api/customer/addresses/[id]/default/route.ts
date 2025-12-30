import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { ShippingAddress } from '@/models/ShippingAddress';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    await dbConnect();

    // Check if address belongs to user
    const address = await ShippingAddress.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    // Unset all other defaults
    await ShippingAddress.updateMany(
      { userId: session.user.id },
      { isDefault: false }
    );

    // Set this address as default
    await ShippingAddress.findByIdAndUpdate(id, {
      isDefault: true
    });

    return NextResponse.json({
      success: true,
      message: 'Default address updated successfully'
    });

  } catch (error) {
    console.error('[Address Default API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update default address' },
      { status: 500 }
    );
  }
}
