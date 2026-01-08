"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Search, CheckCircle, User, MapPin, Calendar, Weight, Truck, Mail, Phone } from "lucide-react";
import { toast } from "react-hot-toast";

interface WarehousePackage {
  _id: string;
  trackingNumber: string;
  userCode: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  weight: number;
  shipper: string;
  description?: string;
  status: string;
  warehouse?: string;
  receivedBy?: string;
  receivedDate?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  entryDate?: string;
}

interface Customer {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function WarehouseReceivingPage() {
  const [packages, setPackages] = useState<WarehousePackage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    trackingNumber: "",
    userCode: "",
    weight: "",
    shipper: "",
    description: "",
    entryDate: new Date().toISOString().split('T')[0],
    dimensions: {
      length: "",
      width: "",
      height: ""
    },
    receivedBy: "",
    warehouse: ""
  });

  // Load existing packages
  useEffect(() => {
    loadPackages();
    loadCustomers();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/packages", { cache: "no-store" });
      const data = await res.json();
      
      if (data.packages) {
        setPackages(data.packages.filter((pkg: WarehousePackage) => 
          pkg.status === "At Warehouse" || pkg.status === "received"
        ));
      }
    } catch (_error) {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = await res.json();
      
      if (data.items) {
        setCustomers(data.items);
      }
    } catch (_error) {
      console.error("Failed to load customers");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const payload = {
        ...formData,
        weight: parseFloat(formData.weight) || 0,
        dimensions: {
          length: parseFloat(formData.dimensions.length) || undefined,
          width: parseFloat(formData.dimensions.width) || undefined,
          height: parseFloat(formData.dimensions.height) || undefined
        }
      };

      const res = await fetch("/api/admin/receivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Package ${formData.trackingNumber} received successfully!`);
        
        // Reset form
        setFormData({
          trackingNumber: "",
          userCode: "",
          weight: "",
          shipper: "",
          description: "",
          entryDate: new Date().toISOString().split('T')[0],
          dimensions: { length: "", width: "", height: "" },
          receivedBy: "",
          warehouse: ""
        });
        setShowForm(false);
        
        // Reload packages
        loadPackages();
      } else {
        toast.error(data.error || "Failed to receive package");
      }
    } catch (_error) {
      toast.error("Failed to receive package");
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.userCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.shipper?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerInfo = (userCode: string) => {
    return customers.find(c => c.userCode === userCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
              Warehouse Receiving
            </h1>
            <p className="text-slate-600 mt-1">Receive and log incoming packages</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f4d8a] text-white hover:bg-[#0f4d8a]/90 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Package</span>
          </button>
        </div>

        {/* Receiving Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#0f4d8a]" />
              Receive New Package
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tracking Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tracking Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.trackingNumber}
                    onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                    placeholder="Enter tracking number"
                  />
                </div>

                {/* Customer Code */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.userCode}
                    onChange={(e) => setFormData({...formData, userCode: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                    placeholder="Enter customer code"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                    placeholder="Enter weight"
                  />
                </div>

                {/* Shipper */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Shipper *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shipper}
                    onChange={(e) => setFormData({...formData, shipper: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                    placeholder="Enter shipper name"
                  />
                </div>

                {/* Entry Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Entry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.entryDate}
                    onChange={(e) => setFormData({...formData, entryDate: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                  />
                </div>

                {/* Warehouse */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Warehouse Location
                  </label>
                  <input
                    type="text"
                    value={formData.warehouse}
                    onChange={(e) => setFormData({...formData, warehouse: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                    placeholder="Enter warehouse location"
                  />
                </div>

                {/* Dimensions */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dimensions (cm)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.dimensions.length}
                      onChange={(e) => setFormData({
                        ...formData, 
                        dimensions: {...formData.dimensions, length: e.target.value}
                      })}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                      placeholder="Length"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={formData.dimensions.width}
                      onChange={(e) => setFormData({
                        ...formData, 
                        dimensions: {...formData.dimensions, width: e.target.value}
                      })}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={formData.dimensions.height}
                      onChange={(e) => setFormData({
                        ...formData, 
                        dimensions: {...formData.dimensions, height: e.target.value}
                      })}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                      placeholder="Height"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                    placeholder="Enter package description"
                  />
                </div>

                {/* Received By */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Received By
                  </label>
                  <input
                    type="text"
                    value={formData.receivedBy}
                    onChange={(e) => setFormData({...formData, receivedBy: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                    placeholder="Staff name"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#E67919] text-white rounded-lg hover:bg-[#E67919]/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Receiving..." : "Receive Package"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by tracking number, customer code, shipper..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
            />
          </div>
        </div>

        {/* Packages List */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Received Packages ({filteredPackages.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f4d8a]"></div>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No packages found</p>
                <p className="text-sm text-slate-400 mt-1">Receive your first package to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredPackages.map((pkg) => {
                  const customer = getCustomerInfo(pkg.userCode);
                  return (
                    <div key={pkg._id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Package Info */}
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-800">{pkg.trackingNumber}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {pkg.status}
                                </span>
                                {pkg.warehouse && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {pkg.warehouse}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-slate-600">Customer</p>
                                <p className="font-medium text-slate-800">
                                  {customer ? `${customer.firstName} ${customer.lastName}` : pkg.userCode}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-slate-600">Shipper</p>
                                <p className="font-medium text-slate-800">{pkg.shipper}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Weight className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-slate-600">Weight</p>
                                <p className="font-medium text-slate-800">{pkg.weight} kg</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-slate-600">Received</p>
                                <p className="font-medium text-slate-800">
                                  {pkg.receivedDate ? new Date(pkg.receivedDate).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {pkg.description && (
                            <div className="text-sm">
                              <p className="text-slate-600">Description</p>
                              <p className="text-slate-800">{pkg.description}</p>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Customer Contact */}
                        <div className="space-y-4">
                          {customer && (
                            <div className="bg-slate-50 rounded-lg p-4">
                              <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Customer Contact
                              </h4>
                              <div className="space-y-2 text-sm">
                                {customer.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-700">
                                      {customer.email}
                                    </a>
                                  </div>
                                )}
                                {customer.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <a href={`tel:${customer.phone}`} className="text-blue-600 hover:text-blue-700">
                                      {customer.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {pkg.dimensions && (
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h4 className="font-medium text-slate-800 mb-2">Dimensions</h4>
                              <div className="text-sm text-slate-600">
                                {pkg.dimensions.length && <span>L: {pkg.dimensions.length}cm</span>}
                                {pkg.dimensions.width && <span> × W: {pkg.dimensions.width}cm</span>}
                                {pkg.dimensions.height && <span> × H: {pkg.dimensions.height}cm</span>}
                              </div>
                            </div>
                          )}

                          {pkg.receivedBy && (
                            <div className="bg-green-50 rounded-lg p-4">
                              <h4 className="font-medium text-slate-800 mb-2">Received By</h4>
                              <p className="text-sm text-slate-600">{pkg.receivedBy}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
