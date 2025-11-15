"use client";

import { useEffect, useRef, useState } from "react";
import { generateTrackingNumber } from "@/lib/tracking";

export default function WarehousePackagesPage() {
  // Add package form
  const [add, setAdd] = useState({ trackingNumber: "", userCode: "", weight: "", shipper: "", description: "", entryDate: new Date().toISOString().slice(0, 10) });
  const [tnExists, setTnExists] = useState<boolean | null>(null);
  const [tnChecking, setTnChecking] = useState(false);
  const checkTimer = useRef<number | null>(null);
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Update status form
  const [upd, setUpd] = useState({ trackingNumber: "", status: "At Warehouse", note: "", weight: "", shipper: "", userCode: "", manifestId: "", description: "" });
  const [updMsg, setUpdMsg] = useState<string | null>(null);
  const [updLoading, setUpdLoading] = useState(false);

  // Delete form
  const [del, setDel] = useState({ trackingNumber: "" });
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  function toMessage(err: unknown, fallback: string) {
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const e = err as {
        error?: unknown;
        formErrors?: unknown;
        fieldErrors?: Record<string, unknown> | unknown;
        message?: unknown;
      };
      if (typeof e.error !== "undefined") return toMessage(e.error, fallback);
      if (Array.isArray(e.formErrors) && e.formErrors.length) return e.formErrors.join(", ");
      if (e.fieldErrors && typeof e.fieldErrors === "object") {
        const fe = e.fieldErrors as Record<string, unknown>;
        const msgs: string[] = [];
        for (const k in fe) {
          const v = fe[k];
          if (Array.isArray(v)) msgs.push(`${k}: ${(v as unknown[]).join("; ")}`);
        }
        if (msgs.length) return msgs.join(" | ");
      }
      if (typeof e.message !== "undefined") return String(e.message);
    }
    return fallback;
  }

  // Strong tracking generator provided by lib/tracking

  function refreshTracking() {
    const v = generateTrackingNumber("TAS");
    setAdd((s) => ({ ...s, trackingNumber: v }));
    // trigger check
    void checkExists(v);
  }

  async function checkExists(tracking: string) {
    const t = tracking.trim();
    if (!t) { setTnExists(null); return; }
    setTnChecking(true);
    try {
      const r = await fetch(`/api/warehouse/packages/exist?tracking=${encodeURIComponent(t)}`, { cache: "no-store" });
      const d = await r.json();
      setTnExists(Boolean(d?.exists));
    } catch {
      setTnExists(null);
    } finally {
      setTnChecking(false);
    }
  }

  // On mount, if tracking number empty, generate one
  useEffect(() => {
    if (!add.trackingNumber) {
      const v = generateTrackingNumber("TAS");
      setAdd((s) => ({ ...s, trackingNumber: v }));
      void checkExists(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddMsg(null);
    // Block if duplicate
    if (tnExists) {
      setAddMsg("Tracking number already exists. Click Refresh to generate a new one.");
      setAddLoading(false);
      return;
    }
    const payload = {
      trackingNumber: add.trackingNumber.trim(),
      userCode: add.userCode.trim(),
      weight: add.weight ? Number(add.weight) : undefined,
      shipper: add.shipper || undefined,
      description: add.description || undefined,
      entryDate: add.entryDate ? new Date(add.entryDate).toISOString() : undefined,
    };
    const r = await fetch("/api/warehouse/packages/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    setAddMsg(r.ok ? "Package saved" : toMessage(d, "Failed to add package"));
    if (r.ok) {
      // Generate a new tracking for next entry
      const next = generateTrackingNumber("TAS");
      setAdd({ trackingNumber: next, userCode: "", weight: "", shipper: "", description: "", entryDate: new Date().toISOString().slice(0, 10) });
      setTnExists(null);
      void checkExists(next);
    }
    setAddLoading(false);
  }

  async function onUpd(e: React.FormEvent) {
    e.preventDefault();
    setUpdLoading(true);
    setUpdMsg(null);
    const payload = {
      trackingNumber: upd.trackingNumber.trim(),
      status: upd.status,
      note: upd.note || undefined,
      weight: upd.weight ? Number(upd.weight) : undefined,
      shipper: upd.shipper || undefined,
      userCode: upd.userCode || undefined,
      manifestId: upd.manifestId || undefined,
      description: upd.description || undefined,
    };
    const r = await fetch("/api/warehouse/packages/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    setUpdMsg(r.ok ? "Package updated" : toMessage(d, "Failed to update package"));
    setUpdLoading(false);
  }

  async function onDel(e: React.FormEvent) {
    e.preventDefault();
    setDelLoading(true);
    setDelMsg(null);
    const r = await fetch("/api/warehouse/packages/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackingNumber: del.trackingNumber.trim() }) });
    const d = await r.json();
    setDelMsg(r.ok ? "Package deleted" : toMessage(d, "Failed to delete package"));
    if (r.ok) setDel({ trackingNumber: "" });
    setDelLoading(false);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Packages</h1>

      <section className="rounded-xl border p-5 space-y-3">
        <h2 className="font-medium">Add Package</h2>
        <form className="grid gap-2 max-w-2xl" onSubmit={onAdd}>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <input
                className={`border rounded px-2 py-1 ${tnExists ? "border-red-500" : ""}`}
                placeholder="Tracking number (10 chars: letters, numbers, '-', not at start/end)"
                value={add.trackingNumber}
                onChange={(e) => {
                  let v = e.target.value.replace(/\s+/g, "").slice(0, 10);
                  // Ensure '-' not at start/end; replace with alnum if present there
                  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
                  const numbers = "23456789";
                  const alnum = letters + numbers;
                  const pick = () => alnum[Math.floor(Math.random() * alnum.length)];
                  if (v.startsWith("-")) v = pick() + v.slice(1);
                  if (v.endsWith("-")) v = v.slice(0, -1) + pick();
                  setAdd({ ...add, trackingNumber: v });
                  // debounce exists check
                  if (checkTimer.current) window.clearTimeout(checkTimer.current);
                  checkTimer.current = window.setTimeout(() => { void checkExists(v); }, 300);
                }}
                required
              />
              <button type="button" onClick={refreshTracking} className="rounded border px-2 py-1 text-sm hover:bg-neutral-50">Refresh</button>
            </div>
            <input className="border rounded px-2 py-1" placeholder="Customer code" value={add.userCode} onChange={(e) => setAdd({ ...add, userCode: e.target.value })} required />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Weight (kg)" value={add.weight} onChange={(e) => setAdd({ ...add, weight: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Shipper" value={add.shipper} onChange={(e) => setAdd({ ...add, shipper: e.target.value })} />
            <input className="border rounded px-2 py-1" type="date" value={add.entryDate} onChange={(e) => setAdd({ ...add, entryDate: e.target.value })} />
          </div>
          <input className="border rounded px-2 py-1" placeholder="Description" value={add.description} onChange={(e) => setAdd({ ...add, description: e.target.value })} />
          {tnExists && <div className="text-sm text-red-600">Tracking number already exists. Click Refresh to generate a new one.</div>}
          <div className="flex items-center gap-3">
            <button disabled={addLoading || !!tnExists || !add.trackingNumber} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{addLoading ? "Saving..." : "Add / Save"}</button>
            {tnChecking && <span className="text-sm text-neutral-600">Checking...</span>}
            {addMsg && <span className="text-sm text-neutral-600">{addMsg}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-5 space-y-3">
        <h2 className="font-medium">Update Status</h2>
        <form className="grid gap-2 max-w-2xl" onSubmit={onUpd}>
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Tracking number" value={upd.trackingNumber} onChange={(e) => setUpd({ ...upd, trackingNumber: e.target.value })} required />
            <select className="border rounded px-2 py-1" value={upd.status} onChange={(e) => setUpd({ ...upd, status: e.target.value })}>
              {["Unknown", "At Warehouse", "In Transit", "At Local Port", "Delivered", "Deleted"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Note (optional)" value={upd.note} onChange={(e) => setUpd({ ...upd, note: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Weight (kg)" value={upd.weight} onChange={(e) => setUpd({ ...upd, weight: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Shipper" value={upd.shipper} onChange={(e) => setUpd({ ...upd, shipper: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Customer code (optional)" value={upd.userCode} onChange={(e) => setUpd({ ...upd, userCode: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Manifest ID (optional)" value={upd.manifestId} onChange={(e) => setUpd({ ...upd, manifestId: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Description (optional)" value={upd.description} onChange={(e) => setUpd({ ...upd, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <button disabled={updLoading} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{updLoading ? "Updating..." : "Update Status"}</button>
            {updMsg && <span className="text-sm text-neutral-600">{updMsg}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-5 space-y-3">
        <h2 className="font-medium">Delete Package</h2>
        <form className="grid gap-2 max-w-xl" onSubmit={onDel}>
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Tracking number" value={del.trackingNumber} onChange={(e) => setDel({ trackingNumber: e.target.value })} required />
            <button disabled={delLoading} className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{delLoading ? "Deleting..." : "Delete"}</button>
          </div>
          {delMsg && <span className="text-sm text-neutral-600">{delMsg}</span>}
        </form>
      </section>
    </div>
  );
}
