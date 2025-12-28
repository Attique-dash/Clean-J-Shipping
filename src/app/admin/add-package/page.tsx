"use client";

import { useState, useEffect, Suspense } from "react";
import { Package, ArrowLeft, Save, Loader2, ChevronDown, AlertCircle, RefreshCw, Check } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Customer {
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
}

function AdminAddPackagePageContent() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit') || null;
  const [submitting, setSubmitting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(() => !!editId);
  
  const [form, setForm] = useState({
    weight: "",
    shipper: "",
    description: "",
    itemDescription: "",
    entryDate: new Date().toISOString().slice(0, 10),
    status: "received",
    dimensions: {
      length: "",
      width: "",
      height: "",
      unit: "cm"
    },
    senderName: "",
    senderEmail: "",
    senderPhone: "",
    senderAddress: "",
    senderCountry: ""
  });

  // Generate tracking number
  function generateTrackingNumber() {
    const prefix = "CJS";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const checksum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const newTn = `${prefix}-${timestamp}-${random}-${checksum}`;
    
    setTrackingNumber(newTn);
    setTrackingError(null);
    setTrackingSuccess(true);
    setTimeout(() => setTrackingSuccess(false), 2000);
  }

  // Load customers
  async function loadCustomers() {
    try {
      const res = await fetch("/api/customers", { 
        cache: "no-store",
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  }

  // Handle customer selection
  const selectCustomer = async (userCode: string) => {
    const customer = customers.find(c => c.userCode === userCode);
    if (!customer) return;

    try {
      const res = await fetch(`/api/customers/${customer.userCode}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const fullCustomerData = await res.json();
        setSelectedCustomer(fullCustomerData);
      } else {
        setSelectedCustomer(customer);
      }
    } catch {
      setSelectedCustomer(customer);
    }
  };

  // Initialize - load customers and check for edit mode
  useEffect(() => {
    const editId = searchParams?.get('edit');
    
    if (editId) {
      const loadEditData = async () => {
        try {
          const res = await fetch(`/api/admin/packages/${editId}`, {
            cache: "no-store",
            credentials: 'include',
          });
          
          if (!res.ok) {
            console.error('Failed to load package for editing');
            return;
          }
          
          const packageData = await res.json();
          
          setTrackingNumber(packageData.trackingNumber || "");
          
          setForm({
            weight: packageData.weight?.toString() || "",
            shipper: packageData.shipper || "",
            description: packageData.description || "",
            itemDescription: packageData.itemDescription || "",
            entryDate: packageData.entryDate?.split('T')[0] || packageData.dateReceived?.split('T')[0] || new Date().toISOString().slice(0, 10),
            status: packageData.status || "received",
            dimensions: {
              length: packageData.length?.toString() || "",
              width: packageData.width?.toString() || "",
              height: packageData.height?.toString() || "",
              unit: packageData.dimensionUnit || "cm"
            },
            senderName: packageData.senderName || "",
            senderEmail: packageData.senderEmail || "",
            senderPhone: packageData.senderPhone || "",
            senderAddress: packageData.senderAddress || "",
            senderCountry: packageData.senderCountry || ""
          });
          
          if (packageData.userCode) {
            try {
              const customerRes = await fetch(`/api/admin/customers?userCode=${packageData.userCode}`, {
                cache: "no-store",
                credentials: 'include',
              });
              if (customerRes.ok) {
                const customerData = await customerRes.json();
                if (customerData.length > 0) {
                  setSelectedCustomer(customerData[0]);
                }
              }
            } catch (customerError) {
              console.error('Error fetching customer details:', customerError);
            }
          }
          
          setIsEditing(true);
          loadCustomers();
          
        } catch (error) {
          console.error('Error loading package for edit:', error);
        }
      };
      
      loadEditData();
    } else {
      loadCustomers();
      generateTrackingNumber();
    }
  }, [searchParams]);

  // Handle form submission
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!trackingNumber.trim()) {
      setTrackingError("Tracking number is required");
      return;
    }

    if (!selectedCustomer && !isEditing) {
      setTrackingError("Please select a customer");
      return;
    }

    setSubmitting(true);
    setTrackingError(null);

    try {
      // For edit mode, use the existing customer data if available, otherwise use selected customer
      const customerData = isEditing && selectedCustomer ? selectedCustomer : selectedCustomer;
      
      if (!isEditing && !customerData) {
        setTrackingError("Please select a customer");
        setSubmitting(false);
        return;
      }

      const payload = {
        trackingNumber: trackingNumber.trim(),
        ...(customerData && { userCode: customerData.userCode }),
        weight: form.weight ? Number(form.weight) : undefined,
        shipper: form.shipper.trim() || undefined,
        description: form.description.trim() || undefined,
        itemDescription: form.itemDescription.trim() || undefined,
        entryDate: form.entryDate,
        status: form.status,
        dimensions: {
          length: form.dimensions.length ? Number(form.dimensions.length) : undefined,
          width: form.dimensions.width ? Number(form.dimensions.width) : undefined,
          height: form.dimensions.height ? Number(form.dimensions.height) : undefined,
          unit: form.dimensions.unit || "cm"
        },
        ...(customerData && {
          recipient: {
            name: `${customerData.firstName} ${customerData.lastName}`,
            email: customerData.email || undefined,
            phone: customerData.phone || undefined,
            address: customerData.address ? 
              `${customerData.address.street || ''}${customerData.address.street ? ', ' : ''}${customerData.address.city || ''}${customerData.address.city ? ', ' : ''}${customerData.address.state || ''}${customerData.address.state ? ' ' : ''}${customerData.address.zipCode || ''}`.trim() : 
              undefined,
            country: customerData.address?.country || undefined,
            shippingId: customerData.userCode
          }
        }),
        sender: {
          name: form.senderName.trim() || undefined,
          email: form.senderEmail.trim() || undefined,
          phone: form.senderPhone.trim() || undefined,
          address: form.senderAddress.trim() || undefined,
          country: form.senderCountry.trim() || undefined
        },
        // Additional fields expected by PUT API
        contents: form.description.trim() || undefined,
        value: undefined,
        specialInstructions: undefined,
        entryStaff: undefined,
        branch: undefined
      };

      const editId = searchParams?.get('edit') || null;
      const url = editId ? `/api/admin/packages/${editId}` : "/api/admin/packages";
      const method = editId ? "PUT" : "POST";

      console.log('API Call:', { url, method, editId });
      console.log('Payload:', payload);

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      console.log('API Response Status:', res.status);
      console.log('API Response OK:', res.ok);
      
      if (res.status === 401) {
        setTrackingError("Session expired. Please refresh the page.");
        setSubmitting(false);
        return;
      }
      
      if (res.status === 403) {
        setTrackingError("You don't have permission to perform this action.");
        setSubmitting(false);
        return;
      }
      
      // Try to parse response JSON
      let responseData;
      try {
        responseData = await res.json();
        console.log('API Response Data:', responseData);
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        responseData = { error: "Invalid response from server" };
      }
      
      if (!res.ok) {
        const errorMsg = responseData.error || res.statusText || 'Unknown error';
        console.error('API Error Response:', { responseData, res, status: res.status });
        
        if (errorMsg.toLowerCase().includes('duplicate') || 
            errorMsg.toLowerCase().includes('already exists') ||
            errorMsg.toLowerCase().includes('tracking number')) {
          setTrackingError("A package with this tracking number already exists. Please generate a new tracking number.");
        } else {
          setTrackingError(errorMsg || "Failed to save package. Please try again.");
        }
        setSubmitting(false);
        return;
      }
      
      alert(`Package ${editId ? 'updated' : 'created'} successfully!`);
      window.location.href = "/admin/packages";
      
    } catch (error) {
      console.error("Error with package:", error);
      setTrackingError("An error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Package className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-100">Package Management</p>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                    {isEditing ? "Edit Package" : "Add New Package"}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {isEditing ? "Update package information" : "Create a new package entry"}
                  </p>
                </div>
              </div>
              <Link
                href="/admin/packages"
                className="group flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-4 py-2.5 font-medium text-white shadow-md ring-1 ring-white/30 transition-all hover:bg-white/30 hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Packages</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Package Information
            </h2>
          </div>
          
          <form onSubmit={onSubmit} className="p-6 space-y-6">
            {/* Tracking Number Section */}
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tracking Number *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="block w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-sm font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder={isEditing ? "Tracking number" : "Generate tracking number"}
                      value={trackingNumber}
                      onChange={(e) => {
                        setTrackingNumber(e.target.value);
                        setTrackingSuccess(false);
                        setTrackingError(null);
                      }}
                      required
                      readOnly={isEditing}
                    />
                    {trackingSuccess && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={generateTrackingNumber}
                      className="flex items-center gap-2 rounded-xl border-2 border-blue-500 bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:border-blue-600 active:scale-95"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Generate
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {isEditing ? "Tracking number cannot be changed in edit mode" : "Format: CJS-TIMESTAMP-RANDOM-CHECKSUM"}
                </p>
                {trackingError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-700">{trackingError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Main Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Package Details</h3>
              
              {/* Customer Selection - Only show for new packages */}
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer * {selectedCustomer && <span className="text-green-600 text-xs">(Info will be auto-saved)</span>}
                  </label>
                  <div className="relative">
                    <select
                      className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                      value={selectedCustomer?.userCode || ""}
                      onChange={(e) => selectCustomer(e.target.value)}
                      required
                    >
                      <option value="">Select a customer...</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer.userCode}>
                          {customer.firstName} {customer.lastName} ({customer.userCode})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  
                  {selectedCustomer && (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">Selected Customer Information:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                        <div><span className="font-semibold">Name:</span> {selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                        <div><span className="font-semibold">Code:</span> {selectedCustomer.userCode}</div>
                        <div><span className="font-semibold">Email:</span> {selectedCustomer.email}</div>
                        {selectedCustomer.phone && (
                          <div><span className="font-semibold">Phone:</span> {selectedCustomer.phone}</div>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 mt-2 italic">✓ This information will be automatically stored with the package</p>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Info Display - Only show for edit mode */}
              {isEditing && selectedCustomer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Information
                  </label>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">Customer Details:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                      <div><span className="font-semibold">Name:</span> {selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                      <div><span className="font-semibold">Code:</span> {selectedCustomer.userCode}</div>
                      <div><span className="font-semibold">Email:</span> {selectedCustomer.email}</div>
                      {selectedCustomer.phone && (
                        <div><span className="font-semibold">Phone:</span> {selectedCustomer.phone}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0.00"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipper</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="e.g., DHL, FedEx"
                    value={form.shipper}
                    onChange={(e) => setForm({ ...form, shipper: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Entry Date</label>
                  <input
                    type="date"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={form.entryDate}
                    onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                  />
                </div>
              </div>
              
              {/* Dimensions Section */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900">Package Dimensions</h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Length (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="0.0"
                      value={form.dimensions.length}
                      onChange={(e) => setForm({ 
                        ...form, 
                        dimensions: { ...form.dimensions, length: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Width (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="0.0"
                      value={form.dimensions.width}
                      onChange={(e) => setForm({ 
                        ...form, 
                        dimensions: { ...form.dimensions, width: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="0.0"
                      value={form.dimensions.height}
                      onChange={(e) => setForm({ 
                        ...form, 
                        dimensions: { ...form.dimensions, height: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                    <div className="relative">
                      <select
                        className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        value={form.dimensions.unit}
                        onChange={(e) => setForm({ 
                          ...form, 
                          dimensions: { ...form.dimensions, unit: e.target.value }
                        })}
                      >
                        <option value="cm">cm</option>
                        <option value="in">inches</option>
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={3}
                  placeholder="Package contents or description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Description</label>
                <textarea
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={2}
                  placeholder="Detailed item description (optional)"
                  value={form.itemDescription}
                  onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="relative">
                  <select
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="received">Received</option>
                    <option value="in_processing">In Processing</option>
                    <option value="ready_to_ship">Ready to Ship</option>
                    <option value="shipped">Shipped</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sender Information */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sender Information</h3>
              <p className="text-sm text-gray-600">Enter details about who is sending this package</p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sender Name</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter sender name"
                    value={form.senderName}
                    onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sender Email</label>
                  <input
                    type="email"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="sender@example.com"
                    value={form.senderEmail}
                    onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sender Phone</label>
                  <input
                    type="tel"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="+1234567890"
                    value={form.senderPhone}
                    onChange={(e) => setForm({ ...form, senderPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sender Country</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Country"
                    value={form.senderCountry}
                    onChange={(e) => setForm({ ...form, senderCountry: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sender Address</label>
                <textarea
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={2}
                  placeholder="Enter sender address"
                  value={form.senderAddress}
                  onChange={(e) => setForm({ ...form, senderAddress: e.target.value })}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Link
                href="/admin/packages"
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isEditing ? "Updating Package..." : "Creating Package..."}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {isEditing ? "Update Package" : "Create Package"}
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

export default function AdminAddPackagePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading add package...</p>
        </div>
      </div>
    }>
      <AdminAddPackagePageContent />
    </Suspense>
  );
}