"use client";

import { useEffect, useState } from "react";

type Customer = {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  branch?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  status?: string; // Active, Inactive
  emailVerified?: boolean;
  accountType?: string; // Basic/Premium/etc
  serviceTypeIDs?: string[];
  createdAt?: string;
};

type ApiCustomer = {
  customer_id: string;
  full_name?: string;
  email: string;
  userCode?: string;
  address?: { city?: string };
  member_since?: string;
};

export default function CustomersPageClient() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    // address
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    // account settings
    status: "Active",
    emailVerified: "Yes",
    accountType: "Basic",
    // misc
    branch: "",
    serviceTypeIDs: "",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.customers)
        ? (data.customers as ApiCustomer[]).map((it) => {
            // Map API shape to this client's expected fields for display
            const name: string = it.full_name || "";
            const parts = String(name).trim().split(/\s+/);
            const lastName = parts.length > 1 ? String(parts.pop()) : "";
            const firstName = parts.join(" ");
            return {
              _id: it.customer_id,
              userCode: it.userCode || "",
              firstName,
              lastName,
              email: it.email,
              branch: it.address?.city || "",
              serviceTypeIDs: [],
              createdAt: it.member_since,
            } as Customer;
          })
        : [];
      setItems(arr);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      status: "Active",
      emailVerified: "Yes",
      accountType: "Basic",
      branch: "",
      serviceTypeIDs: "",
    });
    setShowForm(true);
  }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone || "",
      password: "",
      street: c.street || "",
      city: c.city || "",
      state: c.state || "",
      zip: c.zip || "",
      country: c.country || "",
      status: c.status || "Active",
      emailVerified: (c.emailVerified ? "Yes" : "No") as "Yes" | "No",
      accountType: c.accountType || "Basic",
      branch: c.branch || "",
      serviceTypeIDs: (c.serviceTypeIDs||[]).join(","),
    });
    setShowForm(true);
  }

  const filtered = items.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.userCode.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
    );
  });

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body: Record<string, unknown> = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      branch: form.branch || undefined,
      // address
      address: {
        street: form.street || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zip: form.zip || undefined,
        country: form.country || undefined,
      },
      // account settings
      status: form.status,
      emailVerified: form.emailVerified === "Yes",
      accountType: form.accountType,
      serviceTypeIDs: form.serviceTypeIDs ? form.serviceTypeIDs.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    };
    if (!editing) body.password = form.password;
    if (editing) {
      body.id = editing._id;
      if (form.password) body.password = form.password;
    }
    const res = await fetch("/api/admin/customers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Request failed");
      return;
    }
    setShowForm(false);
    await load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this customer?")) return;
    const res = await fetch("/api/admin/customers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-5">
      {/* Header & search */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Customer Management</h1>
        <div className="flex items-center gap-2">
          <input className="w-72 rounded-md border px-3 py-2 text-sm" placeholder="Search customers..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <button onClick={openAdd} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Add Customer</button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">Status:</label>
            <select className="rounded border px-2 py-1">
              <option>All</option>
              <option>Verified</option>
              <option>Pending</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">Type:</label>
            <select className="rounded border px-2 py-1">
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Cards */}
      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">No customers found</div>
        ) : (
          filtered.map((c) => {
            const name = `${c.firstName} ${c.lastName}`.trim();
            const verified = Boolean(c.email);
            const memberSince = c.createdAt ? new Date(c.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' }) : undefined;
            return (
              <div key={c._id} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="absolute inset-y-0 right-0 w-1 rounded-r-xl" style={{ backgroundColor: verified ? '#86efac' : '#fde68a' }} />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{name || c.userCode}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                        {verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                    <div className="truncate">{c.email}</div>
                    <div className="truncate">{c.branch || '-'}</div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" /> Active
                    </div>
                    <div className="text-gray-600">{memberSince ? `Member since ${memberSince}` : ''}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-md border px-3 py-1.5 text-sm" onClick={() => openEdit(c)}>Edit</button>
                    <a className="rounded-md border px-3 py-1.5 text-sm" href={`/admin/customers/${c._id}`}>View</a>
                    <a className="rounded-md border px-3 py-1.5 text-sm" href={`/admin/messages?to=${encodeURIComponent(c.userCode)}`}>Message</a>
                    <button className="rounded-md border px-3 py-1.5 text-sm text-red-700" onClick={() => deleteItem(c._id)}>Deactivate</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-lg bg-white text-black flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="text-lg font-semibold flex items-center gap-2">{editing ? "✏️ Edit Customer" : "➕ Add Customer"}</div>
              <button onClick={() => setShowForm(false)} className="text-sm">✕</button>
            </div>
            <form className="flex-1 overflow-y-auto px-5 py-4 space-y-4" onSubmit={submitForm}>
              {editing && (
                <div className="text-sm text-gray-700"><span className="font-medium">Customer ID:</span> {editing.userCode || editing._id}</div>
              )}
              {/* Personal Details */}
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Personal Details</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="border rounded px-3 py-2" placeholder="Full name (First)" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                  <input className="border rounded px-3 py-2" placeholder="Full name (Last)" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                  <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              {/* Address Information */}
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Address Information</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="ZIP" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                  <select className="border rounded px-3 py-2" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                    <option value="">Country</option>
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                  </select>
                </div>
              </div>

              {/* Account Settings */}
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Account Settings</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select className="border rounded px-3 py-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  <select className="border rounded px-3 py-2" value={form.emailVerified} onChange={(e) => setForm({ ...form, emailVerified: e.target.value as "Yes" | "No" })}>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                  <select className="border rounded px-3 py-2" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
                    <option>Basic</option>
                    <option>Premium</option>
                    <option>Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Existing extras */}
              <div className="grid gap-2 sm:grid-cols-2">
                {!editing && (
                  <input className="border rounded px-3 py-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                )}
                {editing && (
                  <input className="border rounded px-3 py-2" placeholder="New password (optional)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                )}
                <input className="border rounded px-3 py-2" placeholder="Branch (optional)" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
                <input className="border rounded px-3 py-2" placeholder="ServiceType IDs (comma-separated)" value={form.serviceTypeIDs} onChange={(e) => setForm({ ...form, serviceTypeIDs: e.target.value })} />
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-white pt-3 mt-2 flex flex-wrap items-center justify-between gap-2 border-t">
                <div className="flex gap-2">
                  <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Save Changes</button>
                  <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
                {editing && (
                  <button type="button" className="rounded border border-red-300 px-3 py-2 text-sm text-red-700" onClick={() => { if (editing) deleteItem(editing._id); }}>Delete Customer</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
