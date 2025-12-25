// AdminPackagesPage.tsx
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import Link from "next/link";
import { Plus } from "lucide-react";
import Actions from "./Actions";
import { 
  Package as PackageIcon, 
  MapPin, 
  Weight, 
  Ruler, 
  Calendar, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Truck,
  Warehouse
} from "lucide-react";

type AdminPackage = {
  _id: string;
  trackingNumber: string;
  status: string;
  userCode: string;
  weight?: number;
  firstName?: string;
  lastName?: string;
  branch?: string;
  createdAt?: string;
  updatedAt: string;
  length?: number;
  width?: number;
  height?: number;
  serviceTypeName?: string;
  description?: string;
  hasInvoice: boolean;
};

export default async function AdminPackagesPage({ 
  searchParams 
}: { 
  searchParams: Promise<Record<string, string | string[] | undefined>> 
}) {
  await dbConnect();

  const params = await searchParams;
  const statusParam = (typeof params?.status === "string" ? params.status : "").trim();
  const userCodeParam = (typeof params?.userCode === "string" ? params.userCode : "").trim();
  const q = (typeof params?.q === "string" ? params.q : "").trim();
  const sortParam = (typeof params?.sort === "string" ? params.sort : "newest").trim().toLowerCase();
  const unknownOnly = (typeof params?.unknownOnly === "string" ? params.unknownOnly : "").toLowerCase() === "true";

  const query: Record<string, unknown> = {};
  // Exclude deleted packages (marked as 'returned')
  query.status = { $ne: "returned" };
  
  if (statusParam) {
    query.status = statusParam === "Ready" ? "At Warehouse" : statusParam;
  }
  if (userCodeParam) {
    // Find user by shippingId (userCode) and get their packages
    const { User } = await import("@/models/User");
    const user = await User.findOne({ shippingId: { $regex: new RegExp(userCodeParam, "i") } }).select('_id').lean();
    if (user) {
      query.userId = user._id;
    } else {
      // If no user found, return empty results
      query.userId = null; // This will return no results
    }
  }
  if (q) {
    // Search by tracking number or find users by shippingId and include their packages
    const { User } = await import("@/models/User");
    const users = await User.find({ shippingId: { $regex: new RegExp(q, "i") } }).select('_id').lean();
    const userIds = users.map(u => u._id);
    
    query.$or = [
      { trackingNumber: { $regex: new RegExp(q, "i") } },
      ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : [])
    ];
  }
  if (unknownOnly) query.$or = [{ status: "Unknown" }, { customer: { $exists: false } }, { customer: null }];

  // Add pagination
  const pageParam = (typeof params?.page === "string" ? parseInt(params.page, 10) : 1) || 1;
  const perPage = 50; // Reduced from 500 to prevent memory issues
  const skip = (pageParam - 1) * perPage;

  // Only select fields we need - don't load large arrays
  const raw = await Package.find(query)
    .select("_id trackingNumber status userId weight length width height firstName lastName branch createdAt updatedAt description serviceTypeName")
    .sort([["updatedAt", (sortParam === "oldest" ? 1 : -1) as 1 | -1]])
    .skip(skip)
    .limit(perPage)
    .lean<{
      _id: unknown;
      trackingNumber: string;
      status: string;
      userId: string;
      weight?: number;
      length?: number; 
      width?: number; 
      height?: number;
      firstName?: string;
      lastName?: string;
      branch?: string;
      createdAt?: Date | string;
      updatedAt?: Date | string;
      description?: string;
      serviceTypeName?: string;
    }>();

  // Get total count for pagination (separate query, more efficient)
  const totalCount = await Package.countDocuments(query);
  
  // Check for invoices separately (only count, don't load data)
  const invoiceMap = new Map<string, boolean>();
  if (raw.length > 0) {
    const packageIds = raw.map(p => p._id);
    try {
      const invoiceCounts = await Package.aggregate([
        { $match: { _id: { $in: packageIds } } },
        { $project: { 
          _id: 1, 
          hasInvoice: { 
            $or: [
              { $gt: [{ $size: { $ifNull: ["$invoiceRecords", []] } }, 0] },
              { $gt: [{ $size: { $ifNull: ["$invoiceDocuments", []] } }, 0] }
            ]
          }
        }}
      ]);
      invoiceCounts.forEach((ic: any) => {
        invoiceMap.set(String(ic._id), ic.hasInvoice || false);
      });
    } catch (err) {
      console.error("Error checking invoices:", err);
      // If aggregation fails, assume no invoices
    }
  }

  // Get user information for all packages to display shippingId (userCode)
  const userIds = raw.map(p => p.userId).filter(Boolean);
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { User } = await import("@/models/User");
    const users = await User.find({ _id: { $in: userIds } }).select('_id shippingId').lean();
    users.forEach((user: { _id: string; shippingId: string }) => {
      userMap.set(String(user._id), user.shippingId || '');
    });
  }

  const packages: AdminPackage[] = raw.map((p) => ({
    _id: String(p._id),
    trackingNumber: p.trackingNumber,
    status: p.status,
    userCode: userMap.get(String(p.userId)) || '', // Get shippingId from userMap
    weight: p.weight,
    firstName: p.firstName,
    lastName: p.lastName,
    branch: p.branch,
    createdAt:
      typeof p.createdAt === "string"
        ? p.createdAt
        : p.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt:
      typeof p.updatedAt === "string"
        ? p.updatedAt
        : p.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    length: p.length,
    width: p.width,
    height: p.height,
    serviceTypeName: p.serviceTypeName,
    description: p.description,
    hasInvoice: invoiceMap.get(String(p._id)) || false,
  }));

  // Calculate stats (use separate efficient queries instead of filtering all packages)
  const [totalStats, atWarehouseStats, inTransitStats, deliveredStats] = await Promise.all([
    Package.countDocuments({ status: { $nin: ["failed", "returned"] } }),
    Package.countDocuments({ status: "At Warehouse" }),
    Package.countDocuments({ status: "In Transit" }),
    Package.countDocuments({ status: "Delivered" }),
  ]);

  const stats = {
    total: totalStats,
    atWarehouse: atWarehouseStats,
    inTransit: inTransitStats,
    delivered: deliveredStats,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
  <div className="absolute inset-0 bg-white/10" />

  <div className="relative flex flex-col gap-6">
    {/* Top Row */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <PackageIcon className="h-7 w-7 text-white" />
        </div>

        <div>
          <p className="text-sm uppercase tracking-widest text-blue-100">Packages</p>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Package Management
          </h1>
        </div>
      </div>

      {/* RIGHT SECTION – ADD BUTTON */}
      <div className="flex items-center">
        <Link
          href="/admin/add-package"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white hover:bg-white/25 rounded-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Package
        </Link>
      </div>
    </div>

    {/* Stats Cards inside header */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total */}
      <div className="group relative overflow-hidden rounded-xl bg-white/10 p-5 shadow-md backdrop-blur">
        <div className="relative flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <PackageIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-blue-100">Total</p>
            <p className="mt-1 text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* at Warehouse */}
      <div className="group relative overflow-hidden rounded-xl bg-emerald-500/20 p-5 shadow-md backdrop-blur">
        <div className="relative flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <Warehouse className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-emerald-100">at Warehouse</p>
            <p className="mt-1 text-2xl font-bold">{stats.atWarehouse}</p>
          </div>
        </div>
      </div>

      {/* in Transit */}
      <div className="group relative overflow-hidden rounded-xl bg-blue-500/20 p-5 shadow-md backdrop-blur">
        <div className="relative flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-blue-100">in Transit</p>
            <p className="mt-1 text-2xl font-bold">{stats.inTransit}</p>
          </div>
        </div>
      </div>

      {/* Delivered */}
      <div className="group relative overflow-hidden rounded-xl bg-purple-500/20 p-5 shadow-md backdrop-blur">
        <div className="relative flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-purple-100">Delivered</p>
            <p className="mt-1 text-2xl font-bold">{stats.delivered}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</header>


      {/* Filter Bar */}
      <FilterBar />

      {/* Packages Grid */}
      {packages.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <PackageIcon className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No packages found</h3>
          <p className="mt-2 text-sm text-gray-500">Try adjusting your filters or add a new package</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {packages.map((p) => (
              <PackageCard key={p._id} package={p} />
            ))}
          </div>
          
          {/* Pagination */}
          {totalCount > perPage && (
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-600">
                Showing {skip + 1} to {Math.min(skip + perPage, totalCount)} of {totalCount} packages
              </div>
              <div className="flex gap-2">
                {pageParam > 1 && (
                  <a
                    href={`?${new URLSearchParams({ ...params, page: String(pageParam - 1) } as any).toString()}`}
                    className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-[#0f4d8a] hover:text-[#0f4d8a]"
                  >
                    Previous
                  </a>
                )}
                {skip + perPage < totalCount && (
                  <a
                    href={`?${new URLSearchParams({ ...params, page: String(pageParam + 1) } as any).toString()}`}
                    className="rounded-xl border-2 border-[#0f4d8a] bg-[#0f4d8a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0e447d]"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-blue-100">{label}</div>
          <div className="text-2xl font-bold text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

function FilterBar() {
  return (
    <form className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Pill name="All Packages" value="" active />
          <Pill name="In Transit" value="In Transit" />
          <Pill name="Ready for Pickup" value="Ready" />
          <Pill name="Delivered" value="Delivered" />
          <Pill name="Unknown Packages" value="unknown" isUnknown />
        </div>

        {/* Search and Sort */}
        <div className="ml-auto flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <input 
              name="q" 
              placeholder="Search tracking or user code..." 
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20 sm:w-64" 
            />
            <PackageIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <select 
            name="sort" 
            className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <button className="rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0e7893] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl">
            Apply Filters
          </button>
        </div>
      </div>
    </form>
  );
}

function Pill({ name, value, active, isUnknown }: { name: string; value: string; active?: boolean; isUnknown?: boolean }) {
  const href = isUnknown ? `?unknownOnly=true` : (value ? `?status=${encodeURIComponent(value)}` : `?`);
  return (
    <a 
      href={href} 
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
        active 
          ? 'bg-[#0f4d8a] text-white shadow-md' 
          : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-[#0f4d8a] hover:text-[#0f4d8a]'
      }`}
    >
      {name}
    </a>
  );
}

function PackageCard({ package: p }: { package: AdminPackage }) {
  const statusConfig = {
    'At Warehouse': { 
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
      icon: Warehouse,
      label: 'Ready for Pickup'
    },
    'In Transit': { 
      color: 'bg-blue-100 text-blue-700 border-blue-200', 
      icon: Truck,
      label: 'In Transit'
    },
    'Delivered': { 
      color: 'bg-purple-100 text-purple-700 border-purple-200', 
      icon: CheckCircle2,
      label: 'Delivered'
    },
    'Unknown': { 
      color: 'bg-gray-100 text-gray-700 border-gray-200', 
      icon: AlertCircle,
      label: 'Unknown'
    }
  };

  const status = statusConfig[p.status as keyof typeof statusConfig] || statusConfig['Unknown'];
  const StatusIcon = status.icon;
  const customerName = p.firstName || p.lastName 
    ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() 
    : p.userCode;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all hover:shadow-2xl">
      {/* Status Accent Bar */}
      <div className={`absolute left-0 top-0 h-full w-1.5 ${status.color.split(' ')[0]}`} />
      
      <div className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left Section - Package Info */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4d8a] to-[#0e7893] shadow-lg">
                <PackageIcon className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">{p.trackingNumber}</h3>
                  {p.hasInvoice && (
                    <div className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                      <FileText className="inline h-3 w-3 mr-1" />
                      Invoice
                    </div>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{customerName}</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 rounded-xl border-2 ${status.color} px-4 py-2 font-semibold shadow-sm`}>
              <StatusIcon className="h-5 w-5" />
              {status.label}
            </div>

            {/* Package Details Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Location */}
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">Location</div>
                  <div className="font-semibold text-gray-900">{p.branch || 'Unknown'}</div>
                </div>
              </div>

              {/* Weight */}
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Weight className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">Weight</div>
                  <div className="font-semibold text-gray-900">{p.weight ?? '-'} kg</div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <Ruler className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">Dimensions</div>
                  <div className="font-semibold text-gray-900">
                    {p.length ?? '-'} × {p.width ?? '-'} × {p.height ?? '-'} cm
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Received:</span>
                <span>{new Date(p.createdAt ?? p.updatedAt).toLocaleString()}</span>
              </div>
              {(p.serviceTypeName || p.description) && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4 mt-0.5" />
                  <span className="font-medium">Service:</span>
                  <span>{p.serviceTypeName || p.description}</span>
                </div>
              )}
              {!p.hasInvoice && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">No invoice submitted</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex shrink-0 flex-col gap-2 lg:ml-4">
            <Actions
              id={p._id}
              trackingNumber={p.trackingNumber}
              status={p.status}
              weight={p.weight}
              description={p.description}
              branch={p.branch}
              length={p.length}
              width={p.width}
              height={p.height}
              hasInvoice={p.hasInvoice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}