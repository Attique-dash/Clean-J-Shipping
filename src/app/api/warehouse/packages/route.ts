// Warehouse Packages Endpoint
// URL: /api/warehouse/packages
// Method: GET
// Returns paginated list of packages with filtering options

import { TasokoAuthenticator } from "@/lib/tasoko-auth";
import { TasokoRateLimiter } from "@/lib/tasoko-rate-limit";
import { TasokoResponseFormatter } from "@/lib/tasoko-response";
import { dbConnect } from "@/lib/db";

// Initialize all models first
import "@/models";

import Package from "@/models/Package";
import User from "@/models/User";
import Invoice from "@/models/Invoice";

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
  return valueUsd > 100 ? 0 : 0;
}

export async function GET(request: Request) {
  try {
    // Extract and validate API token
    const token = TasokoAuthenticator.extractToken(request);
    if (!token) {
      const response = TasokoResponseFormatter.error(
        'API key required in headers (x-warehouse-key or x-api-key) or query parameter (id)',
        401
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    // Validate token against database
    const authResult = await TasokoAuthenticator.validateToken(token);
    if (!authResult.valid) {
      const response = TasokoResponseFormatter.error(
        authResult.error || 'Invalid API key',
        401
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    // Check permissions
    if (!TasokoAuthenticator.hasPermission(authResult.keyRecord, 'packages:read')) {
      const response = TasokoResponseFormatter.error(
        'Insufficient permissions (requires packages:read)',
        403
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    // Rate limiting
    const rateLimitResult = TasokoRateLimiter.isAllowed(authResult.keyRecord.keyPrefix);
    if (!rateLimitResult.allowed) {
      const response = TasokoResponseFormatter.error(
        'Rate limit exceeded',
        429,
        {
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
          remaining: rateLimitResult.remaining
        }
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    await dbConnect();

    const url = new URL(request.url);
    const page = Math.max(1, asNumber(url.searchParams.get('page')));
    const perPage = Math.min(100, Math.max(1, asNumber(url.searchParams.get('per_page'))));
    const q = asString(url.searchParams.get('q'));
    const status = asString(url.searchParams.get('status'));
    const userCode = asString(url.searchParams.get('userCode'));

    const skip = (page - 1) * perPage;

    // Build query
    const query: any = {};
    if (q) {
      query.$or = [
        { trackingNumber: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { shipper: { $regex: q, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (userCode) query.userCode = userCode;

    // Get packages with pagination
    const [packages, total] = await Promise.all([
      Package.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate('customer', 'userCode firstName lastName email')
        .lean(),
      Package.countDocuments(query)
    ]);

    // Get invoice data for each package
    const packageIds = packages.map((pkg: any) => pkg._id);
    const invoices = await Invoice.find({ 
      packageId: { $in: packageIds } 
    }).lean();

    // Map invoices to packages
    const invoiceMap = new Map();
    invoices.forEach((inv: any) => {
      invoiceMap.set(inv.packageId.toString(), inv);
    });

    // Transform data
    const transformedPackages = packages.map((pkg: any) => {
      const daysInStorage = calcDaysInStorage(pkg.dateReceived, pkg.createdAt);
      const weightLbs = pkg.weight * 2.20462;
      const shippingCostJmd = calcShippingCostJmd(weightLbs);
      const storageFeeJmd = calcStorageFeeJmd(daysInStorage);
      const customsDutyUsd = calcCustomsDutyUsd(pkg.itemValueUsd || 0);
      const invoice = invoiceMap.get(pkg._id.toString());

      return {
        PackageID: pkg._id,
        TrackingNumber: pkg.trackingNumber,
        FirstName: pkg.customer?.firstName || '',
        LastName: pkg.customer?.lastName || '',
        UserCode: pkg.userCode,
        Weight: pkg.weight,
        Shipper: pkg.shipper || '',
        Description: pkg.description || '',
        EntryDate: pkg.entryDate || pkg.createdAt,
        EntryDateTime: pkg.entryDate || pkg.createdAt,
        Branch: pkg.branch || '',
        PackageStatus: pkg.status,
        PackagePayments: {
          totalAmount: pkg.totalAmount || 0,
          shippingCost: shippingCostJmd,
          storageFee: storageFeeJmd,
          customsDuty: customsDutyUsd,
          paymentStatus: pkg.paymentStatus || 'pending',
          paidAmount: invoice?.paidAmount || 0,
          balanceAmount: (pkg.totalAmount || 0) - (invoice?.paidAmount || 0),
          invoiceId: invoice?._id,
          invoiceNumber: invoice?.invoiceNumber,
        },
        customer: pkg.customer,
        daysInStorage,
        weightLbs,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt
      };
    });

    const response = TasokoResponseFormatter.success({
      packages: transformedPackages,
      pagination: {
        page,
        perPage,
        total,
        pages: Math.ceil(total / perPage),
        hasNext: page * perPage < total,
        hasPrev: page > 1
      },
      filters: {
        q: q || null,
        status: status || null,
        userCode: userCode || null
      }
    }, `Found ${total} packages`);

    return TasokoResponseFormatter.toJSON(response);

  } catch (error) {
    const response = TasokoResponseFormatter.error(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return TasokoResponseFormatter.toJSON(response);
  }
}
