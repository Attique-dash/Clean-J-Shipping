import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import Invoice from "@/models/Invoice";
import { InventoryService } from "@/lib/inventory-service";
import { CurrencyService } from "@/lib/currency-service";
import { createBillingInvoiceForPackage } from "@/lib/package-billing";
import {
  toKcdPackageArray,
  packageTextSearchOr,
  buildKcdPackageDocument,
  getDocTrackingNumber,
} from "@/lib/package-format";

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

interface SenderInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface RecipientInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  shippingId?: string;
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
  // Placeholder: requirement says “Customs duty (if > $100 USD)” but not a specific rate.
  // Keep it explicit and configurable later.
  return valueUsd > 100 ? 0 : 0;
}

function calculateTotalAmount(itemValueUSD: number, weightKg: number, targetCurrency: string = 'JMD'): {
  itemValueJMD: number;
  shippingCostJMD: number;
  customsDutyJMD: number;
  totalJMD: number;
  totalUSD: number;
  totalInTargetCurrency: number;
  formattedTotal: string;
} {
  // Use standardized currency service for calculations
  const breakdown = CurrencyService.calculateTotalPackageCost(itemValueUSD, weightKg, targetCurrency);
  
  return {
    itemValueJMD: breakdown.itemValueJMD,
    shippingCostJMD: breakdown.shippingCostJMD,
    customsDutyJMD: breakdown.customsDutyJMD,
    totalJMD: breakdown.totalJMD,
    totalUSD: breakdown.totalUSD,
    totalInTargetCurrency: breakdown.totalInTargetCurrency,
    formattedTotal: breakdown.formattedTotal,
  };
}

async function createBillingInvoice(
  packageData: Record<string, unknown> & { _id?: unknown },
  user: {
    _id: unknown;
    userCode?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  },
  trackingNumber: string
) {
  if (!packageData._id) return null;
  const invoice = await createBillingInvoiceForPackage(
    packageData as Record<string, unknown> & { _id: unknown },
    user,
    trackingNumber
  );
  if (invoice) {
    console.log(`Created billing invoice ${invoice.invoiceNumber} for package ${trackingNumber}`);
    return invoice;
  }
  return null;
}

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || !['admin', 'warehouse_staff', 'customer_support'].includes(payload.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const statuses = (url.searchParams.get("statuses") || "").trim();
    const userCode = (url.searchParams.get("userCode") || "").trim();
    const serviceMode = (url.searchParams.get("serviceMode") || "").trim();
    const warehouseLocation = (url.searchParams.get("warehouseLocation") || "").trim();
    const customsStatus = (url.searchParams.get("customsStatus") || "").trim();
    const customsRequired = (url.searchParams.get("customsRequired") || "").trim();
    const paymentStatus = (url.searchParams.get("paymentStatus") || "").trim();
    const from = (url.searchParams.get("from") || "").trim();
    const to = (url.searchParams.get("to") || "").trim();
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const per_page_param = url.searchParams.get("per_page");
    // Support 'all' to return all packages without pagination
    const per_page = per_page_param === 'all' ? 'all' : Math.min(Math.max(parseInt(per_page_param || "20", 10), 1), 100);
    const showAll = per_page === 'all';

    // Build query filter
    const filter: Record<string, unknown> = {};
    
    function escapeRegex(str: string): string {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      filter.$or = packageTextSearchOr(regex);
    }

    const statusToPackageStatus: Record<string, number> = {
      package_received: 0,
      received: 0,
      at_warehouse: 1,
      processing: 2,
      in_processing: 2,
      ready_for_shipment: 3,
      ready_to_ship: 3,
      in_transit: 4,
      shipped: 4,
      arrived_at_destination: 5,
      customs_clearance: 6,
      customs_cleared: 6,
      ready_for_pickup: 7,
      ready_for_delivery: 7,
      out_for_delivery: 8,
      delivered: 9,
      delivered_to_customer: 9,
      picked_up: 10,
      picked_up_by_customer: 10,
    };

    if (statuses) {
      const list = statuses.split(',').map((s) => s.trim()).filter(Boolean);
      const numericStatuses = list
        .map((s) => statusToPackageStatus[s])
        .filter((n) => n !== undefined);
      if (list.length > 0) {
        filter.$or = [
          ...(Array.isArray(filter.$or) ? (filter.$or as unknown[]) : []),
          { PackageStatus: { $in: numericStatuses } },
          { status: { $in: list } },
        ];
      }
    } else if (status) {
      const num = statusToPackageStatus[status];
      filter.$or = [
        ...(Array.isArray(filter.$or) ? (filter.$or as unknown[]) : []),
        ...(num !== undefined ? [{ PackageStatus: num }, { status }] : [{ status }]),
      ];
    }

    if (warehouseLocation) {
      filter.Branch = warehouseLocation;
    }

    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) range.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          range.$lte = d;
        }
      }
      if (Object.keys(range).length > 0) {
        filter.createdAt = range;
      }
    }

    if (userCode) {
      const code = userCode.toUpperCase();
      const user = (await User.findOne({
        $or: [{ userCode: code }, { shippingId: code }],
      })
        .select('_id')
        .lean()) as unknown as { _id?: unknown } | null;
      if (user?._id) {
        const userClause = {
          $or: [{ userId: user._id }, { UserCode: code }, { userCode: code }],
        };
        if (!filter.$and) filter.$and = [];
        (filter.$and as unknown[]).push(userClause);
      } else {
        return NextResponse.json({
          packages: [],
          total_count: 0,
          status_counts: {},
          page,
          per_page,
        });
      }
    }

    const packageQuery = Package.find(filter)
      .populate('userId', 'firstName lastName email phone userCode address')
      .select([
        // All standard fields
        '_id', 'PackageID', 'CourierID', 'ManifestID', 'CollectionID',
        'TrackingNumber', 'ControlNumber', 'FirstName', 'LastName',
        'UserCode', 'Weight', 'Shipper', 'EntryStaff', 'EntryDate',
        'EntryDateTime', 'Branch', 'Claimed', 'APIToken', 'ShowControls',
        'ManifestCode', 'CollectionCode', 'Description', 'HSCode',
        'Unknown', 'AIProcessed', 'OriginalHouseNumber', 'Cubes',
        'Length', 'Width', 'Height', 'Pieces', 'Discrepancy',
        'DiscrepancyDescription', 'ServiceTypeID', 'HazmatCodeID',
        'Coloaded', 'ColoadIndicator', 'PackageStatus', 'PackagePayments',
        // Payment fields - explicitly select to ensure they're returned
        'paymentStatus', 'amountPaid', 'paymentMethod', 'totalAmount',
        // Other fields
        'createdAt', 'updatedAt', 'weightLbs', 'itemValueUsd', 'pricePaid',
        'pricePaidCurrency', 'customerEmail', 'customerPhone', 'dateReceived',
        'daysInStorage', 'serviceMode', 'invoiceStatus', 'itemDescription',
        'specialInstructions', 'dimensionUnit', 'senderName', 'senderEmail',
        'senderPhone', 'senderAddress', 'senderCity', 'senderState',
        'senderZipCode', 'senderCountry', 'userId'
      ].join(' '))
      .sort({ createdAt: -1 });

    // Only apply pagination if not showing all
    if (!showAll) {
      packageQuery.skip((page - 1) * (per_page as number)).limit(per_page as number);
    }

    const [packages, total_count, status_counts] = await Promise.all([
      packageQuery.lean(),
      Package.countDocuments(filter),
      Package.aggregate([
        { $match: filter },
        { $group: { _id: '$PackageStatus', count: { $sum: 1 } } },
      ]),
    ]);

    // Log raw package data to check if payment fields exist
    console.log('[Admin Packages API] Raw package data sample:', JSON.stringify(packages[0] || {}, null, 2));

    const statusCountsMap = status_counts.reduce((acc, curr) => {
      acc[String(curr._id ?? 0)] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    const kcdPackages = toKcdPackageArray(packages as Array<Record<string, unknown>>);
    console.log('[Admin Packages API] KCD format response sample:', JSON.stringify(kcdPackages[0] || {}, null, 2));

    return NextResponse.json({
      packages: kcdPackages,
      total_count,
      status_counts: statusCountsMap,
      page,
      per_page,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || !['admin', 'warehouse_staff', 'customer_support'].includes(payload.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const { rateLimit } = await import('@/lib/rateLimit');
  const userIdentifier = payload.id || payload.email || 'unknown';
  const rateLimitResult = rateLimit(`admin-packages-${userIdentifier}`, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 requests per minute
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: rateLimitResult.retryAfter,
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimitResult.resetAt),
          "Retry-After": String(rateLimitResult.retryAfter ?? 60),
        },
      }
    );
  }

  try {
    await dbConnect();
    
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const trackingNumber = body.TrackingNumber || body.trackingNumber;
    const userCode = body.UserCode || body.userCode;
    const weightLbs = body.weightLbs ?? body.weightLb ?? body.Weight ?? body.weight;
    const shipper = body.Shipper || body.shipper;
    const description = body.Description || body.description;
    const entryDate = body.EntryDate || body.entryDate;
    const branch = body.Branch || body.branch;
    const dimensions = body.dimensions as Record<string, unknown> | undefined;
    const recipient = body.recipient as RecipientInfo | undefined;
    const status = body.status;

    if (!trackingNumber || !userCode) {
      return NextResponse.json(
        { error: "TrackingNumber and UserCode are required" },
        { status: 400 }
      );
    }

    const tn = asString(trackingNumber).toUpperCase();
    if (tn.length < 3 || tn.length > 50) {
      return NextResponse.json(
        { error: "Tracking number must be between 3 and 50 characters" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ userCode: asString(userCode).toUpperCase() });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Package.findOne({
      $or: [{ TrackingNumber: tn }, { trackingNumber: tn }],
    });
    if (existing) {
      return NextResponse.json(
        { error: "Tracking number already exists" },
        { status: 409 }
      );
    }

    const packageData = buildKcdPackageDocument(
      {
        ...body,
        TrackingNumber: tn,
        UserCode: userCode,
        weightLbs,
        weightUnit: 'lb',
        Weight: weightLbs,
        itemValueUSD: body.itemValueUSD ?? body.itemValue ?? body.value,
        totalAmount: body.totalAmount,
        Shipper: shipper,
        Description: description,
        EntryDate: entryDate || new Date(),
        EntryDateTime: entryDate || new Date(),
        Branch: branch || "Main Warehouse",
        Length: dimensions?.length,
        Width: dimensions?.width,
        Height: dimensions?.height,
        PackageStatus: 0,
        EntryStaff: body.EntryStaff || body.entryStaff || "Admin",
      },
      user,
      { source: 'manual' }
    );

    let created;
    try {
      created = await Package.create(packageData);
    } catch (createErr) {
      const msg =
        createErr instanceof Error ? createErr.message : 'Database error';
      console.error('Package.create failed:', createErr);
      if (msg.includes('duplicate key') || msg.includes('E11000')) {
        return NextResponse.json(
          { error: 'Tracking number already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create package', details: msg },
        { status: 500 }
      );
    }

    // DISABLED: Do not auto-create pre-alert when package is added by admin
    // Pre-alerts should only be created by customers via the customer portal
    // try {
    //   const { PreAlert } = await import('@/models/PreAlert');
    //   const existingPreAlert = await PreAlert.findOne({ trackingNumber: asString(trackingNumber) });
    //   if (!existingPreAlert) {
    //     await PreAlert.create({
    //       userCode: user.userCode,
    //       customer: user._id,
    //       trackingNumber: asString(trackingNumber),
    //       carrier: typeof shipper === "string" ? shipper : "Unknown Carrier",
    //       origin: typeof branch === "string" ? branch : "Main Warehouse",
    //       expectedDate: new Date(),
    //       status: "approved",
    //       notes: `Package added by admin${payload?.name ? ` (${payload.name})` : ""}`,
    //       decidedAt: new Date(),
    //       description: description || `Package from ${shipper || 'unknown merchant'}`,
    //       merchant: typeof shipper === "string" ? shipper : "Unknown Merchant",
    //       pricePaid: body.itemValueUSD ?? body.itemValue ?? body.value ?? 0,
    //       pricePaidCurrency: 'USD',
    //     });
    //     console.log(`Pre-alert created for admin package ${asString(trackingNumber)}`);
    //   }
    // } catch (preAlertError) {
    //   console.error('Failed to create pre-alert for admin package:', preAlertError);
    // }

    // Create billing invoice automatically when package is added
    let billingInvoice: { _id: any } | null = null;
    try {
      billingInvoice = await createBillingInvoice(
        created.toObject() as Record<string, unknown> & { _id: unknown },
        user,
        asString(trackingNumber)
      );
      if (billingInvoice) {
        await Package.findByIdAndUpdate(created._id, {
          $set: {
            billingInvoiceId: billingInvoice._id,
            invoiceStatus: 'pending',
            invoiceUploaded: false
          }
        });
      }
    } catch (invoiceError) {
      console.error('Failed to create billing invoice:', invoiceError);
    }

    // Send email notification to customer with invoice PDF if billing invoice was created
    let customerEmailResult: { sent: boolean; reason?: string } | undefined;
    try {
      const { sendNewPackageEmail } = await import('@/lib/email');
      
      // Get warehouse addresses from default warehouse
      let warehouseAddresses = { airAddress: '', seaAddress: '', chinaAddress: '' };
      try {
        const { Warehouse } = await import('@/models/Warehouse');
        const defaultWarehouse = await Warehouse.findOne({ isActive: true, isDefault: true })
          .select('airAddress seaAddress chinaAddress address name')
          .lean() as { airAddress?: string; seaAddress?: string; chinaAddress?: string; address?: string; name?: string } | null;
        if (defaultWarehouse) {
          warehouseAddresses = {
            airAddress: defaultWarehouse.airAddress || defaultWarehouse.address || '',
            seaAddress: defaultWarehouse.seaAddress || defaultWarehouse.address || '',
            chinaAddress: defaultWarehouse.chinaAddress || defaultWarehouse.address || ''
          };
        }
      } catch (whError) {
        console.error('[Admin Package Create] Failed to fetch warehouse addresses:', whError);
      }
      
      customerEmailResult = await sendNewPackageEmail({
        to: user.email,
        firstName: user.firstName || 'Customer',
        trackingNumber: asString(trackingNumber),
        status: (status && typeof status === 'string') ? status : 'received',
        weight: asNumber(weightLbs),
        shipper: asString(shipper),
        warehouse: asString(branch) || 'Main Warehouse',
        receivedBy: payload?.name || 'Admin',
        receivedDate: new Date(),
        invoiceId: billingInvoice?._id?.toString(),
        description: asString(description),
        itemDescription: asString(description),
        warehouseAddresses: warehouseAddresses,
        userCode: user.userCode,
        kcdPackage: created.toObject(),
      });
      console.log(`[Admin Package Create] Customer email result for ${trackingNumber}:`, customerEmailResult);
    } catch (emailError) {
      console.error('[Admin Package Create] Failed to send package notification email to customer:', emailError);
      // Don't fail package creation if email fails
    }

    // Send email notification to recipient if different from customer
    const recipientEmail = (recipient as RecipientInfo)?.email;
    if (recipientEmail && recipientEmail !== user.email) {
      try {
        const { sendPackageNotificationToRecipient } = await import('@/lib/email');
        const recipientName = (recipient as RecipientInfo)?.name || 'Recipient';
        const recipientResult = await sendPackageNotificationToRecipient({
          to: recipientEmail,
          recipientName,
          trackingNumber: asString(trackingNumber),
          shipper: asString(shipper),
          weight: asNumber(weightLbs),
          warehouse: asString(branch) || 'Main Warehouse',
          receivedDate: new Date(),
          customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        });
        console.log(`[Admin Package Create] Recipient email result for ${trackingNumber}:`, recipientResult);
      } catch (emailError) {
        console.error('[Admin Package Create] Failed to send package notification email to recipient:', emailError);
        // Don't fail package creation if email fails
      }
    }

    // NEW: Automatically deduct inventory materials
    try {
      const inventoryResult = await InventoryService.deductPackageMaterials(
        { ...packageData, trackingNumber: String(trackingNumber), warehouseLocation: (packageData.warehouseLocation as string) || 'Main Warehouse' },
        created._id.toString(),
        payload?.id
      );
      
      if (inventoryResult.success) {
        console.log(`Inventory deducted for package ${trackingNumber}:`, inventoryResult.transactions);
        
        // Update package with inventory info
        await Package.findByIdAndUpdate(created._id, {
          $set: { 
            inventoryDeducted: true,
            inventoryTransactionIds: inventoryResult.transactions?.map(t => t._id) || []
          }
        });

        // Check for low stock alerts
        if (inventoryResult.lowStockItems && inventoryResult.lowStockItems.length > 0) {
          console.warn('Low stock alerts:', inventoryResult.lowStockItems);
          // TODO: Send notification to warehouse manager
        }
      } else {
        console.error('Inventory deduction failed:', inventoryResult.message);
        // Don't fail package creation, but log the issue
      }
    } catch (inventoryError) {
      console.error('Error during inventory deduction:', inventoryError);
      // Don't fail package creation if inventory deduction fails
    }

    const { toKcdPackage } = await import('@/lib/package-format');
    const kcdCreated = toKcdPackage(created.toObject());

    return NextResponse.json({
      ok: true,
      id: created._id,
      package: kcdCreated,
      packages: [kcdCreated],
      message: "Package, billing invoice, and inventory deduction completed successfully",
    });
  } catch (error) {
    console.error("Error creating package:", error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: "Failed to create package", details },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || !['admin', 'warehouse_staff', 'customer_support'].includes(payload.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const { rateLimit } = await import('@/lib/rateLimit');
  const userIdentifier = payload.id || payload.email || 'unknown';
  const rateLimitResult = rateLimit(`admin-packages-update-${userIdentifier}`, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50 // 50 requests per minute
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: rateLimitResult.retryAfter,
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "50",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimitResult.resetAt),
          "Retry-After": String(rateLimitResult.retryAfter ?? 60),
        },
      }
    );
  }

  try {
    await dbConnect();
    
    // Input sanitization
    const { sanitizeObject } = await import('@/lib/security');
    
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      // Sanitize input
      body = sanitizeObject(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      id,
      status,
      weight,
      description,
      branch,
      length,
      width,
      height,
      serviceMode,
      mailboxNumber,
      warehouseLocation,
      dateReceived,
      itemValueUsd,
      itemValue, // Add this to handle the field sent by frontend
      totalAmount,
      customsRequired,
      customsStatus,
      paymentStatus,
      amountPaid,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
    }

    // Get current package to track changes
    const currentPackage = await Package.findById(id);

    if (!currentPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const changedFields: string[] = [];

    if (status !== undefined && status !== null && status !== currentPackage.status) {
      // Sync both status fields: PackageStatus (numeric for KCD) and status (string for customer portal)
      const statusMap: Record<string, number> = {
        '0': 0,
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        '10': 10,
        'package_received': 0,
        'at_warehouse': 1,
        'processing': 2,
        'ready_for_shipment': 3,
        'in_transit': 4,
        'arrived_at_destination': 5,
        'customs_clearance': 6,
        'ready_for_pickup': 7,
        'ready_for_delivery': 7,
        'out_for_delivery': 8,
        'delivered': 9,
        'delivered_to_customer': 9,
        'picked_up': 10,
        'picked_up_by_customer': 10,
      };
      
      const numericStatus = statusMap[String(status)] ?? Number(status);
      if (!Number.isNaN(numericStatus)) {
        updateData.PackageStatus = numericStatus;
        changedFields.push('PackageStatus');
      }
      
      updateData.status = status;
      changedFields.push('status');
    }
    if (weight !== undefined && weight !== currentPackage.weight) {
      updateData.weight = weight;
      changedFields.push('weight');
    }
    if (description !== undefined && description !== currentPackage.itemDescription) {
      updateData.itemDescription = description;
      changedFields.push('description');
    }
    if (branch !== undefined && branch !== currentPackage.currentLocation) {
      updateData.currentLocation = branch;
      changedFields.push('branch');
    }
    if (warehouseLocation !== undefined && warehouseLocation !== currentPackage.warehouseLocation) {
      updateData.warehouseLocation = warehouseLocation;
      changedFields.push('warehouseLocation');
    }
    if (serviceMode !== undefined && serviceMode !== currentPackage.serviceMode) {
      updateData.serviceMode = serviceMode;
      changedFields.push('serviceMode');
    }
    if (mailboxNumber !== undefined && mailboxNumber !== currentPackage.mailboxNumber) {
      updateData.mailboxNumber = mailboxNumber;
      changedFields.push('mailboxNumber');
    }
    if (dateReceived !== undefined) {
      updateData.dateReceived = dateReceived;
      changedFields.push('dateReceived');
    }
    if (itemValueUsd !== undefined && itemValueUsd !== currentPackage.itemValue && itemValueUsd !== currentPackage.value) {
      // Store in the existing field(s) already used across the codebase
      updateData.itemValue = itemValueUsd;
      updateData.value = itemValueUsd;
      changedFields.push('itemValueUsd');
    } else if (itemValue !== undefined && itemValue !== currentPackage.itemValue && itemValue !== currentPackage.value) {
      // Handle the field sent by frontend form
      updateData.itemValue = itemValue;
      updateData.value = itemValue;
      changedFields.push('itemValue');
    }
    if (customsRequired !== undefined && customsRequired !== currentPackage.customsRequired) {
      updateData.customsRequired = customsRequired;
      changedFields.push('customsRequired');
    }
    if (customsStatus !== undefined && customsStatus !== currentPackage.customsStatus) {
      updateData.customsStatus = customsStatus;
      changedFields.push('customsStatus');
    }
    if (paymentStatus !== undefined && paymentStatus !== currentPackage.paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      changedFields.push('paymentStatus');
    }
    if (amountPaid !== undefined && amountPaid !== currentPackage.amountPaid) {
      updateData.amountPaid = amountPaid;
      changedFields.push('amountPaid');
    }
    if (totalAmount !== undefined && totalAmount !== currentPackage.totalAmount) {
      updateData.totalAmount = totalAmount;
      changedFields.push('totalAmount');
    }
    if (length !== undefined) {
      updateData.length = length;
      changedFields.push('length');
    }
    if (width !== undefined && width !== currentPackage.width) {
      updateData.width = width;
      changedFields.push('width');
    }
    if (height !== undefined && height !== currentPackage.height) {
      updateData.height = height;
      changedFields.push('height');
    }

    if (changedFields.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        id: currentPackage._id, 
        tracking_number: currentPackage.trackingNumber,
        message: "No changes detected"
      });
    }

    const updated = await Package.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Update related invoices if payment amount changed
    if (changedFields.includes('amountPaid') || changedFields.includes('totalAmount') || changedFields.includes('shippingCost')) {
      try {
        const Invoice = (await import('@/models/Invoice')).default;
        const invoices = await Invoice.find({ 
          $or: [
            { 'package.trackingNumber': updated.trackingNumber },
            { 'package': updated._id }
          ]
        });

        for (const invoice of invoices) {
          const newAmountPaid = updated.amountPaid || 0;
          const invoiceTotal = invoice.total || 0;
          const newBalanceDue = Math.max(0, invoiceTotal - newAmountPaid);
          const newStatus = newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partially_paid' : invoice.status;

          await Invoice.findByIdAndUpdate(invoice._id, {
            $set: {
              amountPaid: newAmountPaid,
              balanceDue: newBalanceDue,
              status: newStatus,
              updatedAt: new Date()
            }
          });
        }
      } catch (invoiceError) {
        console.error('Failed to update related invoices:', invoiceError);
        // Don't fail package update if invoice update fails
      }
    }

    // Send email notification if status changed
    if (changedFields.includes('status') && status && status !== currentPackage.status) {
      try {
        const user = await User.findById(updated.userId);
        if (user && user.email) {
          const { sendStatusUpdateEmail } = await import('@/lib/email');
          await sendStatusUpdateEmail({
            to: user.email,
            firstName: user.firstName || 'Customer',
            trackingNumber: updated.trackingNumber,
            status: String(status),
            note: `Package status updated from ${currentPackage.status} to ${status}`
          });
        }
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't fail update if email fails
      }
    }

    return NextResponse.json({ 
      ok: true, 
      id: updated._id, 
      tracking_number: updated.trackingNumber 
    });
  } catch (error) {
    console.error("Error updating package:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || !['admin', 'warehouse_staff', 'customer_support'].includes(payload.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
    }

    // Permanent delete - completely remove package from database
    const deleted = await Package.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    console.log(`Package ${deleted.trackingNumber} permanently deleted from system`);
    return NextResponse.json({ 
      ok: true, 
      id: deleted._id, 
      trackingNumber: deleted.trackingNumber,
      message: "Package permanently deleted" 
    });
  } catch (error) {
    console.error("Error deleting package:", error);
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
  }
}
