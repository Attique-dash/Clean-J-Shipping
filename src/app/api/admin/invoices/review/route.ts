// src/app/api/admin/invoices/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Package from '@/models/Package';
import User from '@/models/User';
import { Warehouse } from '@/models/Warehouse';
import { Types } from 'mongoose';

interface UserDoc {
  _id: Types.ObjectId;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  shippingId?: string;
  userCode?: string;
}

// Helper function to format address as string
function formatAddressAsString(address: unknown): string {
  if (!address) return 'N/A';
  
  // If it's already a string, return it
  if (typeof address === 'string') {
    // Check if it looks like a JSON object string
    if (address.trim().startsWith('{') && address.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(address);
        return formatAddressObject(parsed);
      } catch {
        return address;
      }
    }
    return address;
  }
  
  // If it's an object, format it
  if (typeof address === 'object' && address !== null) {
    return formatAddressObject(address as Record<string, string>);
  }
  
  return String(address);
}

function formatAddressObject(obj: Record<string, string>): string {
  const parts: string[] = [];
  
  if (obj.name) parts.push(obj.name);
  if (obj.street || obj.address) parts.push(obj.street || obj.address || '');
  if (obj.city || obj.state || obj.zipCode || obj.zip) {
    const cityParts = [obj.city, obj.state, obj.zipCode || obj.zip].filter(Boolean);
    if (cityParts.length) parts.push(cityParts.join(', '));
  }
  if (obj.country) parts.push(obj.country);
  if (obj.phone) parts.push(`Phone: ${obj.phone}`);
  if (obj.email) parts.push(`Email: ${obj.email}`);
  if (obj.instructions) parts.push(`Note: ${obj.instructions}`);
  
  return parts.join('\n') || 'N/A';
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

    // If status is 'all', show submitted, approved, rejected, and billed
    if (status === 'all') {
      query.invoiceStatus = { $in: ['submitted', 'approved', 'rejected', 'billed', 'pending'] };
    }

    // If status is 'pending', also show packages with no invoiceStatus (backward compatibility)
    if (status === 'pending') {
      query.$or = [
        { invoiceStatus: 'pending' },
        { invoiceStatus: { $exists: false } },
        { invoiceStatus: null }
      ];
    }

    // Add search filter
    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { shipper: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch packages with submitted invoices AND populate customer data properly
    // Note: Using regular find without .lean() to get proper population
    const packages = await Package.find(query)
      .populate('userId', '_id name firstName lastName email phone shippingId userCode')
      .sort({ invoiceSubmittedAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('Raw packages fetched:', packages.length);
    
    // Collect userIds that need manual fetching (if population failed)
    const userIdsToFetch: string[] = [];
    packages.forEach(pkg => {
      const userData = pkg.userId as unknown as UserDoc | null;
      // If userId exists but is not populated (no _id), we need to fetch it manually
      if (pkg.userId && (!userData || !userData._id)) {
        const userIdString = typeof pkg.userId === 'string' ? pkg.userId : (pkg.userId as any).toString();
        if (!userIdsToFetch.includes(userIdString)) {
          userIdsToFetch.push(userIdString);
        }
      }
    });
    
    console.log('UserIds that need manual fetch:', userIdsToFetch);
    
    // Fetch users manually if needed
    const userMap = new Map<string, UserDoc>();
    if (userIdsToFetch.length > 0) {
      const users = await User.find({ _id: { $in: userIdsToFetch } }).select('_id name firstName lastName email phone shippingId userCode');
      users.forEach(user => {
        userMap.set(user._id.toString(), user as unknown as UserDoc);
      });
      console.log('Manually fetched users:', users.length);
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
    const formattedPackages = packages.map((pkg) => {
      // Get populated customer data - without .lean(), userId should be populated
      let userData = pkg.userId as unknown as UserDoc | null;
      
      // If population didn't work, try to get from manual fetch map
      if ((!userData || !userData._id) && pkg.userId) {
        const userIdString = typeof pkg.userId === 'string' ? pkg.userId : (pkg.userId as any).toString();
        userData = userMap.get(userIdString) || null;
        console.log('Using manually fetched user for package:', pkg.trackingNumber, 'User:', userData?.name);
      }
      
      console.log('Processing package:', pkg.trackingNumber, 'Customer name:', userData?.name);
      
      // Get warehouse address based on service mode
      let warehouseAddress: string;
      
      // First check if package has warehouseLocation stored
      if (pkg.warehouseLocation) {
        warehouseAddress = formatAddressAsString(pkg.warehouseLocation);
      } else if (defaultWarehouse) {
        const serviceMode = pkg.serviceMode || 'air';
        let rawAddress: string | undefined;
        
        switch (serviceMode) {
          case 'air':
            rawAddress = defaultWarehouse.airAddress;
            break;
          case 'ocean':
          case 'sea':
            rawAddress = defaultWarehouse.seaAddress;
            break;
          default:
            rawAddress = defaultWarehouse.address;
        }
        
        warehouseAddress = formatAddressAsString(rawAddress);
      } else {
        warehouseAddress = 'N/A';
      }
      
      // Build customer object with proper name from populated user data
      let customer = null;
      if (userData && userData._id) {
        // Build full name from available fields
        let fullName = userData.name || '';
        if (!fullName && (userData.firstName || userData.lastName)) {
          fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        }
        // If still no name, use email as fallback
        if (!fullName) {
          fullName = userData.email ? userData.email.split('@')[0] : 'Customer';
        }
        
        customer = {
          id: userData._id.toString(),
          name: fullName || 'Unknown Customer',
          email: userData.email || '',
          phone: userData.phone || 'N/A',
          shippingId: userData.shippingId || userData.userCode || ''
        };
        console.log('Built customer:', customer.name, 'for package:', pkg.trackingNumber);
      } else {
        console.log('No user data found for package:', pkg.trackingNumber, 'userId:', pkg.userId);
      }
      
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
        isReceived: !!(pkg.dateReceived || pkg.createdAt),
        dateReceived: pkg.dateReceived?.toISOString() || pkg.createdAt?.toISOString(),
        invoiceSubmittedAt: pkg.invoiceSubmittedAt?.toISOString(),
        invoiceReviewedAt: pkg.invoiceReviewedAt?.toISOString(),
        invoiceReviewedBy: pkg.invoiceReviewedBy,
        invoiceRejectionReason: pkg.invoiceRejectionReason,
        
        // Price info
        pricePaid: pkg.pricePaid,
        pricePaidCurrency: pkg.pricePaidCurrency || 'USD',
        
        // Invoice files - handle both Cloudinary objects and string URLs
        invoiceFiles: (pkg.invoiceFiles || []).map((file: any) => {
          // If file is a Cloudinary object with url property
          if (typeof file === 'object' && file.url) {
            return file.url;
          }
          // If file is a string (legacy)
          if (typeof file === 'string') {
            const filename = file.split('/').pop();
            return `/api/invoices/download?file=${filename}`;
          }
          return String(file);
        }),
        
        // Customer info - properly populated from userId
        customer,
        
        // Package description
        itemDescription: pkg.itemDescription,
        itemCategory: pkg.itemCategory
      };
    });

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
