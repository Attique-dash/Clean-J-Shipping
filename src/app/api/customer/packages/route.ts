// src/app/api/customer/packages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Package } from '@/models/Package';
import { User } from '@/models/User';
import Invoice from '@/models/Invoice';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    console.log('Customer packages API called');
    
    // CRITICAL FIX: Always await getAuthFromRequest
    const auth = await getAuthFromRequest(req);
    
    console.log('Auth result:', auth ? 'Authenticated' : 'Not authenticated');
    
    // Check if user is authorized
    const authError = requireRole(auth, 'customer');
    if (authError) {
      console.log('Auth error:', authError);
      return authError;
    }

    // TypeScript now knows auth is not null - use consistent ID extraction
    const userIdString = auth!.id || auth!._id || auth!.uid;
    
    console.log('User ID extracted:', userIdString);

    if (!userIdString) {
      console.error('User ID not found in auth payload');
      return NextResponse.json(
        { error: 'User ID not found in authentication' },
        { status: 400 }
      );
    }

    console.log('Fetching packages for user:', userIdString);

    // Connect to database
    await dbConnect();

    // Get user information to include userCode in query (for KCD-synced packages)
    const user = (await User.findById(userIdString).select('userCode').lean()) as unknown as { userCode?: string } | null;
    const userCode = user?.userCode || '';
    
    console.log('User userCode for KCD package lookup:', userCode);

    // CRITICAL FIX: Convert userId string to ObjectId for proper MongoDB matching
    // Also query by userCode to catch packages synced from KCD that may have different ID formats
    const userObjectId = new Types.ObjectId(userIdString);
    
    const packageQuery: any = {
      $or: [
        { userId: userObjectId },
        { userId: userIdString },  // Also check string format for backward compatibility
      ]
    };
    
    // If user has a userCode, also include it in the query for KCD-synced packages
    if (userCode) {
      packageQuery.$or.push(
        { userCode: userCode },
        { customerCode: userCode }
      );
    }

    // Fetch both packages and invoices for this customer
    const [packages, invoices] = await Promise.all([
      Package.find(packageQuery)
      .select('trackingNumber status itemDescription weight senderName currentLocation receiverName receiverEmail receiverPhone receiverAddress receiverCountry updatedAt createdAt estimatedDelivery shippingCost totalAmount lastScan actualDelivery invoiceRecords itemValue value dimensions length width height dimensionUnit serviceMode customsRequired customsStatus paymentStatus dateReceived daysInStorage warehouseLocation senderEmail senderPhone senderAddress senderCountry shipper warehouseAddresses')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
      Invoice.find({ userId: new Types.ObjectId(userIdString) })
        .populate('package', 'trackingNumber')
        .select('invoiceNumber package status')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    console.log(`Found ${packages.length} packages and ${invoices.length} invoices for user ${userIdString} (userCode: ${userCode})`);

    // Create a map of invoice numbers to package tracking numbers
    const invoiceMap = new Map();
    invoices.forEach((invoice: any) => {
      // Check multiple ways to link invoice to package
      const trackingNumber = invoice.package?.trackingNumber || invoice.tracking_number;
      if (trackingNumber && invoice.invoiceNumber) {
        invoiceMap.set(trackingNumber, {
          hasInvoice: true,
          invoiceNumber: invoice.invoiceNumber
        });
      }
    });

    // Map to response format
    const mapped = packages.map((p) => {
      const invoiceInfo = invoiceMap.get(p.trackingNumber) || { hasInvoice: false, invoiceNumber: null };
      
      // Check for automatic invoice in package records
      const hasAutoInvoice = Array.isArray((p as any).invoiceRecords) && (p as any).invoiceRecords.length > 0;
      let invoiceStatus = 'pending';
      
      if (invoiceInfo.hasInvoice) {
        invoiceStatus = 'submitted';
      } else if (hasAutoInvoice) {
        invoiceStatus = 'submitted'; // Auto-generated invoice
      } else if ((p as any).totalAmount > 0 || (p as any).shippingCost > 0) {
        invoiceStatus = 'submitted'; // Has financial data
      }
      
      return {
        id: p._id,
        tracking_number: p.trackingNumber,
        trackingNumber: p.trackingNumber,
        status: p.status,
        description: p.itemDescription,
        weight_kg: p.weight,
        weight: p.weight ? `${p.weight} kg` : undefined,
        userCode: userCode,
        shipper: p.shipper || 'Unknown Shipper',
        current_location: p.currentLocation,
        destination: p.receiverName || 'Receiver name only available',
        updated_at: p.updatedAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
        created_at: p.createdAt?.toISOString(),
        createdAt: p.createdAt?.toISOString(),
        estimated_delivery: p.estimatedDelivery?.toISOString(),
        invoice_status: invoiceStatus,
        hasInvoice: invoiceInfo.hasInvoice || hasAutoInvoice,
        invoiceNumber: invoiceInfo.invoiceNumber || (hasAutoInvoice ? `AUTO-${p.trackingNumber}` : null),
        shipping_cost: p.shippingCost,
        total_amount: p.totalAmount,
        itemValueUsd: (p as any).itemValue || (p as any).value || 0,
        last_scan: p.lastScan?.toISOString(),
        actual_delivery: p.actualDelivery?.toISOString(),
        // Additional details from admin
        dimensions: (p as any).dimensions || {
          length: (p as any).length,
          width: (p as any).width,
          height: (p as any).height,
          unit: (p as any).dimensionUnit || 'cm'
        },
        serviceMode: (p as any).serviceMode || 'air',
        customsRequired: (p as any).customsRequired || false,
        customsStatus: (p as any).customsStatus || 'not_required',
        paymentStatus: (p as any).paymentStatus || 'pending',
        dateReceived: (p as any).dateReceived,
        daysInStorage: (p as any).daysInStorage || 0,
        warehouse_location: (p as any).warehouseLocation || 'Main Warehouse',
        senderEmail: (p as any).senderEmail || '',
        senderPhone: (p as any).senderPhone || '',
        senderAddress: (p as any).senderAddress || '',
        senderCountry: (p as any).senderCountry || '',
        receiverName: (p as any).receiverName || '',
        receiverEmail: (p as any).receiverEmail || '',
        receiverPhone: (p as any).receiverPhone || '',
        receiverAddress: (p as any).receiverAddress || '',
        receiverCountry: (p as any).receiverCountry || '',
      };
    });

    console.log('Successfully mapped packages and sending response');

    return NextResponse.json({
      packages: mapped,
      total_packages: mapped.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching packages:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch packages',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    );
  }
}