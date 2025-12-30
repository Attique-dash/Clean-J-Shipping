import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { ShippingAddress } from '@/models/ShippingAddress';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
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

    const body = await request.json();
    
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

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await ShippingAddress.updateMany(
        { userId: session.user.id, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    // Update address
    const updatedAddress = await ShippingAddress.findByIdAndUpdate(
      id,
      {
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
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Address updated successfully',
      address: updatedAddress
    });

  } catch (error) {
    console.error('[Address API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Don't allow deletion of default address if it's the only one
    const totalAddresses = await ShippingAddress.countDocuments({
      userId: session.user.id,
      isActive: true
    });

    if (totalAddresses <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only address. Add another address first.' },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await ShippingAddress.findByIdAndUpdate(id, {
      isActive: false
    });

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('[Address API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}
