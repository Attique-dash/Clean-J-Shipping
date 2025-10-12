import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PreAlertsPage() {
  // Server-side fetch to internal API for fresh data
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/pre-alerts`, {
    cache: "no-store",
  });
  let data: any[] = [];
  try {
    const json = await res.json();
    data = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
  } catch {}

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pre-Alerts</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3 font-medium">Incoming Shipment Notifications</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Tracking #</th>
                <th className="px-3 py-2 text-left">Carrier</th>
                <th className="px-3 py-2 text-left">Origin</th>
                <th className="px-3 py-2 text-left">Expected</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No pre-alerts</td>
                </tr>
              )}
              {data.map((p: any, i: number) => (
                <tr key={p._id || i}>
                  <td className="px-3 py-2 font-medium">{p.trackingNumber}</td>
                  <td className="px-3 py-2">{p.carrier || "-"}</td>
                  <td className="px-3 py-2">{p.origin || "-"}</td>
                  <td className="px-3 py-2">{p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : "-"}</td>
                  <td className="px-3 py-2">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
