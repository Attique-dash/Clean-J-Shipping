"use client";

import { useEffect, useState } from "react";

export default function WarehouseAccountPage() {
  type Me = { firstName?: string; lastName?: string; email?: string; branch?: string } | null;
  const [me, setMe] = useState<Me>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", branch: "", password: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/warehouse/account", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { user?: { firstName?: string; lastName?: string; email?: string; branch?: string } }) => {
        const u = d && d.user ? d.user : null;
        setMe(u);
        setForm({
          firstName: (u?.firstName ?? ""),
          lastName: (u?.lastName ?? ""),
          email: (u?.email ?? ""),
          branch: (u?.branch ?? ""),
          password: "",
        });
      })
      .catch(() => setMe(null));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const body: { firstName: string; lastName: string; email: string; branch?: string; password?: string } = {
      firstName: form.firstName || "",
      lastName: form.lastName || "",
      email: form.email || "",
    };
    if (form.branch) body.branch = form.branch;
    if (form.password) body.password = form.password;
    const res = await fetch("/api/warehouse/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setMsg(res.ok ? "Saved" : (typeof data?.error === "string" ? data.error : "Update failed"));
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      {me === null ? (
        <p className="text-sm text-neutral-600">Loading...</p>
      ) : (
        <form className="grid gap-3 max-w-xl" onSubmit={onSubmit}>
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
      )}
    </div>
  );
}
