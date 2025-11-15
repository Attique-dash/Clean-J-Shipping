"use client";

import { useState } from "react";

export default function WarehouseManifestsPage() {
  const [form, setForm] = useState({ manifestId: "", description: "", data: "{}" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    let parsed: unknown = undefined;
    try {
      parsed = form.data ? JSON.parse(form.data) : undefined;
    } catch {
      setMsg("Manifest data must be valid JSON");
      setLoading(false);
      return;
    }
    const r = await fetch("/api/warehouse/manifests/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manifestId: form.manifestId.trim(), description: form.description || undefined, data: parsed }),
    });
    const d = await r.json();
    setMsg(r.ok ? "Manifest saved" : (typeof d?.error === "string" ? d.error : "Failed to save manifest"));
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manifests</h1>
      <form className="grid gap-2 max-w-2xl" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Manifest ID" value={form.manifestId} onChange={(e) => setForm({ ...form, manifestId: e.target.value })} required />
          <input className="border rounded px-2 py-1" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <textarea className="border rounded px-2 py-1 min-h-28 font-mono text-sm" placeholder='JSON data, e.g. {"packages": ["TRK1","TRK2"]}' value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        <div className="flex items-center gap-3">
          <button disabled={loading} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{loading ? "Saving..." : "Save Manifest"}</button>
          {msg && <span className="text-sm text-neutral-600">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
