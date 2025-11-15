"use client";

import { useState } from "react";

export default function WarehouseUpdateStatusPage() {
  const [form, setForm] = useState({
    trackingNumber: "",
    status: "At Warehouse",
    note: "",
    weight: "",
    shipper: "",
    userCode: "",
    manifestId: "",
    description: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const payload = {
      trackingNumber: form.trackingNumber.trim(),
      status: form.status,
      note: form.note || undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      shipper: form.shipper || undefined,
      userCode: form.userCode || undefined,
      manifestId: form.manifestId || undefined,
      description: form.description || undefined,
    };
    const res = await fetch("/api/warehouse/packages/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMsg(res.ok ? "Package updated" : (typeof data?.error === "string" ? data.error : "Failed to update package"));
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Update Package Status</h1>
      <form className="grid gap-2 max-w-2xl" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Tracking number" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} required />
          <select className="border rounded px-2 py-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {[
              "Unknown",
              "At Warehouse",
              "In Transit",
              "At Local Port",
              "Delivered",
              "Deleted",
            ].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Weight (kg)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Shipper" value={form.shipper} onChange={(e) => setForm({ ...form, shipper: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Customer code (optional)" value={form.userCode} onChange={(e) => setForm({ ...form, userCode: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Manifest ID (optional)" value={form.manifestId} onChange={(e) => setForm({ ...form, manifestId: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <button disabled={loading} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{loading ? "Updating..." : "Update Status"}</button>
          {msg && <span className="text-sm text-neutral-600">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
