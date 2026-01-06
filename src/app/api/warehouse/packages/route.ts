// src/app/api/warehouse/packages/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/rbac';
import { connectToDatabase } from '@/lib/db';
import Package from '@/models/Package';
import User from '@/models/User';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function calcDaysInStorage(dateReceived: unknown, createdAt: unknown): number {
  const base = dateReceived || createdAt;
  if (!base) return 0;
  const d = new Date(String(base));
  if (Number.isNaN(d.getTime())) return 0;
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function calcShippingCostJmd(weightLbs: number): number {
  if (weightLbs <= 0) return 0;
  const first = 700;
  const additional = Math.max(0, Math.ceil(weightLbs) - 1) * 350;
  return first + additional;
}

function calcStorageFeeJmd(daysInStorage: number): number {
  if (daysInStorage <= 7) return 0;
  return (daysInStorage - 7) * 50;
}

function calcCustomsDutyUsd(valueUsd: number): number {
  // Placeholder: requirement says "Customs duty (if > $100 USD)" but not a specific rate.
  // Keep it explicit and configurable later.
  return valueUsd > 100 ? 0 : 0;
}

// Get all packages
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || !['admin', 'warehouse'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get query parameters
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const statuses = (url.searchParams.get("statuses") || "").trim();
    const userCode = (url.searchParams.get("userCode") || "").trim();
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const per_page = Math.min(Math.max(parseInt(url.searchParams.get("per_page") || "20", 10), 1), 100);

    // Build query filter
    const filter: Record<string, unknown> = {};
    
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { trackingNumber: regex },
        { description: regex },
        { shipper: regex },
        { controlNumber: regex },
        { userCode: regex },
        { mailboxNumber: regex },
        { receiverName: regex },
        { receiverPhone: regex },
      ];
    }

    // status: single status for backward compatibility
    // statuses: comma-separated list (multi-select)
    if (statuses) {
      const list = statuses
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length > 0) {
        filter.status = { $in: list };
      }
    } else if (status) {
      filter.status = status;
    }

    // Exclude deleted packages
    if (!filter.status) {
      filter.status = { $ne: 'Deleted' };
    }

    const [packages, total_count, status_counts] = await Promise.all([
      Package.find(filter)
        .populate('userId', 'firstName lastName email phone userCode address')
        .sort({ createdAt: -1 })
        .skip((page - 1) * per_page)
        .limit(per_page)
        .lean(),
      Package.countDocuments(filter),
      Package.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const statusCountsMap = status_counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    const packagesWithComputed = (packages as Array<Record<string, unknown>>).map((p) => {
      const trackingNumber = asString(p.trackingNumber);
      const statusValue = asString(p.status);

      // Prefer populated userId fields if available
      const populatedUser = (p.userId && typeof p.userId === 'object') ? (p.userId as Record<string, unknown>) : null;
      const customerName = populatedUser ? 
        `${asString(populatedUser.firstName || '')} ${asString(populatedUser.lastName || '')}`.trim() : 
        `${asString(p.receiverName) || ''}`.trim() || 'N/A';
      const customerEmail = populatedUser ? asString(populatedUser.email) : asString(p.receiverEmail);
      const customerPhone = populatedUser ? asString(populatedUser.phone) : asString(p.receiverPhone);
      const mailboxNumber = asString(p.mailboxNumber) || asString(p.userCode) || (populatedUser ? asString(populatedUser.userCode) : '');

      const weight = asNumber(p.weight);
      const weightUnit = asString(p.weightUnit) || asString((p.dimensions as Record<string, unknown> | undefined)?.weightUnit) || 'kg';
      const weightLbs = weightUnit === 'lb' ? weight : weight * 2.20462;

      const itemValueUsd = asNumber(p.itemValue) || asNumber(p.value);

      const dateReceived = p.dateReceived || p.entryDate;
      const createdAt = p.createdAt;
      const daysInStorage = calcDaysInStorage(dateReceived, createdAt);

      const shippingCostJmd = calcShippingCostJmd(weightLbs);
      const storageFeeJmd = calcStorageFeeJmd(daysInStorage);
      const customsDutyUsd = calcCustomsDutyUsd(itemValueUsd);

      const deliveryFeeJmd = asNumber(p.deliveryFee);
      const additionalFees = Array.isArray(p.additionalFees) ? (p.additionalFees as Array<Record<string, unknown>>) : [];
      const additionalFeesTotalJmd = additionalFees.reduce((sum, f) => sum + asNumber(f.amount), 0);

      const totalCostJmd = shippingCostJmd + storageFeeJmd + deliveryFeeJmd + additionalFeesTotalJmd;
      const amountPaidJmd = asNumber(p.amountPaid);
      const outstandingBalanceJmd = Math.max(0, totalCostJmd - amountPaidJmd);

      return {
        _id: String(p._id || ''),
        trackingNumber,
        customerName,
        customerEmail,
        customerPhone,
        mailboxNumber,
        serviceMode: asString(p.serviceMode) || 'air',
        status: statusValue,
        warehouseLocation: asString(p.warehouseLocation) || asString(p.branch) || '',
        customsRequired: Boolean(p.customsRequired),
        customsStatus: asString(p.customsStatus) || 'not_required',
        paymentStatus: asString(p.paymentStatus) || 'pending',
        weight,
        weightUnit,
        weightLbs,
        itemValueUsd,
        dateReceived: dateReceived ? new Date(String(dateReceived)).toISOString() : null,
        daysInStorage,
        // Sender information
        senderName: asString(p.senderName) || asString((p.sender as any)?.name) || '',
        senderEmail: asString(p.senderEmail) || asString((p.sender as any)?.email) || '',
        senderPhone: asString(p.senderPhone) || asString((p.sender as any)?.phone) || '',
        senderAddress: asString(p.senderAddress) || asString((p.sender as any)?.address) || '',
        senderCountry: asString(p.senderCountry) || asString((p.sender as any)?.country) || '',
        // Additional details
        shipper: asString(p.shipper) || '',
        createdAt: createdAt ? new Date(String(createdAt)).toISOString() : null,
        updatedAt: p.updatedAt ? new Date(String(p.updatedAt)).toISOString() : null,
        // Legacy fields for compatibility
        dimensions: p.dimensions,
        length: p.length,
        width: p.width,
        height: p.height,
        dimensionUnit: p.dimensionUnit,
        description: p.description,
        itemDescription: p.itemDescription,
        contents: p.contents,
        specialInstructions: p.specialInstructions,
        recipient: p.recipient,
        receiverName: p.receiverName,
        receiverEmail: p.receiverEmail,
        receiverPhone: p.receiverPhone,
        receiverAddress: p.receiverAddress,
        receiverCountry: p.receiverCountry,
        sender: p.sender,
        userCode: mailboxNumber,
      };
    });

    return NextResponse.json({
      packages: packagesWithComputed,
      total_count,
      status_counts: statusCountsMap,
      page,
      per_page,
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

// Create a new package
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || !['admin', 'warehouse'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Generate tracking number if not provided
    if (!data.trackingNumber) {
      // Format: YYMMDD-XXXXXX (6 digits)
      const now = new Date();
      const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      data.trackingNumber = `${datePart}-${randomPart}`;
    }

    // Set received date to now if not provided
    if (!data.receivedAt) {
      data.receivedAt = new Date();
    }

    // Set status to unknown if recipient is not found
    if (!data.recipient || !data.recipient.shippingId) {
      data.status = 'unknown';
    } else {
      // Verify recipient exists
      const User = (await import('@/models/User')).default;
      const user = await User.findOne({ shippingId: data.recipient.shippingId });
      if (!user) {
        data.status = 'unknown';
      } else {
        data.recipient = {
          name: user.name,
          email: user.email,
          shippingId: user.shippingId,
        };
      }
    }

    const newPackage = new Package(data);
    await newPackage.save();

    return new NextResponse(JSON.stringify(newPackage), { status: 201 });
  } catch (error) {
    console.error('Error creating package:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create package' }),
      { status: 500 }
    );
  }
}