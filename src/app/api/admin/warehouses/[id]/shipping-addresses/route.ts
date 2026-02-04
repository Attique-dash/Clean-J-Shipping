import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Warehouse } from '@/models/Warehouse';

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'admin');
    if (authError) {
      return authError;
    }

    const body = await req.json();
    const { warehouseId, airAddress, seaAddress, chinaAddress } = body;

    if (!warehouseId) {
      return NextResponse.json(
        { error: 'Warehouse ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const warehouse = await Warehouse.findByIdAndUpdate(
      warehouseId,
      {
        airAddress: airAddress || undefined,
        seaAddress: seaAddress || undefined,
        chinaAddress: chinaAddress || undefined,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Shipping addresses updated successfully',
      warehouse: {
        id: warehouse._id,
        name: warehouse.name,
        airAddress: warehouse.airAddress,
        seaAddress: warehouse.seaAddress,
        chinaAddress: warehouse.chinaAddress
      }
    });

  } catch (error) {
    console.error('Error updating shipping addresses:', error);
    return NextResponse.json(
      { error: 'Failed to update shipping addresses' },
      { status: 500 }
    );
  }
}
