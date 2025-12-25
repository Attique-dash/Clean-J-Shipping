"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";

interface Customer {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AdminAddPackagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;
  
  const [form, setForm] = useState({
    trackingNumber: "",
    userCode: "",
    customerName: "",
    weight: "",
    shipper: "",
    description: "",
    entryDate: new Date().toISOString().slice(0, 10),
    dimensions: {
      length: "",
      width: "",
      height: "",
      unit: "cm"
    },
    recipient: {
      name: "",
      email: "",
      shippingId: "",
      phone: "",
      address: ""
    },
    sender: {
      name: "",
      email: "",
      phone: "",
      address: ""
    },
    contents: "",
    value: "",
    specialInstructions: "",
    status: "received",
    branch: ""
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  // Generate unique tracking number
  const generateTrackingNumber = () => {
    const prefix = 'TAS';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  // Generate unique shipping ID
  const generateShippingId = () => {
    const prefix = 'SHIP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  // Search customers
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomers([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.customers)
          ? data.customers
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        setCustomers(list);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  // Handle customer selection
  const selectCustomer = (customer: Customer) => {
    setForm(prev => ({
      ...prev,
      userCode: customer.userCode,
      customerName: `${customer.firstName} ${customer.lastName}`,
      recipient: {
        ...prev.recipient,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email
      }
    }));
    setCustomerSearch(`${customer.firstName} ${customer.lastName} (${customer.userCode})`);
    setShowCustomerDropdown(false);
    setCustomers([]);
  };

  // Handle customer search input
  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    searchCustomers(value);
    setShowCustomerDropdown(true);
  };

  // Auto-generate tracking number and shipping ID for new packages
  useEffect(() => {
    if (!isEditing && !form.trackingNumber) {
      setForm(prev => ({ ...prev, trackingNumber: generateTrackingNumber() }));
    }
    if (!isEditing && !form.recipient.shippingId) {
      setForm(prev => ({ 
        ...prev, 
        recipient: { ...prev.recipient, shippingId: generateShippingId() }
      }));
    }
  }, [isEditing, form.trackingNumber, form.recipient.shippingId]);

  // Load package data for editing
  useEffect(() => {
    if (isEditing && editId) {
      const loadPackage = async () => {
        setFetchLoading(true);
        try {
          const res = await fetch(`/api/admin/packages/${editId}`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            setForm({
              trackingNumber: data.trackingNumber || "",
              userCode: data.userCode || "",
              customerName: data.recipient?.name || "",
              weight: data.weight?.toString() || "",
              shipper: data.shipper || "",
              description: data.description || "",
              entryDate: data.entryDate ? new Date(data.entryDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              dimensions: {
                length: data.dimensions?.length?.toString() || data.length?.toString() || "",
                width: data.dimensions?.width?.toString() || data.width?.toString() || "",
                height: data.dimensions?.height?.toString() || data.height?.toString() || "",
                unit: data.dimensions?.unit || data.dimensionUnit || "cm"
              },
              recipient: {
                name: data.recipient?.name || data.receiverName || "",
                email: data.recipient?.email || data.receiverEmail || "",
                shippingId: data.recipient?.shippingId || "",
                phone: data.recipient?.phone || data.receiverPhone || "",
                address: data.recipient?.address || data.receiverAddress || ""
              },
              sender: {
                name: data.sender?.name || data.senderName || "",
                email: data.sender?.email || data.senderEmail || "",
                phone: data.sender?.phone || data.senderPhone || "",
                address: data.sender?.address || data.senderAddress || ""
              },
              contents: data.contents || data.itemDescription || "",
              value: data.value?.toString() || data.itemValue?.toString() || "",
              specialInstructions: data.specialInstructions || "",
              status: data.status || "received",
              branch: data.branch || ""
            });
            
            // Set customer search field if customer name exists
            if (data.recipient?.name || data.receiverName) {
              setCustomerSearch(data.recipient?.name || data.receiverName || "");
            }
          } else {
            toast.error('Failed to load package data');
            router.push('/admin/packages');
          }
        } catch {
          toast.error('Error loading package data');
          router.push('/admin/packages');
        } finally {
          setFetchLoading(false);
        }
      };
      loadPackage();
    }
  }, [isEditing, editId, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    
    const payload = {
      trackingNumber: form.trackingNumber,
      userCode: form.userCode,
      weight: form.weight ? Number(form.weight) : undefined,
      shipper: form.shipper,
      description: form.description,
      entryDate: form.entryDate,
      status: form.status,
      dimensions: {
        length: form.dimensions.length ? Number(form.dimensions.length) : undefined,
        width: form.dimensions.width ? Number(form.dimensions.width) : undefined,
        height: form.dimensions.height ? Number(form.dimensions.height) : undefined,
        unit: form.dimensions.unit
      },
      recipient: {
        name: form.recipient.name,
        email: form.recipient.email,
        shippingId: form.recipient.shippingId,
        phone: form.recipient.phone,
        address: form.recipient.address
      },
      sender: {
        name: form.sender.name,
        email: form.sender.email,
        phone: form.sender.phone,
        address: form.sender.address
      },
      contents: form.contents,
      value: form.value ? Number(form.value) : undefined,
      specialInstructions: form.specialInstructions,
      branch: form.branch
    };
    
    const endpoint = isEditing ? `/api/admin/packages/${editId}` : "/api/admin/packages";
    const method = isEditing ? "PUT" : "POST";
    
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setMsg(typeof data?.error === "string" ? data.error : `Failed to ${isEditing ? 'update' : 'add'} package`);
        toast.error(data?.error || `Failed to ${isEditing ? 'update' : 'add'} package`);
      } else {
        setMsg(`Package ${isEditing ? 'updated' : 'saved'} successfully`);
        toast.success(`Package ${isEditing ? 'updated' : 'saved'} successfully`);
        if (!isEditing) {
          setForm({
            trackingNumber: "", userCode: "", customerName: "", weight: "", shipper: "", description: "", entryDate: new Date().toISOString().slice(0, 10),
            dimensions: { length: "", width: "", height: "", unit: "cm" },
            recipient: { name: "", email: "", shippingId: "", phone: "", address: "" },
            sender: { name: "", email: "", phone: "", address: "" },
            contents: "", value: "", specialInstructions: "", status: "received", branch: ""
          });
          setCustomerSearch("");
        }
        setTimeout(() => router.push('/admin/packages'), 1500);
      }
    } catch (error) {
      console.error('Error:', error);
      setMsg(`Failed to ${isEditing ? 'update' : 'add'} package`);
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} package`);
    } finally {
      setLoading(false);
    }
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/packages"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Packages
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0f4d8a] to-[#0e7893] text-white">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Edit Package' : 'Add New Package'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {isEditing ? 'Update package information' : 'Create a new package in the system'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-[#0f4d8a] to-[#0e7893] px-6 py-4">
            <h3 className="text-lg font-bold text-white">Package Information</h3>
          </div>
          
          <form onSubmit={onSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Basic Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tracking Number *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="block flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter tracking number"
                      value={form.trackingNumber}
                      onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, trackingNumber: generateTrackingNumber() })}
                      className="inline-flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Search customer by name or code..."
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                    <input
                      type="hidden"
                      value={form.userCode}
                      onChange={(e) => setForm({ ...form, userCode: e.target.value })}
                    />
                    
                    {showCustomerDropdown && customers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {customers.map((customer) => (
                          <div
                            key={customer._id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div className="font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              Code: {customer.userCode} | {customer.email}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0.0"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipper</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Shipper name"
                    value={form.shipper}
                    onChange={(e) => setForm({ ...form, shipper: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Branch location"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={3}
                  placeholder="Package description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="received">Received</option>
                  <option value="in_processing">In Processing</option>
                  <option value="ready_to_ship">Ready to Ship</option>
                  <option value="shipped">Shipped</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Dimensions</h4>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
                  <input
                    type="number"
                    step="0.1"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0.0"
                    value={form.dimensions.length}
                    onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, length: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                  <input
                    type="number"
                    step="0.1"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0.0"
                    value={form.dimensions.width}
                    onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, width: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                  <input
                    type="number"
                    step="0.1"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0.0"
                    value={form.dimensions.height}
                    onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, height: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={form.dimensions.unit}
                    onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, unit: e.target.value } })}
                  >
                    <option value="cm">cm</option>
                    <option value="in">inches</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Recipient Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Recipient Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Recipient name"
                    value={form.recipient.name}
                    onChange={(e) => setForm({ ...form, recipient: { ...form.recipient, name: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipping ID *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="block flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Shipping ID"
                      value={form.recipient.shippingId}
                      onChange={(e) => setForm({ ...form, recipient: { ...form.recipient, shippingId: e.target.value } })}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, recipient: { ...form.recipient, shippingId: generateShippingId() } })}
                      className="inline-flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="email@example.com"
                    value={form.recipient.email}
                    onChange={(e) => setForm({ ...form, recipient: { ...form.recipient, email: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Phone number"
                    value={form.recipient.phone}
                    onChange={(e) => setForm({ ...form, recipient: { ...form.recipient, phone: e.target.value } })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={2}
                  placeholder="Recipient address"
                  value={form.recipient.address}
                  onChange={(e) => setForm({ ...form, recipient: { ...form.recipient, address: e.target.value } })}
                />
              </div>
            </div>

            {/* Sender Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Sender Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Sender name"
                    value={form.sender.name}
                    onChange={(e) => setForm({ ...form, sender: { ...form.sender, name: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="email@example.com"
                    value={form.sender.email}
                    onChange={(e) => setForm({ ...form, sender: { ...form.sender, email: e.target.value } })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Phone number"
                    value={form.sender.phone}
                    onChange={(e) => setForm({ ...form, sender: { ...form.sender, phone: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Sender address"
                    value={form.sender.address}
                    onChange={(e) => setForm({ ...form, sender: { ...form.sender, address: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Additional Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contents</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Package contents"
                    value={form.contents}
                    onChange={(e) => setForm({ ...form, contents: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                  <input
                    type="number"
                    step="0.01"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0.00"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={3}
                  placeholder="Any special handling instructions"
                  value={form.specialInstructions}
                  onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <Link
                href="/admin/packages"
                className="inline-flex items-center px-6 py-2.5 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0f4d8a] to-[#0e7893] text-white font-medium rounded-lg hover:from-[#0e447d] hover:to-[#0d6b84] disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditing ? 'Update Package' : 'Save Package'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
