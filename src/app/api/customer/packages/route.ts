// src/app/api/customer/packages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Package } from '@/models/Package';
import { User } from '@/models/User';
import Invoice from '@/models/Invoice';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

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
    // Check both PascalCase (UserCode) and camelCase (userCode) fields
    if (userCode) {
      packageQuery.$or.push(
        { UserCode: userCode },  // KCD PascalCase field
        { userCode: userCode },  // Legacy camelCase field
        { customerCode: userCode }
      );
    }
    
    console.log('Package query:', JSON.stringify(packageQuery, null, 2));

    // Fetch both packages and invoices for this customer
    // Select both PascalCase (KCD) and camelCase (legacy) fields to ensure we get all data
    const [packages, invoices] = await Promise.all([
      Package.find(packageQuery)
      .select('TrackingNumber trackingNumber status itemDescription Description description weight Weight senderName senderEmail senderPhone senderAddress senderCountry currentLocation receiverName receiverEmail receiverPhone receiverAddress receiverCountry FirstName LastName updatedAt createdAt estimatedDelivery shippingCost totalAmount lastScan actualDelivery invoiceRecords itemValue value dimensions length width height dimensionUnit serviceMode customsRequired customsStatus paymentStatus paymentMethod amountPaid pricePaidCurrency dateReceived daysInStorage warehouseLocation Branch shipper warehouseAddresses userCode UserCode userId customer')
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
    
    // Debug: Log sample package data to understand field structure
    if (packages.length > 0) {
      console.log('Sample package data:', JSON.stringify(packages[0], null, 2));
    } else {
      console.log('No packages found. Checking if any packages exist in database...');
      const totalPackages = await Package.countDocuments({});
      console.log(`Total packages in database: ${totalPackages}`);
      
      // Check if there are packages with this userCode
      if (userCode) {
        const packagesByUserCode = await Package.countDocuments({ 
          $or: [
            { UserCode: userCode },
            { userCode: userCode }
          ]
        });
        console.log(`Packages with userCode ${userCode}: ${packagesByUserCode}`);
      }
      
      // Check if there are packages with this userId
      const packagesByUserId = await Package.countDocuments({ 
        $or: [
          { userId: userObjectId },
          { userId: userIdString }
        ]
      });
      console.log(`Packages with userId ${userIdString}: ${packagesByUserId}`);
    }

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

    // Map to response format - handle both PascalCase (KCD) and camelCase (legacy) fields
    const mapped = packages.map((p) => {
      const invoiceInfo = invoiceMap.get(p.trackingNumber || p.TrackingNumber) || { hasInvoice: false, invoiceNumber: null };
      
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
      
      // Helper to get value from either PascalCase or camelCase field
      const getVal = (pascalField: string, camelField: string, defaultValue: any = undefined) => {
        return (p as any)[pascalField] !== undefined ? (p as any)[pascalField] : 
               (p as any)[camelField] !== undefined ? (p as any)[camelField] : defaultValue;
      };
      
      const trackingNumber = getVal('TrackingNumber', 'trackingNumber', '');
      const description = getVal('Description', 'description') || getVal('itemDescription', 'itemDescription', '');
      const weight = getVal('Weight', 'weight', 0);
      const shipper = getVal('Shipper', 'shipper', 'Unknown Shipper');
      const currentLocation = getVal('currentLocation', 'currentLocation', '');
      const receiverName = getVal('receiverName', 'receiverName', '') || getVal('FirstName', 'FirstName', '');
      const estimatedDelivery = getVal('estimatedDelivery', 'estimatedDelivery');
      const shippingCost = getVal('shippingCost', 'shippingCost', 0);
      const totalAmount = getVal('totalAmount', 'totalAmount', 0);
      const itemValue = getVal('itemValue', 'itemValue') || getVal('value', 'value', 0);
      const lastScan = getVal('lastScan', 'lastScan');
      const actualDelivery = getVal('actualDelivery', 'actualDelivery');
      const length = getVal('Length', 'length', 0);
      const width = getVal('Width', 'width', 0);
      const height = getVal('Height', 'height', 0);
      const dimensionUnit = getVal('dimensionUnit', 'dimensionUnit', 'cm');
      const serviceMode = getVal('serviceMode', 'serviceMode', 'air');
      const customsRequired = getVal('customsRequired', 'customsRequired', false);
      const customsStatus = getVal('customsStatus', 'customsStatus', 'not_required');
      const paymentStatus = getVal('paymentStatus', 'paymentStatus', 'pending');
      const paymentMethod = getVal('paymentMethod', 'paymentMethod', 'cash');
      const amountPaid = getVal('amountPaid', 'amountPaid', 0);
      const pricePaidCurrency = getVal('pricePaidCurrency', 'pricePaidCurrency', 'USD');
      const dateReceived = getVal('dateReceived', 'dateReceived') || getVal('EntryDate', 'EntryDate');
      const daysInStorage = getVal('daysInStorage', 'daysInStorage', 0);
      const warehouseLocation = getVal('warehouseLocation', 'warehouseLocation') || getVal('Branch', 'Branch', 'Main Warehouse');
      const senderEmail = getVal('senderEmail', 'senderEmail', '');
      const senderPhone = getVal('senderPhone', 'senderPhone', '');
      const senderAddress = getVal('senderAddress', 'senderAddress', '');
      const senderCountry = getVal('senderCountry', 'senderCountry', '');
      const receiverEmail = getVal('receiverEmail', 'receiverEmail', '');
      const receiverPhone = getVal('receiverPhone', 'receiverPhone', '');
      const receiverAddress = getVal('receiverAddress', 'receiverAddress', '');
      const receiverCountry = getVal('receiverCountry', 'receiverCountry', '');
      const status = getVal('status', 'status', 'received');
      
      return {
        id: p._id,
        tracking_number: trackingNumber,
        trackingNumber: trackingNumber,
        status: status,
        description: description,
        itemDescription: description,
        weight_kg: weight,
        weight: weight ? `${weight} kg` : undefined,
        userCode: userCode,
        shipper: shipper,
        current_location: currentLocation,
        destination: receiverName || 'Receiver name only available',
        updated_at: p.updatedAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
        created_at: p.createdAt?.toISOString(),
        createdAt: p.createdAt?.toISOString(),
        estimated_delivery: estimatedDelivery?.toISOString(),
        invoice_status: invoiceStatus,
        hasInvoice: invoiceInfo.hasInvoice || hasAutoInvoice,
        invoiceNumber: invoiceInfo.invoiceNumber || (hasAutoInvoice ? `AUTO-${trackingNumber}` : null),
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        itemValueUsd: itemValue || 0,
        last_scan: lastScan?.toISOString(),
        actual_delivery: actualDelivery?.toISOString(),
        // Additional details from admin
        dimensions: (p as any).dimensions || {
          length: length,
          width: width,
          height: height,
          unit: dimensionUnit
        },
        serviceMode: serviceMode,
        customsRequired: customsRequired,
        customsStatus: customsStatus,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        amountPaid: amountPaid,
        pricePaidCurrency: pricePaidCurrency,
        dateReceived: dateReceived,
        daysInStorage: daysInStorage,
        warehouse_location: warehouseLocation,
        senderEmail: senderEmail,
        senderPhone: senderPhone,
        senderAddress: senderAddress,
        senderCountry: senderCountry,
        receiverName: receiverName,
        receiverEmail: receiverEmail,
        receiverPhone: receiverPhone,
        receiverAddress: receiverAddress,
        receiverCountry: receiverCountry,
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