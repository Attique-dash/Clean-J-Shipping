import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Warehouse } from '@/models/Warehouse';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'customer');
    if (authError) {
      return authError;
    }

    await dbConnect();

    // Get customer information
    const userId = auth!.id || auth!._id || auth!.uid;
    const customer = await User.findById(userId).select('userCode mailboxNumber firstName lastName');
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get customer identifier (mailbox number or userCode)
    const customerIdentifier = customer.mailboxNumber || customer.userCode;
    const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Valued Customer';

    // Get active warehouses with shipping method addresses
    const warehouses = await Warehouse.find({ isActive: true })
      .select('name code address city state country airAddress seaAddress chinaAddress isDefault')
      .lean();

    // Get default warehouse or first active warehouse
    const defaultWarehouse = warehouses.find(w => w.isDefault) || warehouses[0];

    if (!defaultWarehouse) {
      return NextResponse.json({
        success: false,
        error: 'No active warehouse found'
      }, { status: 404 });
    }

    // Format addresses with customer info
    const formatAddress = (warehouseAddr: string | undefined, method: string) => {
      if (!warehouseAddr) {
        return {
          formatted: `Clean J Shipping
${customerName}
Mailbox: ${customerIdentifier}
[${method} Address Not Set - Please Contact Support]
Jamaica`,
          raw: null,
          complete: false
        };
      }

      return {
        formatted: `Clean J Shipping
${customerName}
Mailbox: ${customerIdentifier}
${warehouseAddr}
${defaultWarehouse.city}, ${defaultWarehouse.country}`,
        raw: warehouseAddr,
        complete: true,
        warehouse: {
          name: defaultWarehouse.name,
          code: defaultWarehouse.code,
          city: defaultWarehouse.city,
          country: defaultWarehouse.country
        }
      };
    };

    const shippingAddresses = {
      air: formatAddress(
        warehouses.find(w => w.airAddress)?.airAddress || defaultWarehouse.address,
        'Air'
      ),
      sea: formatAddress(
        warehouses.find(w => w.seaAddress)?.seaAddress || defaultWarehouse.address,
        'Sea'
      ),
      china: formatAddress(
        warehouses.find(w => w.chinaAddress)?.chinaAddress || defaultWarehouse.address,
        'China'
      ),
      customer: {
        name: customerName,
        mailboxNumber: customerIdentifier,
        userCode: customer.userCode
      }
    };

    return NextResponse.json({
      success: true,
      addresses: shippingAddresses,
      instructions: {
        air: 'Use this address when ordering from US online stores for air freight delivery',
        sea: 'Use this address when ordering from US online stores for sea freight delivery (slower but cheaper)',
        china: 'Use this address when ordering from China/Asia online stores'
      }
    });

  } catch (error) {
    console.error('Error fetching shipping addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping addresses' },
      { status: 500 }
    );
  }
}