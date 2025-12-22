"use client";

import { useEffect, useState } from "react";
import { formatPhoneNumber } from "@/utils/countries";
import { Loader2 } from "lucide-react";
import SharedModal from "@/components/admin/SharedModal";
import AddButton from "@/components/admin/AddButton";
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";
import PhoneInput from "@/components/PhoneInput";
import CountrySelector from "@/components/CountrySelector";

type Customer = {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  accountStatus?: string;
  emailVerified?: boolean;
  createdAt?: string;
};

export default function CustomersPageClient() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; customer: Customer | null }>({ open: false, customer: null });
  const [form, setForm] = useState({ 
    firstName: "", 
    lastName: "", 
    email: "", 
    password: "", 
    phone: "", 
    phoneCountry: "US", // Default country for phone
    address: "",
    country: "US", // Default country for address
    accountStatus: "active" as "active" | "inactive"
  });

  async function load() {
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
      password: "", 
      phone: "", 
      phoneCountry: "US",
      address: "",
      country: "US",
      accountStatus: "active" as "active" | "inactive"
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
      phoneCountry: "US", // Default, could be extracted from phone number
      address: customer.address || "",
      country: "US", // Default country since address is a string
      accountStatus: (customer.accountStatus || "active") as "active" | "inactive"
    });
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body: { 
      firstName: string; 
      lastName: string; 
      email: string; 
      password: string; 
      phone: string; 
      phoneCountry: string;
      address: string;
      country: string;
      accountStatus: "active" | "inactive";
      id?: string 
    } = { 
      ...form,
      // Format phone with country code
      phone: formatPhoneNumber(form.phoneCountry, form.phone)
    };
    if (editing) body.id = editing._id;
    if (!editing && !form.password) {
      alert("Password is required for new customers");
      return;
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

  function openDelete(customer: Customer) {
    setDeleteConfirm({ open: true, customer });
  }

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

  const filtered = items.filter((c) =>
    (c.firstName + " " + c.lastName + " " + c.email + " " + c.userCode).toLowerCase().includes(query.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                Customer Management
              </h1>
              <p className="mt-1 text-sm text-blue-100">
                Manage customer accounts and information
              </p>
            </div>
            <AddButton onClick={openAdd} label="Add Customer" />
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <input
            type="text"
            placeholder="Search customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Customer List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((customer) => (
                  <tr key={customer._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{customer.userCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.email}</div>
                      <div className="text-sm text-gray-500">{customer.phone || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.accountStatus === "active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {customer.accountStatus || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openEdit(customer)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(customer)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <SharedModal
            open={showForm}
            title={editing ? "Edit Customer" : "Add Customer"}
            onClose={() => setShowForm(false)}
            footer={
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => submitForm(new Event('submit') as unknown as React.FormEvent)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editing ? "Update" : "Add"} Customer
                </button>
              </div>
            }
          >
            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password {!editing && "(required)"}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={editing ? "Leave blank to keep current" : "Required"}
                  required={!editing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <PhoneInput
                  value={form.phone}
                  countryCode={form.phoneCountry}
                  onPhoneChange={(phone) => setForm({ ...form, phone })}
                  onCountryChange={(country) => setForm({ ...form, phoneCountry: country })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <CountrySelector
                  value={form.country}
                  onChange={(country) => setForm({ ...form, country })}
                  placeholder="Select country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                <select
                  value={form.accountStatus}
                  onChange={(e) => setForm({ ...form, accountStatus: e.target.value as "active" | "inactive" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
          message={`Are you sure you want to delete "${deleteConfirm.customer?.firstName} ${deleteConfirm.customer?.lastName}"? This action cannot be undone.`}
        />
      </div>
    </div>
  );
}
