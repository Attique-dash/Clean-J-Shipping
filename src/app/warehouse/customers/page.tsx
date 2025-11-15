"use client";

import { useEffect, useState } from "react";

type Customer = {
  user_code: string;
  full_name?: string;
  email?: string;
  phone?: string;
  address_line?: string;
  active_packages?: number;
};

export default function WarehouseCustomersPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/warehouse/customers", window.location.origin);
      if (q.trim()) url.searchParams.set("q", q.trim());
      const r = await fetch(url.toString(), { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to load");
      setItems(d.customers || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(user_code: string) {
    if (!user_code) return;
    if (!confirm(`Delete customer ${user_code}? This cannot be undone.`)) return;
    setDeleting(user_code);
    try {
      const r = await fetch("/api/warehouse/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Delete failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Search by userCode, name, or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={load} disabled={loading} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{loading ? "Searching..." : "Search"}</button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Phone</th>
              <th className="py-2 pr-3">Address</th>
              <th className="py-2 pr-3 text-right">Active Pkgs</th>
              <th className="py-2 pl-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.user_code} className="border-b last:border-0">
                <td className="py-2 pr-3 font-mono">
                  <span className="font-semibold">{c.user_code}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(c.user_code)}
                    className="ml-2 inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] text-neutral-700 hover:bg-neutral-50"
                    title="Copy userCode"
                  >
                    Copy
                  </button>
                </td>
                <td className="py-2 pr-3">{c.full_name || "-"}</td>
                <td className="py-2 pr-3">{c.email || "-"}</td>
                <td className="py-2 pr-3">{c.phone || "-"}</td>
                <td className="py-2 pr-3">{c.address_line || "-"}</td>
                <td className="py-2 pr-3 text-right">{typeof c.active_packages === "number" ? c.active_packages : 0}</td>
                <td className="py-2 pl-3 text-right">
                  <button onClick={() => remove(c.user_code)} disabled={deleting === c.user_code} className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-50">
                    {deleting === c.user_code ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && <p className="text-sm text-neutral-600 mt-2">No results.</p>}
      </div>
    </div>
  );
}
