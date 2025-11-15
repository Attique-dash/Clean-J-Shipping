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
  status?: string;
  emailVerified?: boolean;
  accountType?: string;
  serviceTypeIDs?: string[];
  createdAt?: string;
};

type ApiCustomer = {
  customer_id: string;
  full_name?: string;
  email: string;
  userCode?: string;
  address?: { street?: string; city?: string; state?: string; zip_code?: string; country?: string };
  phone?: string;
  branch?: string;
  serviceTypeIDs?: string[];
  email_verified?: boolean;
  account_status?: string;
  account_type?: string;
  member_since?: string;
};

export default function CustomersPageClient() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "active" | "inactive">("all");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showMessage, setShowMessage] = useState<{ userCode: string; name: string } | null>(null);
  const [messageForm, setMessageForm] = useState({ subject: "", body: "" });
  const [form, setForm] = useState({
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
              phone: it.phone || "",
              branch: it.branch || it.address?.city || "",
              street: it.address?.street || "",
              city: it.address?.city || "",
              state: it.address?.state || "",
              zip: it.address?.zip_code || "",
              country: it.address?.country || "",
              status: it.account_status || "active",
              emailVerified: Boolean(it.email_verified),
              accountType: it.account_type || "Basic",
              serviceTypeIDs: it.serviceTypeIDs || [],
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
      serviceTypeIDs: (c.serviceTypeIDs || []).join(","),
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

  const filteredByStatus = filtered
    .filter((c) => {
      if (statusFilter === "verified") return Boolean(c.emailVerified);
      if (statusFilter === "pending") return !c.emailVerified;
      return true;
    })
    .filter((c) => {
      if (typeFilter === "active") return (c.status || "active").toLowerCase() === "active";
      if (typeFilter === "inactive") return (c.status || "active").toLowerCase() === "inactive";
      return true;
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
      address: {
        street: form.street || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zip: form.zip || undefined,
        country: form.country || undefined,
      },
      status: form.status,
      emailVerified: form.emailVerified === "Yes",
      accountType: form.accountType,
      serviceTypeIDs: form.serviceTypeIDs
        ? form.serviceTypeIDs
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
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
    const res = await fetch("/api/admin/customers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }
    await load();
  }

  const stats = {
    total: items.length,
    verified: items.filter((c) => c.emailVerified).length,
    active: items.filter((c) => (c.status || "active").toLowerCase() === "active").length,
    premium: items.filter((c) => (c.accountType || "").toLowerCase() === "premium").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
              Customer Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">Manage and monitor all your customers</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#0f4d8a]/90 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Customer
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f4d8a] to-[#0f4d8a]/80 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
            <div className="relative flex items-center gap-4">
              <div className="rounded-lg bg-white/20 p-3">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-100">Total Customers</p>
                <p className="mt-1 text-3xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
            <div className="relative flex items-center gap-4">
              <div className="rounded-lg bg-white/20 p-3">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-100">Verified</p>
                <p className="mt-1 text-3xl font-bold">{stats.verified}</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#E67919] to-[#E67919]/80 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
            <div className="relative flex items-center gap-4">
              <div className="rounded-lg bg-white/20 p-3">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-100">Active</p>
                <p className="mt-1 text-3xl font-bold">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
            <div className="relative flex items-center gap-4">
              <div className="rounded-lg bg-white/20 p-3">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-purple-100">Premium</p>
                <p className="mt-1 text-3xl font-bold">{stats.premium}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                placeholder="Search by name, email, or user code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "verified" | "pending")}
                >
                  <option value="all">All</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Type:</label>
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value.toLowerCase() as "all" | "active" | "inactive")}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
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

        {/* Customer Cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {loading ? (
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-12 text-center shadow-lg">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#0f4d8a]"></div>
              <p className="mt-4 text-sm text-gray-600">Loading customers...</p>
            </div>
          ) : filteredByStatus.length === 0 ? (
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-12 text-center shadow-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-900">No customers found</p>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredByStatus.map((c) => {
              const name = `${c.firstName} ${c.lastName}`.trim();
              const verified = Boolean(c.emailVerified);
              const isActive = (c.status || "active").toLowerCase() === "active";
              const memberSince = c.createdAt
                ? new Date(c.createdAt).toLocaleString("default", { month: "short", year: "numeric" })
                : undefined;

              return (
                <div
                  key={c._id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-xl hover:border-[#0f4d8a]/30"
                >
                  <div
                    className={`absolute left-0 top-0 h-full w-1 ${
                      verified ? "bg-gradient-to-b from-green-400 to-green-600" : "bg-gradient-to-b from-yellow-400 to-yellow-600"
                    }`}
                  />

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0f4d8a] to-[#E67919] text-white font-semibold">
                          {name ? name.charAt(0).toUpperCase() : c.userCode.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{name || c.userCode}</h3>
                          <p className="text-xs text-gray-500">ID: {c.userCode}</p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          verified
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        }`}
                      >
                        {verified ? (
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {verified ? "Verified" : "Pending"}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{c.email}</span>
                      </div>

                      {c.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {c.phone}
                        </div>
                      )}

                      {c.branch && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {c.branch}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                          <span className="text-xs text-gray-600">
                            {(c.status || "active").charAt(0).toUpperCase() + (c.status || "active").slice(1)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            {c.accountType || "Basic"}
                          </span>
                          {memberSince && <span className="text-xs text-gray-500">{memberSince}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#0f4d8a] bg-white px-3 py-1.5 text-xs font-medium text-[#0f4d8a] transition-all hover:bg-[#0f4d8a] hover:text-white"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setShowMessage({ userCode: c.userCode, name: `${c.firstName} ${c.lastName}`.trim() || c.userCode });
                          setMessageForm({ subject: "", body: "" });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E67919] bg-white px-3 py-1.5 text-xs font-medium text-[#E67919] transition-all hover:bg-[#E67919] hover:text-white"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Message
                      </button>

                      <button
                        onClick={() => deleteItem(c._id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-600 hover:text-white"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Deactivate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-[#0f4d8a]/5 to-[#E67919]/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] p-2">
                  {editing ? (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editing ? "Edit Customer" : "Add New Customer"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {editing ? `Updating ${editing.userCode}` : "Create a new customer account"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitForm} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#0f4d8a]/10 p-1.5">
                    <svg className="h-4 w-4 text-[#0f4d8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Personal Details</h3>
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
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Email *</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="john.doe@example.com"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Phone</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="+1 (555) 000-0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#E67919]/10 p-1.5">
                    <svg className="h-4 w-4 text-[#E67919]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Address Information</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Street</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="123 Main Street"
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="New York"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">State</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="NY"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">ZIP Code</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="10001"
                      value={form.zip}
                      onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Country</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    >
                      <option value="">Select Country</option>
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-purple-100 p-1.5">
                    <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Account Settings</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Account Status</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Email Verified</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      value={form.emailVerified}
                      onChange={(e) => setForm({ ...form, emailVerified: e.target.value as "Yes" | "No" })}
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Account Type</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      value={form.accountType}
                      onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                    >
                      <option>Basic</option>
                      <option>Premium</option>
                      <option>Enterprise</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-green-100 p-1.5">
                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Additional Settings</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {!editing && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Password *</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        placeholder="Enter password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                      />
                    </div>
                  )}
                  {editing && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">New Password (Optional)</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        placeholder="Leave blank to keep current"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Branch</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="Branch name"
                      value={form.branch}
                      onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Service Type IDs</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="service1, service2, service3"
                      value={form.serviceTypeIDs}
                      onChange={(e) => setForm({ ...form, serviceTypeIDs: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Comma-separated list of service type IDs</p>
                  </div>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    const formEl = document.querySelector('form');
                    if (formEl) {
                      formEl.requestSubmit();
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#0f4d8a]/90 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editing ? "Update Customer" : "Create Customer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    if (editing) deleteItem(editing._id);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-600 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Customer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-[#E67919]/5 to-[#0f4d8a]/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-r from-[#E67919] to-[#E67919]/80 p-2">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Send Message</h2>
                  <p className="text-xs text-gray-500">To: {showMessage.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMessage(null)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch("/api/admin/messages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user_code: showMessage.userCode,
                    subject: messageForm.subject,
                    body: messageForm.body,
                  }),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) {
                  alert(j?.error || "Failed to send");
                  return;
                }
                alert("Message sent successfully!");
                setShowMessage(null);
              }}
              className="px-6 py-6 space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Subject (Optional)</label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                  placeholder="Message subject"
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Message *</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20 resize-none"
                  placeholder="Write your message here..."
                  rows={6}
                  value={messageForm.body}
                  onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMessage(null)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#E67919] to-[#E67919]/90 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}