"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Eye, User, Mail, Phone, MapPin, Calendar, Shield, X, Loader2 } from "lucide-react";
import Loading from "@/components/Loading";
import SharedModal from "@/components/admin/SharedModal";
import AddButton from "@/components/admin/AddButton";
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";

type Customer = {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  accountStatus?: string;
  emailVerified?: boolean;
  createdAt?: string;
};

export default function CustomersPageClient() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const isLoadingRef = useRef(false); // Prevent multiple simultaneous loads

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; customer: Customer | null }>({ open: false, customer: null });
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ 
    firstName: "", 
    lastName: "", 
    email: "", 
    password: "", 
    phone: "", 
    accountStatus: "active", // Default to active for admin-created customers
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: ""
    }
  });

  const load = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setItems(data.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []); // Empty dependency array since it doesn't depend on any props/state

  useEffect(() => {
    load();
    
    // Cleanup function to prevent memory leaks
    return () => {
      isLoadingRef.current = false;
    };
  }, [load]); // Include load as dependency

  function openAdd() {
    setEditing(null);
    setForm({ 
      firstName: "", 
      lastName: "", 
      email: "", 
      password: "", 
      phone: "", 
      accountStatus: "active", // Admin-created customers are Active by default
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: ""
      }
    });
    setShowForm(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({ 
      firstName: customer.firstName, 
      lastName: customer.lastName, 
      email: customer.email, 
      password: "", 
      phone: customer.phone || "",
      accountStatus: customer.accountStatus || "active",
      address: {
        street: customer.address?.street || "",
        city: customer.address?.city || "",
        state: customer.address?.state || "",
        zipCode: customer.address?.zipCode || "",
        country: customer.address?.country || ""
      }
    });
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body: { firstName: string; lastName: string; email: string; password: string; phone: string; accountStatus?: string; address: typeof form.address; id?: string } = { ...form };
    if (editing) body.id = editing._id;
    if (!editing && !form.password) {
      alert("Password is required for new customers");
      return;
    }
    // Include accountStatus in the body
    if (form.accountStatus) {
      body.accountStatus = form.accountStatus;
    }
    
    try {
      const res = await fetch("/api/admin/customers", {
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
      
      alert(editing ? "Customer updated successfully!" : "Customer created successfully!");
      setShowForm(false);
      await load();
    } catch (error) {
      console.error("Submit error:", error);
      alert("Network error occurred. Please try again.");
    }
  }

  function openDelete(customer: Customer) {
    setDeleteConfirm({ open: true, customer });
  }

  function openView(customer: Customer) {
    setViewCustomer(customer);
  }

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  async function deleteItem() {
    if (!deleteConfirm.customer) return;
    const id = deleteConfirm.customer._id;
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
    setDeleteConfirm({ open: false, customer: null });
    await load();
  }

  const filtered = items.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const addressStr = c.address ? `${c.address.street || ""} ${c.address.city || ""} ${c.address.state || ""} ${c.address.zipCode || ""} ${c.address.country || ""}`.toLowerCase().trim() : "";
    return (
      c.userCode.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (addressStr && addressStr.includes(q))
    );
  });

  const activeCustomers = items.filter(c => c.accountStatus === "active").length;
  const newCustomersThisMonth = items.filter(c => {
    if (!c.createdAt) return false;
    const createdDate = new Date(c.createdAt);
    const now = new Date();
    return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return <Loading message="Loading customers..." />;
  }

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
        Customer Management
      </h1>
      <p className="mt-1 text-sm text-blue-100">
        Manage customer accounts and information
      </p>
    </div>

    {/* Add Button */}
    <AddButton onClick={openAdd} label="Add Customer" className="bg-white/15 text-white hover:bg-white/25" />
  </div>

  {/* Stats Cards inside Header */}
  <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {/* Total Customers */}
    <div className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
      <div className="relative flex items-center gap-4">
        <div className="rounded-lg bg-white/20 p-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-blue-100">Total Customers</p>
          <p className="mt-1 text-3xl font-bold">{items.length}</p>
        </div>
      </div>
    </div>

    {/* Active Customers */}
    <div className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
      <div className="relative flex items-center gap-4">
        <div className="rounded-lg bg-white/20 p-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-blue-100">Active Customers</p>
          <p className="mt-1 text-3xl font-bold">{activeCustomers}</p>
        </div>
      </div>
    </div>

    {/* New This Month */}
    <div className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
      <div className="relative flex items-center gap-4">
        <div className="rounded-lg bg-white/20 p-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-blue-100">New This Month</p>
          <p className="mt-1 text-3xl font-bold">{newCustomersThisMonth}</p>
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
              placeholder="Search by name, email, user code, phone, or address..."
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

        {/* Customer Cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {loading ? (
            <div className="lg:col-span-2">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-12 text-center shadow-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-900">No customers found</p>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or add a new customer</p>
            </div>
          ) : (
            filtered.map((customer) => {
              const name = `${customer.firstName} ${customer.lastName}`.trim();
              const joinedDate = customer.createdAt
                ? new Date(customer.createdAt).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })
                : undefined;

              return (
                <div
                  key={customer._id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-xl hover:border-[#0f4d8a]/30"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#0f4d8a] to-[#E67919]" />

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0f4d8a] to-[#E67919] text-lg font-semibold text-white shadow-md">
                          {name ? name.charAt(0).toUpperCase() : customer.userCode.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{name || customer.userCode}</h3>
                          <p className="text-xs text-gray-500">ID: {customer.userCode}</p>
                        </div>
                      </div>

                      <div className={`rounded-full px-3 py-1 ${
                        customer.accountStatus === "active" 
                          ? "bg-green-100" 
                          : "bg-yellow-100"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex h-2 w-2 animate-pulse rounded-full ${
                            customer.accountStatus === "active" ? "bg-green-500" : "bg-yellow-500"
                          }`}></span>
                          <span className={`text-xs font-medium ${
                            customer.accountStatus === "active" ? "text-green-700" : "text-yellow-700"
                          }`}>
                            {customer.accountStatus || "active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate" title={customer.email}>
                          {truncateText(customer.email, 30)}
                        </span>
                      </div>

                      {customer.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span title={customer.phone}>{truncateText(customer.phone, 30)}</span>
                        </div>
                      )}

                      {customer.address && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate" title={[
                            customer.address.street,
                            customer.address.city,
                            customer.address.state,
                            customer.address.zipCode,
                            customer.address.country
                          ].filter(Boolean).join(", ")}>
                            {truncateText([
                              customer.address.street,
                              customer.address.city,
                              customer.address.state,
                              customer.address.zipCode,
                              customer.address.country
                            ].filter(Boolean).join(", "), 30)}
                          </span>
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Customer
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => openView(customer)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>

                      <button
                        onClick={() => openEdit(customer)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#0f4d8a] bg-white px-3 py-1.5 text-xs font-medium text-[#0f4d8a] transition-all hover:bg-[#0f4d8a] hover:text-white"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>

                      <button
                        onClick={() => openDelete(customer)}
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

        {/* Add/Edit Customer Modal */}
      {showForm && (
        <SharedModal
          open={showForm}
          title={editing ? "Edit Customer" : "Add New Customer"}
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
                form="customer-form"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#0f4d8a]/90 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editing ? "Update Customer" : "Create Customer"}
              </button>
            </>
          }
        >

            <form id="customer-form" onSubmit={submitForm} className="space-y-4">
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
                    placeholder="john.doe@example.com"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
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
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Password *</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        placeholder="Enter secure password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Customer Status *</label>
                      <select
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        value={form.accountStatus}
                        onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Admin-created customers default to Active. Self-registered customers default to Inactive.</p>
                    </div>
                  </>
                )}

                {editing && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">New Password (Optional)</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        placeholder="Leave blank to keep current password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Customer Status</label>
                      <select
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        value={form.accountStatus}
                        onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Update customer account status</p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-purple-100 p-1.5">
                    <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Phone Number</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    placeholder="+1 (555) 123-4567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Street Address</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    placeholder="123 Main St"
                    value={form.address.street}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="New York"
                      value={form.address.city}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">State</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="NY"
                      value={form.address.state}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">ZIP Code</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="10001"
                      value={form.address.zipCode}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Country</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="United States"
                      value={form.address.country}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            </form>
        </SharedModal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, customer: null })}
        onConfirm={deleteItem}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone and will permanently remove all associated data."
        itemName={deleteConfirm.customer ? `${deleteConfirm.customer.firstName} ${deleteConfirm.customer.lastName} (${deleteConfirm.customer.userCode})` : undefined}
      />

      {/* Customer View Modal */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setViewCustomer(null)}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0f4d8a] to-[#E67919] text-xl font-bold text-white shadow-lg">
                    {`${viewCustomer.firstName} ${viewCustomer.lastName}`.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {viewCustomer.firstName} {viewCustomer.lastName}
                    </h2>
                    <p className="text-sm text-gray-500">Customer ID: {viewCustomer.userCode}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewCustomer(null)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-[#0f4d8a]" />
                      <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</p>
                        <p className="text-sm text-gray-900">{viewCustomer.firstName} {viewCustomer.lastName}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</p>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-gray-900 break-all">{viewCustomer.email}</p>
                        </div>
                      </div>
                      
                      {viewCustomer.phone && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</p>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">{viewCustomer.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-[#E67919]" />
                      <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Status</p>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                          viewCustomer.accountStatus === "active" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${
                            viewCustomer.accountStatus === "active" ? "bg-green-500" : "bg-yellow-500"
                          }`} />
                          {viewCustomer.accountStatus || "active"}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Verification</p>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                          viewCustomer.emailVerified 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${
                            viewCustomer.emailVerified ? "bg-green-500" : "bg-red-500"
                          }`} />
                          {viewCustomer.emailVerified ? "Verified" : "Not Verified"}
                        </div>
                      </div>
                      
                      {viewCustomer.createdAt && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Member Since</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {new Date(viewCustomer.createdAt).toLocaleDateString("default", { 
                                month: "long", 
                                day: "numeric", 
                                year: "numeric" 
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                {viewCustomer.address && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
                    </div>
                    
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="grid gap-2 text-sm">
                        {viewCustomer.address.street && (
                          <p className="text-gray-900">{viewCustomer.address.street}</p>
                        )}
                        {(viewCustomer.address.city || viewCustomer.address.state || viewCustomer.address.zipCode) && (
                          <p className="text-gray-900">
                            {[
                              viewCustomer.address.city,
                              viewCustomer.address.state,
                              viewCustomer.address.zipCode
                            ].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {viewCustomer.address.country && (
                          <p className="text-gray-900">{viewCustomer.address.country}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Removed Edit button when viewing customer */}
              <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
                <button
                  onClick={() => setViewCustomer(null)}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
