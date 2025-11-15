"use client";

import { useEffect, useMemo, useState } from "react";

type UIPackage = {
  id?: string;
  tracking_number: string;
  description?: string;
  status: "in_transit" | "ready_for_pickup" | "delivered" | "pending" | "received";
  current_location?: string;
  estimated_delivery?: string;
  weight?: string;
  invoice_status?: string;
  actions_available?: string[];
  ready_since?: string;
  updated_at?: string;
  weight_kg?: number;
};

export default function CustomerPackagesPage() {
  const [items, setItems] = useState<UIPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [locationQuery, setLocationQuery] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  // Advanced filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [weightMin, setWeightMin] = useState<string>("");
  const [weightMax, setWeightMax] = useState<string>("");
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce query input changes (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

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
    const id = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const q = debouncedQuery.trim().toLowerCase();
      const lq = locationQuery.trim().toLowerCase();
      const matchesQuery = !q
        || p.tracking_number.toLowerCase().includes(q)
        || (p.description || "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesLocation = !lq || (p.current_location || "").toLowerCase().includes(lq);
      // Date range filter on updated_at or ready_since/estimated_delivery as fallback
      const fromOk = !dateFrom || (p.updated_at ? new Date(p.updated_at) >= new Date(dateFrom) : true);
      const toOk = !dateTo || (p.updated_at ? new Date(p.updated_at) <= new Date(dateTo + "T23:59:59") : true);
      // Weight filters use numeric weight_kg if available
      const w = p.weight_kg as number | undefined;
      const wMinOk = !weightMin || (typeof w === "number" ? w >= Number(weightMin) : true);
      const wMaxOk = !weightMax || (typeof w === "number" ? w <= Number(weightMax) : true);
      return matchesQuery && matchesStatus && matchesLocation && fromOk && toOk && wMinOk && wMaxOk;
    });
  }, [items, debouncedQuery, statusFilter, locationQuery, dateFrom, dateTo, weightMin, weightMax]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(Math.max(1, page), totalPages);
  const paged = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  function statusLabel(s: UIPackage["status"]) {
    switch (s) {
      case "in_transit":
        return "In Transit";
      case "ready_for_pickup":
        return "At Local Port";
      case "delivered":
        return "Delivered";
      case "pending":
      default:
        return "At Warehouse/Unknown";
    }
  }

  async function uploadInvoice(pkg: UIPackage, files: FileList | null) {
    if (!pkg?.id || !files || files.length === 0) return;
    setUploadingId(pkg.id);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/customer/packages/${encodeURIComponent(pkg.id)}/invoice`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">My Packages</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-md border px-3 py-1.5 text-sm"
            placeholder="Search by tracking/description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input
            className="rounded-md border px-3 py-1.5 text-sm"
            placeholder="Filter by location"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
          />
          <select
            className="rounded-md border px-3 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="in_transit">In Transit</option>
            <option value="ready_for_pickup">At Local Port</option>
            <option value="delivered">Delivered</option>
            <option value="pending">At Warehouse/Unknown</option>
          </select>
        </div>
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
                  <td className="px-3 py-2">{statusLabel(p.status)}</td>
                  <td className="px-3 py-2">{p.current_location || "-"}</td>
                  <td className="px-3 py-2">{p.weight || "-"}</td>
                  <td className="px-3 py-2">{p.invoice_status || "-"}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <a className="rounded border px-2 py-1 text-xs" href={`/track?q=${encodeURIComponent(p.tracking_number)}`} target="_blank">Track</a>
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => load()}
                    >Refresh</button>
                    {p.id && (
                      <label className="rounded border px-2 py-1 text-xs cursor-pointer">
                        {uploadingId === p.id ? "Uploading..." : "Upload Invoice"}
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={(e) => uploadInvoice(p, e.target.files)}
                        />
                      </label>
                    )}
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
