import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import Invoice from "@/models/Invoice";
import { InventoryService } from "@/lib/inventory-service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

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

function calculateTotalAmount(itemValue: number, weight: number): number {
  // Convert item value from USD to JMD (assuming 1 USD = 155 JMD)
  const itemValueJmd = itemValue * 155;
  
  // Calculate shipping cost based on weight (convert to lbs first)
  const weightLbs = weight * 2.20462;
  const shippingCostJmd = calcShippingCostJmd(weightLbs);
  
  // Calculate customs duty (15% of item value if > $100 USD)
  const customsDutyJmd = itemValue > 100 ? itemValueJmd * 0.15 : 0;
  
  // Total: item value + shipping + customs
  return itemValueJmd + shippingCostJmd + customsDutyJmd;
}

async function createBillingInvoice(packageData: any, user: any, trackingNumber: string) {
  try {
    const itemValue = asNumber(packageData.value) || 0;
    const weight = asNumber(packageData.weight) || 0;
    const weightLbs = weight * 2.20462;
    
    // Calculate costs
    const shippingCostJmd = calcShippingCostJmd(weightLbs);
    const itemValueJmd = itemValue * 155;
    const customsDutyJmd = itemValue > 100 ? itemValueJmd * 0.15 : 0;
    const totalAmount = itemValueJmd + shippingCostJmd + customsDutyJmd;
    
    // Create invoice items
    const invoiceItems = [];
    
    // Shipping charges
    if (shippingCostJmd > 0) {
      invoiceItems.push({
        description: `Shipping charges (${weightLbs.toFixed(1)} lbs)`,
        quantity: 1,
        unitPrice: shippingCostJmd,
        taxRate: 0,
        amount: shippingCostJmd,
        taxAmount: 0,
        total: shippingCostJmd
      });
    }
    
    // Customs duty
    if (customsDutyJmd > 0) {
      invoiceItems.push({
        description: `Customs duty (${itemValue > 100 ? '15%' : '0%'} of item value)`,
        quantity: 1,
        unitPrice: customsDutyJmd,
        taxRate: 0,
        amount: customsDutyJmd,
        taxAmount: 0,
        total: customsDutyJmd
      });
    }
    
    // Create billing invoice
    const invoiceData = {
      userId: user._id,
      customer: {
        id: user._id.toString(),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        address: user.address?.street || '',
        phone: user.phone || '',
        city: user.address?.city || '',
        country: user.address?.country || ''
      },
      tracking_number: trackingNumber,
      invoiceNumber: `INV-${Date.now()}`,
      status: 'unpaid',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      currency: 'JMD',
      subtotal: shippingCostJmd + customsDutyJmd,
      taxTotal: 0,
      discountAmount: 0,
      total: shippingCostJmd + customsDutyJmd,
      amountPaid: 0,
      balanceDue: shippingCostJmd + customsDutyJmd,
      items: invoiceItems,
      invoiceType: 'billing', // NEW: Distinguish from commercial invoices
      notes: `Billing invoice for package ${trackingNumber}`,
      paymentTerms: 30
    };
    
    const invoice = new Invoice(invoiceData);
    await invoice.save();
    
    console.log(`Created billing invoice ${invoice.invoiceNumber} for package ${trackingNumber}`);
    return invoice;
  } catch (error) {
    console.error('Error creating billing invoice:', error);
    return null;
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
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
    const per_page = Math.min(Math.max(parseInt(url.searchParams.get("per_page") || "20", 10), 1), 100);

    // Build query filter
    const filter: Record<string, unknown> = {};
    
    function escapeRegex(str: string): string {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
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
        filter.status = { $in: list, $ne: "returned" };
      }
    } else if (status) {
      filter.status = status;
    } else {
      // Ensure we always exclude returned packages unless explicitly requested
      if (!filter.status || (typeof filter.status === 'object' && !('$ne' in filter.status))) {
        filter.status = { $ne: "returned" };
      }
    }

    if (serviceMode) {
      filter.serviceMode = serviceMode;
    }

    if (warehouseLocation) {
      filter.warehouseLocation = warehouseLocation;
    }

    if (customsStatus) {
      filter.customsStatus = customsStatus;
    }

    if (customsRequired) {
      if (customsRequired === 'yes') filter.customsRequired = true;
      if (customsRequired === 'no') filter.customsRequired = false;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
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
      // Existing codebase uses both userCode and shippingId in different places.
      const user = (await User.findOne({ $or: [{ userCode }, { shippingId: userCode }] }).select('_id').lean()) as unknown as { _id?: unknown } | null;
      if (user?._id) {
        filter.userId = user._id;
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
        senderName: asString(p.senderName) || asString((p.sender as SenderInfo)?.name) || '',
        senderEmail: asString(p.senderEmail) || asString((p.sender as SenderInfo)?.email) || '',
        senderPhone: asString(p.senderPhone) || asString((p.sender as SenderInfo)?.phone) || '',
        senderAddress: asString(p.senderAddress) || asString((p.sender as SenderInfo)?.address) || '',
        senderCountry: asString(p.senderCountry) || asString((p.sender as SenderInfo)?.country) || '',
        // Additional details
        shipper: asString(p.shipper) || '',
        createdAt: createdAt ? new Date(String(createdAt)).toISOString() : null,
        updatedAt: p.updatedAt ? new Date(String(p.updatedAt)).toISOString() : null,
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
    console.error("Error fetching packages:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const { rateLimit } = await import('@/lib/rateLimit');
  const userIdentifier = session.user.id || session.user.email || 'unknown';
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
    
    // Input sanitization
    const { sanitizeObject } = await import('@/lib/security');
    
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { 
      trackingNumber, 
      userCode, 
      weight, 
      shipper,
      description, 
      entryDate,
      status,
      serviceMode,
      dimensions,
      recipient,
      sender,
      contents,
      value,
      specialInstructions,
      branch,
      customsRequired,
      customsStatus,
      // International Shipping Fields
      isInternational,
      countryOfOrigin,
      countryOfDestination,
      exportLicenseNumber,
      importLicenseNumber,
      certificateOfOrigin,
      dangerousGoods,
      dangerousGoodsClass,
      dangerousGoodsUnNumber,
      exportDeclarationNumber,
      importDeclarationNumber,
      hsCode
    } = body;

    if (!trackingNumber || !userCode) {
      return NextResponse.json(
        { error: "trackingNumber and userCode are required" }, 
        { status: 400 }
      );
    }

    // Find user by userCode
    const user = await User.findOne({ userCode: userCode });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Package.findOne({ trackingNumber: trackingNumber });
    if (existing) {
      return NextResponse.json(
        { error: "Tracking number already exists" }, 
        { status: 409 }
      );
    }

    // Create package with extended information
    const packageData: Record<string, unknown> = {
      trackingNumber: trackingNumber,
      userId: user._id,
      userCode: userCode,
      weight: weight || 0,
      shipper: shipper || "Unknown Shipper",
      description: description || "Package description",
      entryDate: entryDate || new Date(),
      status: status || "received",
      serviceMode: serviceMode || "air",
      dimensions: dimensions || {
        length: 0,
        width: 0,
        height: 0,
        unit: "cm"
      },
      // Required sender fields
      senderName: (sender as SenderInfo)?.name || "Warehouse",
      senderPhone: (sender as SenderInfo)?.phone || "0000000000",
      senderEmail: (sender as SenderInfo)?.email || "warehouse@shipping.com",
      senderAddress: (sender as SenderInfo)?.address || branch || "Main Warehouse",
      senderCity: (sender as SenderInfo)?.city || "Kingston",
      senderState: (sender as SenderInfo)?.state || "St. Andrew",
      senderZipCode: (sender as SenderInfo)?.zipCode || "00000",
      senderCountry: (sender as SenderInfo)?.country || "Jamaica",
      // Required receiver fields
      receiverName: (recipient as RecipientInfo)?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Customer",
      receiverPhone: (recipient as RecipientInfo)?.phone || user.phone || "0000000000",
      receiverEmail: (recipient as RecipientInfo)?.email || user.email || "",
      receiverAddress: (recipient as RecipientInfo)?.address || user.address?.street || "No Address",
      receiverCity: (recipient as RecipientInfo)?.city || user.address?.city || "Kingston",
      receiverState: (recipient as RecipientInfo)?.state || user.address?.state || "St. Andrew",
      receiverZipCode: (recipient as RecipientInfo)?.zipCode || user.address?.zipCode || "00000",
      receiverCountry: (recipient as RecipientInfo)?.country || user.address?.country || "Jamaica",
      
      // Determine if international based on countries
      senderCountryValue: (sender as SenderInfo)?.country || "Jamaica",
      receiverCountryValue: (recipient as RecipientInfo)?.country || user.address?.country || "Jamaica",
      // Additional fields
      recipient: {
        name: (recipient as RecipientInfo)?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Customer",
        email: (recipient as RecipientInfo)?.email || user.email,
        shippingId: (recipient as RecipientInfo)?.shippingId || user.userCode,
        phone: (recipient as RecipientInfo)?.phone || user.phone || "",
        address: (recipient as RecipientInfo)?.address || user.address?.street || ""
      },
      sender: sender || {
        name: "Warehouse",
        email: "warehouse@shipping.com",
        phone: "0000000000",
        address: branch || "Main Warehouse"
      },
      contents: contents || "",
      value: value || 0,
      specialInstructions: specialInstructions || "",
      branch: branch || "Main Warehouse",
      // Required fields with defaults
      shippingCost: 0,
      totalAmount: calculateTotalAmount(asNumber(value), asNumber(weight)),
      paymentMethod: "cash",
      // Legacy fields for compatibility
      itemDescription: description || "Package description",
      itemValue: asNumber(value) || 0,
      currentLocation: branch || "Main Warehouse",
      packageType: "parcel",
      serviceType: "standard",
      deliveryType: "door_to_door",
      receivedAt: new Date(),
      // Customs fields
      customsRequired: customsRequired !== undefined ? Boolean(customsRequired) : false,
      customsStatus: customsStatus || "not_required",
      // International Shipping Fields
      isInternational: isInternational !== undefined ? Boolean(isInternational) : ((sender as SenderInfo)?.country && (sender as SenderInfo)?.country !== (user.address?.country || "Jamaica")),
      countryOfOrigin: countryOfOrigin || undefined,
      countryOfDestination: countryOfDestination || (recipient as RecipientInfo)?.country || user.address?.country || (sender as SenderInfo)?.country || "Jamaica",
      exportLicenseNumber: exportLicenseNumber || undefined,
      importLicenseNumber: importLicenseNumber || undefined,
      certificateOfOrigin: certificateOfOrigin || undefined,
      dangerousGoods: dangerousGoods !== undefined ? Boolean(dangerousGoods) : false,
      dangerousGoodsClass: dangerousGoodsClass || undefined,
      dangerousGoodsUnNumber: dangerousGoodsUnNumber || undefined,
      exportDeclarationNumber: exportDeclarationNumber || undefined,
      importDeclarationNumber: importDeclarationNumber || undefined,
      hsCode: hsCode || undefined
    };

    const created = await Package.create(packageData);

    // FIXED: Create proper billing invoice automatically
    try {
      const billingInvoice = await createBillingInvoice(packageData, user, asString(trackingNumber));
      if (billingInvoice) {
        // Link invoice to package
        await Package.findByIdAndUpdate(created._id, {
          $set: { 
            billingInvoiceId: billingInvoice._id,
            invoiceStatus: 'billed'
          }
        });
      }
    } catch (invoiceError) {
      console.error('Failed to create billing invoice:', invoiceError);
      // Don't fail package creation if invoice creation fails
    }

    // Send email notification to customer with invoice PDF attachment
    try {
      const { sendNewPackageEmail } = await import('@/lib/email');
      const invoiceId = billingInvoice?._id?.toString();
      await sendNewPackageEmail({
        to: user.email,
        firstName: user.firstName || 'Customer',
        trackingNumber: asString(trackingNumber),
        status: status || 'received',
        weight: asNumber(weight),
        shipper: asString(shipper),
        warehouse: asString(branch) || 'Main Warehouse',
        receivedBy: session.user.name || 'Admin',
        receivedDate: new Date(),
        invoiceId: invoiceId, // Attach invoice PDF if available
      });
    } catch (emailError) {
      console.error('Failed to send package notification email:', emailError);
      // Don't fail package creation if email fails
    }

    // NEW: Automatically deduct inventory materials
    try {
      const session = await getServerSession(authOptions);
      const inventoryResult = await InventoryService.deductPackageMaterials(
        { ...packageData, trackingNumber: String(trackingNumber), warehouseLocation: (packageData as Record<string, unknown>).warehouseLocation as string || 'Main Warehouse' },
        created._id.toString(),
        session?.user?.id
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

    return NextResponse.json({ 
      ok: true, 
      id: created._id, 
      trackingNumber: created.trackingNumber,
      userCode: created.userCode,
      package: created,
      message: "Package, billing invoice, and inventory deduction completed successfully"
    });
  } catch (error) {
    console.error("Error creating package:", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const { rateLimit } = await import('@/lib/rateLimit');
  const userIdentifier = session.user.id || session.user.email || 'unknown';
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

    if (status !== undefined && status !== currentPackage.status) {
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
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
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
