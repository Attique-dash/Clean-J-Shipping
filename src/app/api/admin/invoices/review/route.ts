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

    // Fetch packages with submitted invoices AND populate customer data
    const packages = await Package.find(query)
      .populate({
        path: 'userId',
        model: 'User',
        select: '_id name email phone shippingId'
      })
      .sort({ invoiceSubmittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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
      // userId is now populated with customer data
      const customer = pkg.userId as unknown as UserDoc | null;
      
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
      
      return {
        packageId: (pkg._id as Types.ObjectId)?.toString(),
        trackingNumber: pkg.trackingNumber,
        shipper: pkg.shipper || pkg.senderName || 'N/A',
        weight: pkg.weight,
        serviceMode: pkg.serviceMode || 'air',
        dateReceived: pkg.dateReceived?.toISOString(),
        warehouseLocation: warehouseAddress,
        
        // Invoice details
        invoiceStatus: pkg.invoiceStatus,
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
        
        // Customer info - now properly populated
        customer: customer ? {
          id: customer._id?.toString(),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          shippingId: customer.shippingId
        } : null,
        
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
