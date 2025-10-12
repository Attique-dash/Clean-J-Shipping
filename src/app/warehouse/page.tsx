"use client";

import { useEffect, useMemo, useState } from "react";

type User = { firstName: string; lastName: string; email: string; role: string; userCode: string; branch?: string } | null;
type Customer = { userCode: string; firstName: string; lastName: string; email: string; branch?: string };

export default function WarehouseDashboard() {
  // Helper: convert unknown API error (including Zod flatten) to a user-friendly string
  function toMessage(err: unknown, fallback: string): string {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    if (typeof err === "object") {
      const e = err as Record<string, unknown>;
      // If nested under { error: ... }
      if (e && typeof e.error !== "undefined") return toMessage(e.error as unknown, fallback);
      // Zod flatten shape { formErrors, fieldErrors }
      const formErrors = Array.isArray((e as Record<string, unknown>).formErrors)
        ? ((e as Record<string, unknown>).formErrors as unknown[]).filter((x): x is string => typeof x === "string")
        : undefined;
      if (Array.isArray(formErrors) && formErrors.length) return formErrors.join(", ");
      const fieldErrors = (e as Record<string, unknown>).fieldErrors as Record<string, unknown> | undefined;
      if (fieldErrors && typeof fieldErrors === "object") {
        const msgs: string[] = [];
        for (const k of Object.keys(fieldErrors)) {
          const val = fieldErrors[k];
          const arr = Array.isArray(val) ? val.filter((x): x is string => typeof x === "string") : [];
          if (arr.length) msgs.push(`${k}: ${arr.join("; ")}`);
        }
        if (msgs.length) return msgs.join(" | ");
      }
      if (typeof (e as { message?: unknown }).message !== "undefined") return String((e as { message?: unknown }).message);
      try { return JSON.stringify(err); } catch { /* ignore */ }
    }
    return fallback;
  }
  // Account
  const [me, setMe] = useState<User>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", branch: "", password: "" });

  // Helper: today as YYYY-MM-DD for <input type="date">
  const todayYMD = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Packages: add
  const [addPkg, setAddPkg] = useState({ trackingNumber: "", userCode: "", weight: "", shipper: "", description: "", entryDate: todayYMD() });
  const [addPkgMsg, setAddPkgMsg] = useState<string | null>(null);

  // Packages: update status
  const [updPkg, setUpdPkg] = useState({ trackingNumber: "", status: "At Warehouse", note: "", weight: "", shipper: "", userCode: "", manifestId: "", description: "" });
  const [updPkgMsg, setUpdPkgMsg] = useState<string | null>(null);

  // Packages: delete
  const [delPkg, setDelPkg] = useState({ trackingNumber: "" });
  const [delPkgMsg, setDelPkgMsg] = useState<string | null>(null);

  // Manifest update
  const [manifest, setManifest] = useState({ manifestId: "", description: "", data: "{}" });
  const [manifestMsg, setManifestMsg] = useState<string | null>(null);

  // Customers list
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custLoading, setCustLoading] = useState(false);
  const [custErr, setCustErr] = useState<string | null>(null);
  const [custQuery, setCustQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.userCode, c.firstName, c.lastName, c.email, c.branch || ""].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [custQuery, customers]);

  async function loadMe() {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await r.json();
      const u = d?.user ?? null;
      setMe(u);
      if (u) setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, branch: u.branch || "", password: "" });
    } catch {
      setMe(null);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const body: Record<string, unknown> = { firstName: form.firstName, lastName: form.lastName, email: form.email };
    if (form.branch) body.branch = form.branch;
    if (form.password) body.password = form.password;
    const res = await fetch("/api/warehouse/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      setMsg(toMessage(data?.error, "Update failed"));
    } else {
      setMsg("Saved");
      await loadMe();
    }
    setSaving(false);
  }

  async function submitAddPackage(e: React.FormEvent) {
    e.preventDefault();
    setAddPkgMsg(null);
    const payload = {
      trackingNumber: addPkg.trackingNumber.trim(),
      userCode: addPkg.userCode.trim(),
      weight: addPkg.weight ? Number(addPkg.weight) : undefined,
      shipper: addPkg.shipper || undefined,
      description: addPkg.description || undefined,
      // Convert date-only (YYYY-MM-DD) to ISO datetime per z.string().datetime()
      entryDate: addPkg.entryDate ? new Date(addPkg.entryDate).toISOString() : undefined,
    };
    const res = await fetch("/api/warehouse/packages/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) setAddPkgMsg(toMessage(data?.error, "Failed to add package"));
    else {
      setAddPkgMsg("Package saved");
      setAddPkg({ trackingNumber: "", userCode: "", weight: "", shipper: "", description: "", entryDate: todayYMD() });
    }
  }

  async function submitUpdatePackage(e: React.FormEvent) {
    e.preventDefault();
    setUpdPkgMsg(null);
    const payload = {
      trackingNumber: updPkg.trackingNumber.trim(),
      status: updPkg.status,
      note: updPkg.note || undefined,
      weight: updPkg.weight ? Number(updPkg.weight) : undefined,
      shipper: updPkg.shipper || undefined,
      userCode: updPkg.userCode || undefined,
      manifestId: updPkg.manifestId || undefined,
      description: updPkg.description || undefined,
    };
    const res = await fetch("/api/warehouse/packages/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setUpdPkgMsg(res.ok ? "Package updated" : toMessage(data?.error, "Failed to update package"));
  }

  async function submitDeletePackage(e: React.FormEvent) {
    e.preventDefault();
    setDelPkgMsg(null);
    const res = await fetch("/api/warehouse/packages/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackingNumber: delPkg.trackingNumber.trim() }) });
    const data = await res.json();
    setDelPkgMsg(res.ok ? "Package deleted" : toMessage(data?.error, "Failed to delete package"));
  }

  async function submitManifest(e: React.FormEvent) {
    e.preventDefault();
    setManifestMsg(null);
    let dataObj: unknown = undefined;
    try {
      dataObj = manifest.data ? JSON.parse(manifest.data) : undefined;
    } catch {
      setManifestMsg("Manifest data must be valid JSON");
      return;
    }
    const res = await fetch("/api/warehouse/manifests/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manifestId: manifest.manifestId.trim(), description: manifest.description || undefined, data: dataObj }) });
    const data = await res.json();
    setManifestMsg(res.ok ? "Manifest saved" : toMessage(data?.error, "Failed to save manifest"));
  }

  async function loadCustomers() {
    setCustLoading(true);
    setCustErr(null);
    try {
      const r = await fetch("/api/warehouse/customers", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to load");
      setCustomers(d.items || []);
    } catch (e: unknown) {
      setCustErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setCustLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Warehouse Dashboard</h1>

      {/* Account overview */}
      <div className="rounded-xl border p-5 dark:border-neutral-800">
        <h2 className="mb-2 font-medium">Account</h2>
        {me ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt>Name</dt><dd>{me.firstName} {me.lastName}</dd></div>
            <div className="flex justify-between"><dt>Email</dt><dd>{me.email}</dd></div>
            <div className="flex justify-between"><dt>User Code</dt><dd>{me.userCode}</dd></div>
            <div className="flex justify-between"><dt>Role</dt><dd>{me.role}</dd></div>
          </dl>
        ) : (
          <p className="text-sm text-neutral-600">Loading...</p>
        )}
      </div>

      {/* Manage account */}
      <div className="rounded-xl border p-5 dark:border-neutral-800">
        <h2 className="mb-3 font-medium">Manage Account</h2>
        <form className="grid gap-3 max-w-xl" onSubmit={saveAccount}>
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2 py-1" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <input className="border rounded px-2 py-1" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <input className="border rounded px-2 py-1" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="border rounded px-2 py-1" placeholder="Branch (optional)" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
          <input className="border rounded px-2 py-1" type="password" placeholder="New password (optional, min 6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="flex items-center gap-3">
            <button disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button>
            {msg && <span className="text-sm text-neutral-600">{msg}</span>}
          </div>
        </form>
      </div>

      {/* Package management */}
      <div className="rounded-xl border p-5 dark:border-neutral-800 space-y-4">
        <h2 className="font-medium">Packages</h2>

        {/* Add package */}
        <form className="grid gap-2 max-w-2xl" onSubmit={submitAddPackage}>
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Tracking number" value={addPkg.trackingNumber} onChange={(e) => setAddPkg({ ...addPkg, trackingNumber: e.target.value })} required />
            <input className="border rounded px-2 py-1" placeholder="Customer code" value={addPkg.userCode} onChange={(e) => setAddPkg({ ...addPkg, userCode: e.target.value })} required />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Weight (kg)" value={addPkg.weight} onChange={(e) => setAddPkg({ ...addPkg, weight: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Shipper" value={addPkg.shipper} onChange={(e) => setAddPkg({ ...addPkg, shipper: e.target.value })} />
            <input className="border rounded px-2 py-1" type="date" value={addPkg.entryDate} onChange={(e) => setAddPkg({ ...addPkg, entryDate: e.target.value })} />
          </div>
          <input className="border rounded px-2 py-1" placeholder="Description" value={addPkg.description} onChange={(e) => setAddPkg({ ...addPkg, description: e.target.value })} />
          <div className="flex items-center gap-3">
            <button className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">Add / Save</button>
            {addPkgMsg && <span className="text-sm text-neutral-600">{addPkgMsg}</span>}
          </div>
        </form>

        {/* Update status */}
        <form className="grid gap-2 max-w-2xl" onSubmit={submitUpdatePackage}>
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Tracking number" value={updPkg.trackingNumber} onChange={(e) => setUpdPkg({ ...updPkg, trackingNumber: e.target.value })} required />
            <select className="border rounded px-2 py-1" value={updPkg.status} onChange={(e) => setUpdPkg({ ...updPkg, status: e.target.value })}>
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
            <input className="border rounded px-2 py-1" placeholder="Note (optional)" value={updPkg.note} onChange={(e) => setUpdPkg({ ...updPkg, note: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Weight (kg)" value={updPkg.weight} onChange={(e) => setUpdPkg({ ...updPkg, weight: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Shipper" value={updPkg.shipper} onChange={(e) => setUpdPkg({ ...updPkg, shipper: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Customer code (optional)" value={updPkg.userCode} onChange={(e) => setUpdPkg({ ...updPkg, userCode: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Manifest ID (optional)" value={updPkg.manifestId} onChange={(e) => setUpdPkg({ ...updPkg, manifestId: e.target.value })} />
            <input className="border rounded px-2 py-1" placeholder="Description (optional)" value={updPkg.description} onChange={(e) => setUpdPkg({ ...updPkg, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">Update Status</button>
            {updPkgMsg && <span className="text-sm text-neutral-600">{updPkgMsg}</span>}
          </div>
        </form>

        {/* Delete package */}
        <form className="grid gap-2 max-w-xl" onSubmit={submitDeletePackage}>
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Tracking number" value={delPkg.trackingNumber} onChange={(e) => setDelPkg({ trackingNumber: e.target.value })} required />
            <button className="rounded bg-red-600 px-3 py-1.5 text-sm text-white">Delete</button>
          </div>
          {delPkgMsg && <span className="text-sm text-neutral-600">{delPkgMsg}</span>}
        </form>
      </div>

      {/* Manifest */}
      <div className="rounded-xl border p-5 dark:border-neutral-800">
        <h2 className="mb-3 font-medium">Manifest</h2>
        <form className="grid gap-2 max-w-2xl" onSubmit={submitManifest}>
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Manifest ID" value={manifest.manifestId} onChange={(e) => setManifest({ ...manifest, manifestId: e.target.value })} required />
            <input className="border rounded px-2 py-1" placeholder="Description (optional)" value={manifest.description} onChange={(e) => setManifest({ ...manifest, description: e.target.value })} />
          </div>
          <textarea className="border rounded px-2 py-1 min-h-28 font-mono text-sm" placeholder='JSON data, e.g. {"packages": ["TRK1","TRK2"]}' value={manifest.data} onChange={(e) => setManifest({ ...manifest, data: e.target.value })} />
          <div className="flex items-center gap-3">
            <button className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">Save Manifest</button>
            {manifestMsg && <span className="text-sm text-neutral-600">{manifestMsg}</span>}
          </div>
        </form>
      </div>

      {/* Customers */}
      <div className="rounded-xl border p-5 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Customers</h2>
          <div className="flex items-center gap-2">
            <input className="border rounded px-2 py-1 text-sm" placeholder="Search..." value={custQuery} onChange={(e) => setCustQuery(e.target.value)} />
            <button onClick={loadCustomers} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" disabled={custLoading}>{custLoading ? "Loading..." : "Refresh"}</button>
          </div>
        </div>
        {custErr && <p className="text-sm text-red-600">{custErr}</p>}
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b dark:border-neutral-800">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Branch</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.userCode} className="border-b last:border-0 dark:border-neutral-800">
                  <td className="py-2 pr-3 font-mono">{c.userCode}</td>
                  <td className="py-2 pr-3">{c.firstName} {c.lastName}</td>
                  <td className="py-2 pr-3">{c.email}</td>
                  <td className="py-2 pr-3">{c.branch || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!custLoading && customers.length === 0 && (
            <p className="text-sm text-neutral-600 mt-2">No customers loaded. Click Refresh to load the list.</p>
          )}
        </div>
      </div>
    </div>
  );
}
