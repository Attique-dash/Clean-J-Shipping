"use client";

import { useState } from "react";

export default function WarehouseAddPackagePage() {
  const [form, setForm] = useState({
    trackingNumber: "",
    userCode: "",
    weight: "",
    shipper: "",
    description: "",
    entryDate: new Date().toISOString().slice(0, 10),
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const payload = {
      trackingNumber: form.trackingNumber.trim(),
      userCode: form.userCode.trim(),
      weight: form.weight ? Number(form.weight) : undefined,
      shipper: form.shipper || undefined,
      description: form.description || undefined,
      entryDate: form.entryDate ? new Date(form.entryDate).toISOString() : undefined,
    };
    const res = await fetch("/api/warehouse/packages/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) setMsg(typeof data?.error === "string" ? data.error : "Failed to add package");
    else {
      setMsg("Package saved");
      setForm({ trackingNumber: "", userCode: "", weight: "", shipper: "", description: "", entryDate: new Date().toISOString().slice(0, 10) });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Add Package</h1>
      <form className="grid gap-2 max-w-2xl" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Tracking number" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} required />
          <input className="border rounded px-2 py-1" placeholder="Customer code" value={form.userCode} onChange={(e) => setForm({ ...form, userCode: e.target.value })} required />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Weight (kg)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Shipper" value={form.shipper} onChange={(e) => setForm({ ...form, shipper: e.target.value })} />
          <input className="border rounded px-2 py-1" type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
        </div>
        <input className="border rounded px-2 py-1" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="flex items-center gap-3">
          <button disabled={loading} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{loading ? "Saving..." : "Add / Save"}</button>
          {msg && <span className="text-sm text-neutral-600">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
