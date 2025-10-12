"use client";

import { useEffect, useState } from "react";

type Staff = {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  branch?: string;
  createdAt?: string;
};

export default function StaffPageClient() {
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", branch: "" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ firstName: "", lastName: "", email: "", password: "", branch: "" });
    setShowForm(true);
  }
  function openEdit(s: Staff) {
    setEditing(s);
    setForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, password: "", branch: s.branch || "" });
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body: any = { ...form };
    if (editing) body.id = editing._id;
    if (!editing && !form.password) {
      alert("Password is required for new staff");
      return;
    }
    const res = await fetch("/api/admin/staff", {
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
    if (!confirm("Delete this staff account?")) return;
    const res = await fetch("/api/admin/staff", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Warehouse Staff</h1>
        <button onClick={openAdd} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">Add Staff</button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-lg border shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-3 py-2 text-left">UserCode</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Branch</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={5}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={5}>No staff found</td></tr>
            ) : (
              items.map((s) => (
                <tr key={s._id}>
                  <td className="px-3 py-2 font-medium">{s.userCode}</td>
                  <td className="px-3 py-2">{s.firstName} {s.lastName}</td>
                  <td className="px-3 py-2">{s.email}</td>
                  <td className="px-3 py-2">{s.branch || "-"}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button className="rounded border px-2 py-1 text-xs" onClick={() => openEdit(s)}>Edit</button>
                    <button className="rounded border px-2 py-1 text-xs text-red-700" onClick={() => deleteItem(s._id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 text-black">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium">{editing ? "Edit Staff" : "Add Staff"}</div>
              <button onClick={() => setShowForm(false)} className="text-sm">✕</button>
            </div>
            <form className="space-y-3" onSubmit={submitForm}>
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded px-2 py-1" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                <input className="border rounded px-2 py-1" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
              <input className="border rounded px-2 py-1 w-full" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              {!editing && (
                <input className="border rounded px-2 py-1 w-full" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              )}
              {editing && (
                <input className="border rounded px-2 py-1 w-full" placeholder="New password (optional)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              )}
              <input className="border rounded px-2 py-1 w-full" placeholder="Branch (optional)" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">{editing ? "Save" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
