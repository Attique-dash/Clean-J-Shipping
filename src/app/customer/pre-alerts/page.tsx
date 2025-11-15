"use client";

import { useEffect, useState } from "react";

type PreAlert = {
  _id: string;
  trackingNumber: string;
  carrier?: string;
  origin?: string;
  expectedDate?: string;
  notes?: string;
  status?: "submitted" | "approved" | "rejected";
  decidedAt?: string;
  createdAt?: string;
};

export default function PreAlertsPage() {
  const [items, setItems] = useState<PreAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ tracking_number: "", carrier: "", origin: "", expected_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/pre-alerts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      const list = Array.isArray(data?.pre_alerts) ? data.pre_alerts : [];
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/pre-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_number: form.tracking_number,
          carrier: form.carrier || undefined,
          origin: form.origin || undefined,
          expected_date: form.expected_date || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create pre-alert");
      setForm({ tracking_number: "", carrier: "", origin: "", expected_date: "", notes: "" });
      await load();
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">⚠️</span>
          <h1 className="text-2xl font-semibold">Pre-Alerts</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Create New Pre-Alert
        </button>
      </div>

      {/* Create form card */}
      {showForm && (
        <form onSubmit={onSubmit} className="space-y-4 overflow-hidden rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-md border border-gray-300 px-3 py-2" placeholder="Tracking number" value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} required />
            <input className="rounded-md border border-gray-300 px-3 py-2" placeholder="Carrier (optional)" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-md border border-gray-300 px-3 py-2" placeholder="Origin (optional)" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
            <input className="rounded-md border border-gray-300 px-3 py-2" type="date" placeholder="Expected date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} />
          </div>
          <textarea className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? "Submitting..." : "Submit Pre-Alert"}</button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </form>
      )}

      {/* Cards list */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-lg border bg-white p-4 text-sm text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border bg-white p-4 text-sm text-gray-600">No pre-alerts</div>
        ) : (
          items.map((p) => (
            <div key={p._id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="bg-[#153e75] px-4 py-2 text-sm font-medium text-white">Shipment: {p.trackingNumber}</div>
              <div className="grid gap-2 px-4 py-3 md:grid-cols-2">
                <div className="text-sm">
                  <div className="text-gray-500">Carrier</div>
                  <div className="font-medium">{p.carrier || "-"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-500">Expected</div>
                  <div className="flex items-center gap-2">
                    {p.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">● Approved</span>
                    ) : p.status === "rejected" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">● Rejected</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">● Submitted</span>
                    )}
                    <span className="text-gray-700">{p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : "-"}</span>
                  </div>
                </div>
                <div className="text-sm md:col-span-2">
                  <div className="text-gray-500">Notes</div>
                  <div className="text-gray-800">{p.notes || "-"}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
