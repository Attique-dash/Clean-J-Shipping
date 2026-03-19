// src/app/api/admin/invoices/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { dbConnect } from '@/lib/db';
import Package from '@/models/Package';
import User from '@/models/User';
import { Warehouse } from '@/models/Warehouse';
import { Types } from 'mongoose';

interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  shippingId?: string;
}

// GET - Fetch all submitted invoices for admin review
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'submitted';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {
      invoiceStatus: status
    };

    // If status is 'all', show submitted, approved, and rejected
    if (status === 'all') {
      query.invoiceStatus = { $in: ['submitted', 'approved', 'rejected'] };
    }

    // Add search filter
    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { shipper: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch packages with submitted invoices AND populate customer data properly
    const packages = await Package.find(query)
      .populate('userId', '_id name email phone shippingId')
      .sort({ invoiceSubmittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log('Raw packages fetched:', packages.length);
    if (packages.length > 0) {
      console.log('First package userId:', packages[0].userId);
    }

    // Get total count
    const total = await Package.countDocuments(query);

    // Fetch default warehouse for address lookup
    const defaultWarehouse = await Warehouse.findOne({ isDefault: true, isActive: true }).lean() as {
      airAddress?: string;
      seaAddress?: string;
      address?: string;
    } | null;

    // Format response
    const formattedPackages = await Promise.all(packages.map(async (pkg) => {
      // Get populated customer data
      const customerData = pkg.userId as unknown as UserDoc | null;
      
      console.log('Processing package:', pkg.trackingNumber, 'Customer:', customerData);
      
      // Get warehouse address based on service mode
      let warehouseAddress = pkg.warehouseLocation || 'N/A';
      
      if (defaultWarehouse) {
        const serviceMode = pkg.serviceMode || 'air';
        switch (serviceMode) {
          case 'air':
            warehouseAddress = defaultWarehouse.airAddress || defaultWarehouse.address || 'N/A';
            break;
          case 'ocean':
          case 'sea':
            warehouseAddress = defaultWarehouse.seaAddress || defaultWarehouse.address || 'N/A';
            break;
          default:
            warehouseAddress = defaultWarehouse.address || 'N/A';
        }
      }
      
      // Build customer object with proper name
      const customer = customerData ? {
        id: customerData._id?.toString(),
        name: customerData.name || 'Unknown Customer',
        email: customerData.email || '',
        phone: customerData.phone || 'N/A',
        shippingId: customerData.shippingId || `CJS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      } : null;
      
      return {
        packageId: (pkg._id as Types.ObjectId)?.toString(),
        trackingNumber: pkg.trackingNumber,
        shipper: pkg.shipper || pkg.senderName || 'N/A',
        weight: pkg.weight,
        serviceMode: pkg.serviceMode || 'air',
        // Invoice details
        invoiceStatus: pkg.invoiceStatus,
        warehouseLocation: warehouseAddress,
        
        // Package info
        isReceived: !!pkg.dateReceived,
        dateReceived: pkg.dateReceived?.toISOString(),
        invoiceSubmittedAt: pkg.invoiceSubmittedAt?.toISOString(),
        invoiceReviewedAt: pkg.invoiceReviewedAt?.toISOString(),
        invoiceReviewedBy: pkg.invoiceReviewedBy,
        invoiceRejectionReason: pkg.invoiceRejectionReason,
        
        // Price info
        pricePaid: pkg.pricePaid,
        pricePaidCurrency: pkg.pricePaidCurrency || 'USD',
        
        // Invoice files - convert to download URLs
        invoiceFiles: (pkg.invoiceFiles || []).map((file: string) => {
          const filename = file.split('/').pop();
          return `/api/invoices/download?file=${filename}`;
        }),
        
        // Customer info - properly populated from userId
        customer,
        
        // Package description
        itemDescription: pkg.itemDescription,
        itemCategory: pkg.itemCategory
      };
    }));

    return NextResponse.json({
      success: true,
      data: formattedPackages,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching submitted invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submitted invoices' },
      { status: 500 }
    );
  }
}
