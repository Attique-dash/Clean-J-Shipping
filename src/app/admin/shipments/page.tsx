"use client";

import { useState } from "react";

type ShipmentRow = {
  tracking_number: string;
  status?: string;
  weight?: string;
  notes?: string;
};

export default function AdminShipmentsPage() {
  const [manifestId, setManifestId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("air");
  const [batchDate, setBatchDate] = useState("");
  const [rows, setRows] = useState<ShipmentRow[]>([{ tracking_number: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function addRow() {
    setRows((p) => [...p, { tracking_number: "" }]);
  }
  function removeRow(idx: number) {
    setRows((p) => p.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Compose payload that admin API expects (manifestSchema with flexible data bag)
      const payload = {
        manifestId: manifestId.trim(),
        description: title || undefined,
        data: {
          title: title || undefined,
          mode,
          batch_date: batchDate || undefined,
          shipments: rows
            .filter((r) => r.tracking_number.trim())
            .map((r) => ({
              tracking_number: r.tracking_number.trim(),
              status: (r.status || "").trim() || undefined,
              weight: r.weight ? Number(r.weight) : undefined,
              notes: (r.notes || "").trim() || undefined,
            })),
        },
      };
      const res = await fetch("/api/admin/shipments/manifests/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update manifest");
      setSuccess(`Manifest ${payload.manifestId} saved.`);
      // keep fields for continued edits; clear errors
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Shipments</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="rounded border px-3 py-2" placeholder="Manifest ID" value={manifestId} onChange={(e) => setManifestId(e.target.value)} required />
          <input className="rounded border px-3 py-2" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="rounded border px-3 py-2" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="air">Air</option>
            <option value="sea">Sea</option>
            <option value="land">Land</option>
          </select>
          <input className="rounded border px-3 py-2" type="date" value={batchDate} onChange={(e) => setBatchDate(e.target.value)} />
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900/50">
              <tr>
                <th className="px-3 py-2 text-left">Tracking #</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Weight (kg)</th>
                <th className="px-3 py-2 text-left">Notes</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <input className="w-full rounded border px-2 py-1" placeholder="Tracking number" value={r.tracking_number} onChange={(e) => setRows((p) => p.map((x,i)=> i===idx?{...x, tracking_number: e.target.value}:x))} required />
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-full rounded border px-2 py-1" placeholder="Status (optional)" value={r.status||""} onChange={(e) => setRows((p) => p.map((x,i)=> i===idx?{...x, status: e.target.value}:x))} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-full rounded border px-2 py-1" type="number" min={0} step={0.01} placeholder="0.00" value={r.weight||""} onChange={(e) => setRows((p) => p.map((x,i)=> i===idx?{...x, weight: e.target.value}:x))} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-full rounded border px-2 py-1" placeholder="Notes" value={r.notes||""} onChange={(e) => setRows((p) => p.map((x,i)=> i===idx?{...x, notes: e.target.value}:x))} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => removeRow(idx)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {success && <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{success}</div>}

        <div className="flex justify-between items-center">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={addRow}>Add Shipment</button>
          <button disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{submitting?"Saving...":"Save Manifest"}</button>
        </div>
      </form>
    </div>
  );
}
