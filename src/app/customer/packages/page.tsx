"use client";

import { useEffect, useState } from "react";

type UIPackage = {
  tracking_number: string;
  description?: string;
  status: "in_transit" | "ready_for_pickup" | "delivered" | "pending" | "received";
  current_location?: string;
  estimated_delivery?: string;
  weight?: string;
  invoice_status?: string;
  actions_available?: string[];
  ready_since?: string;
};

export default function CustomerPackagesPage() {
  const [items, setItems] = useState<UIPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/packages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load packages");
      const list: UIPackage[] = Array.isArray(data?.packages) ? data.packages : [];
      setItems(list);
      setTotal(Number(data?.total_packages || list.length));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.tracking_number.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.current_location || "").toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">My Packages</h1>
        <input
          className="rounded-md border px-3 py-1.5 text-sm"
          placeholder="Search packages"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-3 py-2 text-left">Tracking</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Location</th>
              <th className="px-3 py-2 text-left">Weight</th>
              <th className="px-3 py-2 text-left">Invoice</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={7}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={7}>No packages found</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.tracking_number}>
                  <td className="px-3 py-2 font-medium">{p.tracking_number}</td>
                  <td className="px-3 py-2">{p.description || "-"}</td>
                  <td className="px-3 py-2 capitalize">{p.status.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2">{p.current_location || "-"}</td>
                  <td className="px-3 py-2">{p.weight || "-"}</td>
                  <td className="px-3 py-2">{p.invoice_status || "-"}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <a className="rounded border px-2 py-1 text-xs" href={`/tracking/${encodeURIComponent(p.tracking_number)}`} target="_blank">Track</a>
                    <a className="rounded border px-2 py-1 text-xs" href={`/api/customer/packages`}>Refresh</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">Total: {total}</div>
    </div>
  );
}
