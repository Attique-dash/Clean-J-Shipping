"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import SharedModal from "@/components/admin/SharedModal";
import AddButton from "@/components/admin/AddButton";
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";
import Loading from "@/components/Loading";

type Staff = {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  branch?: string;
  createdAt?: string;
};

export default function StaffPageClient() {
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; staff: Staff | null }>({ open: false, staff: null });
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", branch: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setItems(data.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ firstName: "", lastName: "", email: "", password: "", branch: "", phone: "" });
    setShowForm(true);
  }

  function openEdit(s: Staff) {
    setEditing(s);
    setForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, password: "", branch: s.branch || "", phone: s.phone || "" });
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body: { firstName: string; lastName: string; email: string; password: string; branch: string; phone: string; id?: string } = { ...form };
    if (editing) body.id = editing._id;
    if (!editing && !form.password) {
      alert("Password is required for new staff");
      return;
    }
    
    try {
      const res = await fetch("/api/admin/staff", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      // Check if response has content before parsing JSON
      const contentType = res.headers.get("content-type");
      let data = null;
      
      if (contentType && contentType.includes("application/json")) {
        const text = await res.text();
        if (text.trim()) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error("JSON parse error:", parseError, "Response text:", text);
            alert("Invalid response from server");
            return;
          }
        }
      }
      
      if (!res.ok) {
        alert(data?.error || "Request failed");
        return;
      }
      
      // Show success message with email notification
      if (!editing && data.message) {
        alert(data.message);
      } else {
        alert(editing ? "Staff member updated successfully!" : "Staff member created successfully!");
      }
      
      setShowForm(false);
      await load();
    } catch (error) {
      console.error("Submit error:", error);
      alert("Network error occurred. Please try again.");
    }
  }

  function openDelete(s: Staff) {
    setDeleteConfirm({ open: true, staff: s });
  }

  async function deleteItem() {
    if (!deleteConfirm.staff) return;
    const id = deleteConfirm.staff._id;
    const res = await fetch("/api/admin/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }
    setDeleteConfirm({ open: false, staff: null });
    await load();
  }

  const filtered = items.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.userCode.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.branch || "").toLowerCase().includes(q)
    );
  });

  const branches = [...new Set(items.map((s) => s.branch).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
  {/* Soft overlay */}
  <div className="absolute inset-0 bg-white/10" />

  {/* Main Layout */}
  <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
    {/* Left Side */}
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
        Staff Management
      </h1>
      <p className="mt-1 text-sm text-blue-100">
        Manage your warehouse team members
      </p>
    </div>

    {/* Add Button */}
    <AddButton onClick={openAdd} label="Add Staff Member" className="bg-white/15 text-white hover:bg-white/25" />
  </div>

  {/* Stats Cards inside Header */}
  <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {/* Total Staff */}
    <div className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
      <div className="relative flex items-center gap-4">
        <div className="rounded-lg bg-white/20 p-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-blue-100">Total Staff</p>
          <p className="mt-1 text-3xl font-bold">{items.length}</p>
        </div>
      </div>
    </div>

    {/* Branches */}
    <div className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
      <div className="relative flex items-center gap-4">
        <div className="rounded-lg bg-white/20 p-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-blue-100">Branches</p>
          <p className="mt-1 text-3xl font-bold">{branches.length}</p>
        </div>
      </div>
    </div>

    {/* Active Today */}
    <div className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
      <div className="relative flex items-center gap-4">
        <div className="rounded-lg bg-white/20 p-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-blue-100">Active Today</p>
          <p className="mt-1 text-3xl font-bold">{items.length}</p>
        </div>
      </div>
    </div>
  </div>
</header>


        {/* Search Bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
              placeholder="Search by name, email, user code, or branch..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Staff Cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {loading ? (
            <Loading message="Loading staff..." />
          ) : filtered.length === 0 ? (
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-12 text-center shadow-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-900">No staff members found</p>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or add a new staff member</p>
            </div>
          ) : (
            filtered.map((s) => {
              const name = `${s.firstName} ${s.lastName}`.trim();
              const joinedDate = s.createdAt
                ? new Date(s.createdAt).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })
                : undefined;

              return (
                <div
                  key={s._id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-xl hover:border-[#0f4d8a]/30"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#0f4d8a] to-[#E67919]" />

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0f4d8a] to-[#E67919] text-lg font-semibold text-white shadow-md">
                          {name ? name.charAt(0).toUpperCase() : s.userCode.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{name || s.userCode}</h3>
                          <p className="text-xs text-gray-500">ID: {s.userCode}</p>
                        </div>
                      </div>

                      <div className="rounded-full bg-green-100 px-3 py-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                          <span className="text-xs font-medium text-green-700">Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{s.email}</span>
                      </div>

                      {s.branch && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>{s.branch}</span>
                        </div>
                      )}

                      {joinedDate && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-gray-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs">Joined {joinedDate}</span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Staff
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#0f4d8a] bg-white px-3 py-1.5 text-xs font-medium text-[#0f4d8a] transition-all hover:bg-[#0f4d8a] hover:text-white"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>

                      <button
                        onClick={() => openDelete(s)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-600 hover:text-white"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Staff Modal */}
      {showForm && (
        <SharedModal
          open={showForm}
          title={editing ? "Edit Staff Member" : "Add New Staff Member"}
          onClose={() => setShowForm(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="staff-form"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#0f4d8a]/90 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editing ? "Update Staff Member" : "Create Staff Member"}
              </button>
            </>
          }
        >

            <form id="staff-form" onSubmit={submitForm} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#0f4d8a]/10 p-1.5">
                    <svg className="h-4 w-4 text-[#0f4d8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">First Name *</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="John"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Last Name *</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Email Address *</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    placeholder="john.doe@warehouse.com"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Phone Number</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    placeholder="+1 (555) 123-4567"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">Optional: Staff member&apos;s phone number</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#E67919]/10 p-1.5">
                    <svg className="h-4 w-4 text-[#E67919]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Security</h3>
                </div>

                {!editing && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Password *</label>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        placeholder="Enter secure password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {editing && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">New Password (Optional)</label>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        placeholder="Leave blank to keep current password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-purple-100 p-1.5">
                    <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Work Assignment</h3>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Branch</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    placeholder="e.g., Main Warehouse, Downtown Branch"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">Optional: Assign staff member to a specific branch</p>
                </div>
              </div>
            </form>
        </SharedModal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, staff: null })}
        onConfirm={deleteItem}
        title="Delete Staff Member"
        message="Are you sure you want to delete this staff member? This action cannot be undone and will permanently remove all associated data."
        itemName={deleteConfirm.staff ? `${deleteConfirm.staff.firstName} ${deleteConfirm.staff.lastName} (${deleteConfirm.staff.userCode})` : undefined}
      />
    </div>
  );
}