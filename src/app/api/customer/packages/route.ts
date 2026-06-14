// FIXED: src/app/api/customer/packages/route.ts
// Key changes:
// 1. Added .populate('userId', ...) to get customer name/email/phone
// 2. Added all payment fields to .select()
// 3. Fixed field mapping to match what admin portal shows
// 4. Added KCD PascalCase fields (TrackingNumber, Weight, Branch, etc.)
// 5. Properly map paymentStatus, amountPaid, totalAmount, pricePaidCurrency

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Package } from '@/models/Package';
import { User } from '@/models/User';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const authError = requireRole(auth, 'customer');
    if (authError) return authError;

    const userIdString = auth!.id || auth!._id || auth!.uid;
    if (!userIdString) {
      return NextResponse.json({ error: 'User ID not found in authentication' }, { status: 400 });
    }

    await dbConnect();

    // Get user info including userCode
    const userDoc = await User.findById(userIdString)
      .select('userCode firstName lastName email phone shippingId')
      .lean() as { userCode?: string; firstName?: string; lastName?: string; email?: string; phone?: string; shippingId?: string } | null;

    const userCode = userDoc?.userCode || '';
    const userObjectId = new Types.ObjectId(userIdString);

    // Build query matching both userId and userCode (for KCD-synced packages)
    const packageQuery: any = {
      $or: [
        { userId: userObjectId },
        { userId: userIdString },
      ]
    };
    if (userCode) {
      packageQuery.$or.push(
        { UserCode: userCode },
        { userCode: userCode },
        { customerCode: userCode }
      );
    }

    // Fetch packages with userId populated to get customer details
    const packages = await Package.find(packageQuery)
      .populate('userId', 'firstName lastName email phone userCode shippingId')
      .select([
        // KCD PascalCase fields
        'TrackingNumber', 'UserCode', 'Weight', 'Branch', 'Shipper',
        'Description', 'EntryDate', 'PackageStatus', 'PackagePayments',
        'Pieces', 'Length', 'Width', 'Height',
        // camelCase fields
        'trackingNumber', 'userCode', 'weightLbs', 'weight', 'branch',
        'shipper', 'description', 'itemDescription', 'entryDate', 'status',
        'serviceMode', 'dateReceived', 'createdAt', 'updatedAt',
        // Payment fields
        'paymentStatus', 'paymentMethod', 'amountPaid', 'totalAmount',
        'itemValue', 'itemValueUSD', 'value', 'pricePaid', 'pricePaidCurrency',
        'paymentCurrency', 'amountPaidCurrency', 'PackagePayments',
        // Location/warehouse
        'warehouseLocation', 'currentLocation',
        // Invoice fields
        'invoiceStatus', 'invoiceUploaded', 'invoiceFiles', 'invoiceSubmittedAt',
        'billingInvoiceId',
        // Sender/receiver info
        'senderName', 'senderEmail', 'senderPhone', 'senderAddress', 'senderCountry',
        'receiverName', 'receiverEmail', 'receiverPhone', 'receiverAddress', 'receiverCountry',
        // Billing breakdown fields
        'dutyPercent', 'gctPercent', 'freight', 'processingFee', 'badAddressFee', 'storageFee',
        // Tracking detail fields
        'houseAwb', 'trackingNum', 'manifest', 'merchant', 'rateGroup',
        'commercialInvoice', 'hsCode', 'collection',
        // Dimensions
        'dimensions', 'dimensionUnit',
        // Misc
        'userId', 'specialInstructions',
      ].join(' '))
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Helper: get value from either PascalCase or camelCase, with fallback
    const getVal = (doc: any, ...keys: string[]) => {
      for (const key of keys) {
        if (doc[key] !== undefined && doc[key] !== null && doc[key] !== '') {
          return doc[key];
        }
      }
      return undefined;
    };

    // Parse PackagePayments string to extract payment amounts - using same logic as admin portal
    const parsePayments = (paymentStr: string, doc: any) => {
      let itemValueUsd = 0;
      let shippingCostUsd = 0;
      let totalAmountUsd = 0;
      let amountPaidUsd = 0;
      let currency = 'USD';
      let paymentStatus = 'pending';
      let paymentMethod = 'cash';

      // Try PackagePayments as JSON first (KCD format)
      if (typeof paymentStr === 'string' && paymentStr.length > 0) {
        try {
          const parsed = JSON.parse(paymentStr);
          itemValueUsd = parseFloat(parsed.itemValueUsd) || 0;
          shippingCostUsd = parseFloat(parsed.shippingCostUsd) || 0;
          totalAmountUsd = parseFloat(parsed.totalAmountUsd) || 0;
          amountPaidUsd = parseFloat(parsed.amountPaidUsd) || 0;
          currency = parsed.currency || 'USD';
          paymentStatus = parsed.paymentStatus || 'pending';
          paymentMethod = parsed.paymentMethod || 'cash';
        } catch {
          // Try pipe-delimited format (legacy)
          const pairs = paymentStr.split('|');
          for (const pair of pairs) {
            const [key, val] = pair.split('=');
            switch (key) {
              case 'ItemValueUSD': itemValueUsd = parseFloat(val) || 0; break;
              case 'ShippingCostUSD': shippingCostUsd = parseFloat(val) || 0; break;
              case 'TotalAmountUSD': totalAmountUsd = parseFloat(val) || 0; break;
              case 'AmountPaidUSD': amountPaidUsd = parseFloat(val) || 0; break;
              case 'Currency': currency = val || 'USD'; break;
              case 'PaymentStatus': paymentStatus = val || 'pending'; break;
              case 'PaymentMethod': paymentMethod = val || 'cash'; break;
            }
          }
        }
      }

      // Fall back to direct fields if PackagePayments didn't have them
      if (itemValueUsd === 0) {
        itemValueUsd = parseFloat(String(doc.itemValueUSD || doc.itemValueUsd || doc.itemValue || doc.value || doc.pricePaid || 0));
      }
      if (totalAmountUsd === 0) {
        totalAmountUsd = parseFloat(String(doc.totalAmount || doc.total_amount || 0)) || itemValueUsd;
      }
      if (amountPaidUsd === 0) {
        amountPaidUsd = parseFloat(String(doc.amountPaid || 0));
      }
      if (currency === 'USD') {
        currency = doc.pricePaidCurrency || doc.paymentCurrency || doc.amountPaidCurrency || 'USD';
      }
      if (paymentStatus === 'pending') {
        paymentStatus = doc.paymentStatus || 'pending';
      }
      if (paymentMethod === 'cash') {
        paymentMethod = doc.paymentMethod || 'cash';
      }

      return { itemValueUsd, shippingCostUsd, totalAmountUsd, amountPaidUsd, currency, paymentStatus, paymentMethod };
    };

    // Map packages to response — same fields admin sees
    const mapped = packages.map((p: any) => {
      // Get populated user data
      const populatedUser = typeof p.userId === 'object' && p.userId !== null && p.userId.email
        ? p.userId
        : null;

      // Build customer name/email/phone from populated user or userDoc
      const customerFirstName = populatedUser?.firstName || userDoc?.firstName || '';
      const customerLastName = populatedUser?.lastName || userDoc?.lastName || '';
      const customerName = [customerFirstName, customerLastName].filter(Boolean).join(' ') || userDoc?.email || '';
      const customerEmail = populatedUser?.email || userDoc?.email || '';
      const customerPhone = populatedUser?.phone || userDoc?.phone || '';
      const resolvedUserCode = populatedUser?.userCode || populatedUser?.shippingId || userCode || '';

      // Resolve tracking number (KCD PascalCase takes priority)
      const trackingNumber = getVal(p, 'TrackingNumber', 'trackingNumber') || '';

      // Resolve weight
      const weightLbs = parseFloat(String(getVal(p, 'weightLbs', 'Weight', 'weight') || 0));

      // Resolve branch/warehouse
      const warehouseLocation = getVal(p, 'warehouseLocation', 'Branch', 'branch', 'currentLocation') || 'Main Warehouse';

      // Resolve shipper
      const shipper = getVal(p, 'Shipper', 'shipper', 'merchant', 'senderName') || 'Unknown';

      // Resolve description
      const description = getVal(p, 'Description', 'description', 'itemDescription') || '';

      // Resolve entry/received date
      const dateReceived = getVal(p, 'dateReceived', 'EntryDate', 'entryDate', 'createdAt');

      // Resolve status
      const status = getVal(p, 'status') || (() => {
        const ps = p.PackageStatus ?? 0;
        if (ps >= 4) return 'delivered';
        if (ps === 3) return 'in_transit';
        if (ps === 2) return 'shipped';
        if (ps === 1) return 'ready_to_ship';
        return 'received';
      })();

      // Resolve service mode
      const serviceMode = getVal(p, 'serviceMode') || 'air';

      // Parse payment data
      const payment = parsePayments(p.PackagePayments || '', p);

      // Resolve dimensions
      const dims = p.dimensions || {};
      const dimensions = {
        length: parseFloat(String(getVal(p, 'Length', 'length') || dims.length || 0)),
        width: parseFloat(String(getVal(p, 'Width', 'width') || dims.width || 0)),
        height: parseFloat(String(getVal(p, 'Height', 'height') || dims.height || 0)),
        unit: p.dimensionUnit || dims.unit || 'cm',
      };

      return {
        // IDs
        id: p._id?.toString(),
        _id: p._id?.toString(),

        // Tracking
        tracking_number: trackingNumber,
        trackingNumber,
        houseAwb: trackingNumber,
        trackingNum: trackingNumber,

        // Status
        status,
        invoiceStatus: p.invoiceStatus || 'pending',
        invoiceUploaded: p.invoiceUploaded || false,
        paymentStatus: payment.paymentStatus,

        // Customer info (matches admin view)
        customerName,
        customerEmail,
        customerPhone,
        userCode: resolvedUserCode,

        // Package details
        shipper,
        merchant: shipper,
        description,
        itemDescription: description,
        weight: weightLbs,
        weight_kg: weightLbs,
        pieces: getVal(p, 'Pieces', 'pieces') || 1,
        serviceMode,

        // Location
        warehouse_location: warehouseLocation,
        warehouseLocation,
        branch: warehouseLocation,

        // Dates
        dateReceived: dateReceived ? new Date(dateReceived).toISOString() : null,
        entryDate: dateReceived ? new Date(dateReceived).toISOString() : null,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,

        // Payment data (matches admin "Update Payment" modal)
        totalAmount: payment.totalAmountUsd,
        total_amount: payment.totalAmountUsd,
        amountPaid: payment.amountPaidUsd,
        itemValueUsd: payment.itemValueUsd,
        usdValue: payment.itemValueUsd,
        shipping_cost: payment.shippingCostUsd,
        freight: payment.shippingCostUsd || payment.totalAmountUsd,
        paymentMethod: payment.paymentMethod,
        pricePaidCurrency: payment.currency,
        pricePaid: payment.itemValueUsd,

        // Billing breakdown
        dutyPercent: p.dutyPercent ?? 20,
        gctPercent: p.gctPercent ?? 15,
        processingFee: p.processingFee || 0,
        badAddressFee: p.badAddressFee || 0,
        storageFee: p.storageFee || 0,

        // Sender/receiver info
        senderName: p.senderName || '',
        senderEmail: p.senderEmail || '',
        senderPhone: p.senderPhone || '',
        senderAddress: p.senderAddress || '',
        senderCountry: p.senderCountry || '',
        receiverName: p.receiverName || customerName,
        receiverEmail: p.receiverEmail || customerEmail,
        receiverPhone: p.receiverPhone || customerPhone,
        receiverAddress: p.receiverAddress || '',
        receiverCountry: p.receiverCountry || '',

        // Dimensions
        dimensions,

        // Additional tracking/billing fields
        manifest: p.manifest || '',
        rateGroup: p.rateGroup || 'Standard Rate',
        commercialInvoice: p.commercialInvoice || 'NO',
        hsCode: p.hsCode || '',
        collection: p.collection || '',

        // Invoice files
        invoiceFiles: p.invoiceFiles || [],
        invoiceSubmittedAt: p.invoiceSubmittedAt,

        // Legacy invoice fields
        invoice_status: p.invoiceStatus || 'pending',
        hasInvoice: !!(p.invoiceUploaded || p.billingInvoiceId),
      };
    });

    return NextResponse.json({
      packages: mapped,
      total_packages: mapped.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}