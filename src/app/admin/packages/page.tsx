import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";

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
};

export default async function AdminPackagesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  await dbConnect();

  const statusParam = (typeof searchParams?.status === "string" ? searchParams?.status : "").trim();
  const userCodeParam = (typeof searchParams?.userCode === "string" ? searchParams?.userCode : "").trim();
  const q = (typeof searchParams?.q === "string" ? searchParams?.q : "").trim();
  const sortParam = (typeof searchParams?.sort === "string" ? searchParams?.sort : "newest").trim().toLowerCase();
  const unknownOnly = (typeof searchParams?.unknownOnly === "string" ? searchParams?.unknownOnly : "").toLowerCase() === "true";

  const query: Record<string, unknown> = {};
  // Map UI "Ready" to internal status "At Warehouse"
  if (statusParam) query.status = statusParam === "Ready" ? "At Warehouse" : statusParam;
  if (userCodeParam) query.userCode = { $regex: new RegExp(userCodeParam, "i") };
  if (q) query.$or = [
    { trackingNumber: { $regex: new RegExp(q, "i") } },
    { userCode: { $regex: new RegExp(q, "i") } },
  ];
  if (unknownOnly) query.$or = [{ status: "Unknown" }, { customer: { $exists: false } }, { customer: null }];

  const sortSpec = sortParam === "oldest" ? { updatedAt: 1 } : { updatedAt: -1 };
  const raw = await Package.find(query)
    .sort(sortSpec)
    .limit(500)
    .lean<{
      _id: unknown;
      trackingNumber: string;
      status: string;
      userCode: string;
      weight?: number;
      length?: number; width?: number; height?: number;
      firstName?: string;
      lastName?: string;
      branch?: string;
      createdAt?: Date | string;
      updatedAt?: Date | string;
      description?: string;
      serviceTypeName?: string;
      invoiceRecords?: unknown[];
    }[]>();
  const packages: AdminPackage[] = raw.map((p) => ({
    _id: String(p._id),
    trackingNumber: p.trackingNumber,
    status: p.status,
    userCode: p.userCode,
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
  }));

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Package Management</h1>
        <span className="text-sm text-gray-600">Total: {packages.length}</span>
      </div>
      <FilterBar />

      <div className="grid gap-4">
        {packages.map((p) => (
          <div key={p._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">📦</span>
                  <span className="font-semibold text-gray-900">{p.trackingNumber}</span>
                  <span className="text-gray-400">|</span>
                  <span>{p.firstName || p.lastName ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : p.userCode}</span>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-gray-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> {p.status === 'At Warehouse' ? 'Ready for Pickup' : p.status} • {p.branch || 'Unknown location'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>⚖️ {p.weight ?? '-'} kg</span>
                    <span>• {p.length ?? '-'}×{p.width ?? '-'}×{p.height ?? '-'} cm</span>
                  </div>
                  <div>📅 Received: {new Date(p.createdAt ?? p.updatedAt).toLocaleString()}</div>
                  <div>🏷️ {p.serviceTypeName || p.description || '—'} • {Array.isArray((raw.find(r=>String(r._id)===p._id) as any)?.invoiceRecords) && (raw.find(r=>String(r._id)===p._id) as any)?.invoiceRecords.length>0 ? '📄 Invoice Submitted' : '⚠️ No Invoice'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`#`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Update</a>
                <a href={`/admin/packages/${p._id}`} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800">View Details</a>
                <a href={`#`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">{(p as any).userCode ? 'Notify' : 'Assign'}</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterBar() {
  return (
    <form className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Pill name="All" value="" />
        <Pill name="In Transit" value="In Transit" />
        <Pill name="Ready" value="Ready" />
        <div className="ml-auto flex items-center gap-2">
          <input name="q" placeholder="Search packages" className="w-64 rounded-md border px-3 py-2 text-sm" />
          <select name="sort" className="rounded-md border px-2 py-2 text-sm">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <button className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">Apply</button>
        </div>
      </div>
    </form>
  );
}

function Pill({ name, value }: { name: string; value: string }) {
  const href = value ? `?status=${encodeURIComponent(value)}` : `?`;
  return (
    <a href={href} className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50">{name}</a>
  );
}

// status pill helper removed (not used)
