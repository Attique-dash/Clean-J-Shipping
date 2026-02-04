import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Warehouse } from '@/models/Warehouse';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'customer');
    if (authError) {
      return authError;
    }

    await dbConnect();

    // Get active warehouses with shipping method addresses
    const warehouses = await Warehouse.find({ isActive: true })
      .select('name code address city state country airAddress seaAddress chinaAddress')
      .lean();

    // Format the response
    const shippingAddresses = {
      air: warehouses.find(w => w.airAddress)?.airAddress || warehouses.find(w => w.isDefault)?.address || 'Air Warehouse Address - Not Set',
      sea: warehouses.find(w => w.seaAddress)?.seaAddress || warehouses.find(w => w.isDefault)?.address || 'Sea Warehouse Address - Not Set', 
      china: warehouses.find(w => w.chinaAddress)?.chinaAddress || warehouses.find(w => w.isDefault)?.address || 'China Warehouse Address - Not Set'
    };

    return NextResponse.json({
      success: true,
      addresses: shippingAddresses,
      warehouses: warehouses.map(w => ({
        name: w.name,
        code: w.code,
        address: w.address,
        city: w.city,
        country: w.country,
        airAddress: w.airAddress,
        seaAddress: w.seaAddress,
        chinaAddress: w.chinaAddress
      }))
    });

  } catch (error) {
    console.error('Error fetching shipping addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping addresses' },
      { status: 500 }
    );
  }
}
