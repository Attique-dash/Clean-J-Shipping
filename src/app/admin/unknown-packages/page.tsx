import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";

export default async function UnknownPackagesPage() {
  await dbConnect();
  const raw = await Package.find({
    $or: [{ status: "Unknown" }, { customer: { $exists: false } }, { customer: null }],
  })
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean<{
      _id: unknown;
      trackingNumber: string;
      status: string;
      userCode: string;
      updatedAt?: Date | string;
      description?: string;
    }[]>();

  const items = raw.map((p) => ({
    _id: String(p._id),
    trackingNumber: p.trackingNumber,
    status: p.status,
    userCode: p.userCode,
    description: p.description,
    updatedAt:
      typeof p.updatedAt === "string"
        ? p.updatedAt
        : p.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Unknown Packages</h1>
        <span className="text-sm text-gray-600">Total: {items.length}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-3 py-2 text-left">Tracking #</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">UserCode</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p._id}>
                <td className="px-3 py-2 font-medium">{p.trackingNumber}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.userCode}</td>
                <td className="px-3 py-2">{p.description ?? "-"}</td>
                <td className="px-3 py-2 text-gray-600">{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
