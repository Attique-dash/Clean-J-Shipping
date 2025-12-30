"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, MapPin, Plane, Ship, Home, Building, Package, Check, X } from "lucide-react";

interface ShippingAddress {
  id: string;
  label: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  isActive: boolean;
  addressType?: "air" | "sea" | "both";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    label: "",
    contactName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Jamaica",
    addressType: "both" as "air" | "sea" | "both",
    notes: "",
    isDefault: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/addresses", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to load addresses");
      }

      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = editingAddress 
        ? `/api/customer/addresses/${editingAddress.id}`
        : "/api/customer/addresses";
      
      const method = editingAddress ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save address");
      }

      await loadAddresses();
      setShowAddModal(false);
      setEditingAddress(null);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAddress(addressId: string) {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const res = await fetch(`/api/customer/addresses/${addressId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to delete address");
      }

      await loadAddresses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete address");
    }
  }

  async function onSetDefault(addressId: string) {
    try {
      const res = await fetch(`/api/customer/addresses/${addressId}/default`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to set default address");
      }

      await loadAddresses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set default address");
    }
  }

  function resetForm() {
    setFormData({
      label: "",
      contactName: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Jamaica",
      addressType: "both",
      notes: "",
      isDefault: false,
    });
  }

  function openEditModal(address: ShippingAddress) {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      contactName: address.contactName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      addressType: address.addressType || "both",
      notes: address.notes || "",
      isDefault: address.isDefault,
    });
    setShowAddModal(true);
  }

  function getAddressIcon(addressType?: string) {
    switch (addressType) {
      case "air":
        return <Plane className="h-4 w-4" />;
      case "sea":
        return <Ship className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  }

  function getAddressTypeColor(addressType?: string) {
    switch (addressType) {
      case "air":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "sea":
        return "text-cyan-600 bg-cyan-50 border-cyan-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#0f4d8a] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Animated Background Pattern */}
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header Section */}
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <MapPin className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-tight md:text-3xl">Shipping Addresses</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Manage your shipping addresses for air and sea deliveries
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                        {addresses.length} Addresses
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setEditingAddress(null);
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E67919] to-[#f58a2e] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-5 w-5" />
                  Add Address
                </button>
              </div>
            </div>
          </header>

          {error && (
            <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-md">
              <div className="flex items-center">
                <X className="h-5 w-5 text-red-500" />
                <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Address Types Overview */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Address Overview
              </h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <Plane className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Air Shipping</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {addresses.filter(a => a.addressType === "air" || a.addressType === "both").length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl bg-gradient-to-r from-slate-50 to-cyan-50 p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100">
                      <Ship className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sea Shipping</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {addresses.filter(a => a.addressType === "sea" || a.addressType === "both").length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl bg-gradient-to-r from-slate-50 to-orange-50 p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                      <MapPin className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Addresses</p>
                      <p className="text-2xl font-bold text-gray-900">{addresses.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Addresses List */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Your Addresses
              </h2>
            </div>
            <div className="p-6">
              {addresses.length > 0 ? (
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 transition-all duration-200 border border-gray-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${getAddressTypeColor(address.addressType).split(' ')[0]} ${getAddressTypeColor(address.addressType).split(' ')[1]}`}>
                          {getAddressIcon(address.addressType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{address.contactName}</p>
                            {address.isDefault && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                ★ Default
                              </span>
                            )}
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                              {address.label === "Home" && <Home className="h-3 w-3" />}
                              {address.label === "Work" && <Building className="h-3 w-3" />}
                              {address.label === "Warehouse" && <Package className="h-3 w-3" />}
                              {address.label}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{address.phone}</p>
                          <p className="text-sm text-gray-700 mt-1">
                            {address.address}, {address.city}, {address.state} {address.zipCode}
                          </p>
                          <p className="text-sm text-gray-500">{address.country}</p>
                          {address.notes && (
                            <p className="text-xs text-gray-500 italic mt-1">Notes: {address.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!address.isDefault && (
                          <button
                            onClick={() => onSetDefault(address.id)}
                            className="p-2 text-gray-400 hover:text-amber-600 transition-colors"
                            title="Set as default"
                          >
                            <span className="h-4 w-4">★</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => openEditModal(address)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit address"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => onDeleteAddress(address.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete address"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No shipping addresses</h3>
                  <p className="text-gray-500 mb-6">Add your first shipping address to get started with air and sea shipping</p>
                  <button
                    onClick={() => {
                      resetForm();
                      setEditingAddress(null);
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E67919] to-[#f58a2e] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="h-5 w-5" />
                    Add Your First Address
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => {
                setShowAddModal(false);
                setEditingAddress(null);
                resetForm();
              }}
            />
            
            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] rounded-t-2xl">
                  <h2 className="text-xl font-semibold text-white">
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </h2>
                </div>

                <form onSubmit={onSaveAddress} className="p-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                      <select
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        required
                      >
                        <option value="">Select label</option>
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Warehouse">Warehouse</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Type</label>
                      <select
                        value={formData.addressType}
                        onChange={(e) => setFormData({ ...formData, addressType: e.target.value as "air" | "sea" | "both" })}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        required
                      >
                        <option value="both">Both Air & Sea</option>
                        <option value="air">Air Only</option>
                        <option value="sea">Sea Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={formData.contactName}
                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State/Parish</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                      placeholder="Special instructions for delivery..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#E67919] focus:ring-[#E67919] cursor-pointer"
                    />
                    <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                      Set as default address
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingAddress(null);
                        resetForm();
                      }}
                      className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all hover:shadow-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#E67919] to-[#f58a2e] rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {saving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          {editingAddress ? "Update Address" : "Add Address"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}