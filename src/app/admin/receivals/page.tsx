"use client";

import { useState, useEffect } from "react";
import { Package, Truck, MapPin, Calendar, Search, Filter, ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, Box, ArrowRight, User, RefreshCw } from "lucide-react";
import Loading from "@/components/Loading";
type ReceivalStatus = "pending" | "in_transit" | "received" | "delayed";

type Receival = {
  id: string;
  receivalNumber: string;
  fromWarehouse: string;
  toBranch: string;
  items: { name: string; quantity: number; sku: string }[];
  totalItems: number;
  status: ReceivalStatus;
  shippedDate: string;
  expectedDate: string;
  receivedDate?: string;
  receivedBy?: string;
  trackingNumber?: string;
};

export default function ReceivalsPage() {
  const [receivals, setReceivals] = useState<Receival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReceivalStatus | "all">("all");

  async function loadReceivals() {
    setLoading(true);
    setError(null);
    try {
      // Load packages with authentication (NextAuth handles auth via cookies)
      const res = await fetch("/api/admin/packages?per_page=100", { 
        cache: "no-store",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data?.error || "Failed to load receivals";
        console.error("Receivals API error:", errorMsg, data);
        throw new Error(errorMsg);
      }
      
      const packages = data.packages || [];
      const mapped: Receival[] = packages.map((pkg: {
        _id: string;
        trackingNumber: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        currentLocation: string;
        estimatedDelivery: string;
      }, idx: number) => {
        const statusMap: Record<string, ReceivalStatus> = {
          "At Warehouse": "received",
          "In Transit": "in_transit",
          "Delivered": "received",
          "pending": "pending",
          "picked_up": "in_transit",
          "out_for_delivery": "in_transit",
          "failed": "delayed",
          "returned": "delayed",
        };
        
        // Parse received_date to get dates
        const receivedDate = pkg.createdAt ? new Date(pkg.createdAt) : new Date();
        const expectedDate = new Date(receivedDate);
        expectedDate.setDate(expectedDate.getDate() + 3); // Add 3 days for expected delivery
        
        return {
          id: pkg._id || pkg.trackingNumber || String(idx),
          receivalNumber: pkg.trackingNumber || `RCV-${idx + 1}`,
          fromWarehouse: pkg.currentLocation || "Main Warehouse",
          toBranch: pkg.currentLocation || "Main Branch",
          items: [],
          totalItems: 1,
          status: statusMap[pkg.status] || "pending",
          shippedDate: receivedDate.toISOString().split('T')[0],
          expectedDate: expectedDate.toISOString().split('T')[0],
          receivedDate: statusMap[pkg.status] === "received" ? receivedDate.toISOString().split('T')[0] : undefined,
          receivedBy: undefined,
          trackingNumber: pkg.trackingNumber || undefined,
        };
      });
      
      setReceivals(mapped);
    } catch (e) {
      console.error("Error loading receivals:", e);
      setError(e instanceof Error ? e.message : "Failed to load receivals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReceivals();
  }, []);

  const getStatusColor = (status: ReceivalStatus) => {
    switch (status) {
      case "received":
        return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle };
      case "in_transit":
        return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: Truck };
      case "pending":
        return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: Clock };
      case "delayed":
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertCircle };
    }
  };

  const filteredReceivalsData = receivals.filter((r) => {
    const matchesSearch = r.receivalNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fromWarehouse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.toBranch.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: receivals.length,
    received: receivals.filter((r) => r.status === "received").length,
    inTransit: receivals.filter((r) => r.status === "in_transit").length,
    pending: receivals.filter((r) => r.status === "pending").length,
    delayed: receivals.filter((r) => r.status === "delayed").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />

          <div className="relative flex flex-col gap-6">
            
            {/* Top Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                  Receivals Management
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  Track and manage inventory receivals from warehouses to branches
                </p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={loadReceivals}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold shadow-md backdrop-blur transition hover:bg-white/25 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button 
                  onClick={() => {
                    // TODO: Open new receival form modal
                    alert("New Receival functionality - Coming soon!");
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0f4d8a] shadow-md backdrop-blur transition hover:bg-blue-50 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Package className="h-5 w-5" />
                  New Receival
                </button>
              </div>
            </div>

            {/* Stats Cards inside header */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

              {/* Total Receivals */}
              <div className="group relative overflow-hidden rounded-xl bg-white/10 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Total Receivals</p>
                    <p className="mt-1 text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </div>

              {/* Received */}
              <div className="group relative overflow-hidden rounded-xl bg-green-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-100">Received</p>
                    <p className="mt-1 text-2xl font-bold">{stats.received}</p>
                  </div>
                </div>
              </div>

              {/* In Transit */}
              <div className="group relative overflow-hidden rounded-xl bg-blue-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">In Transit</p>
                    <p className="mt-1 text-2xl font-bold">{stats.inTransit}</p>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="group relative overflow-hidden rounded-xl bg-orange-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-100">Pending</p>
                    <p className="mt-1 text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </div>

              {/* Delayed */}
              <div className="group relative overflow-hidden rounded-xl bg-red-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-red-100">Delayed</p>
                    <p className="mt-1 text-2xl font-bold">{stats.delayed}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by receival number, warehouse, or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReceivalStatus | "all")}
                className="pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent appearance-none bg-white min-w-[180px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="received">Received</option>
                <option value="delayed">Delayed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Receivals List */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Receival Tracking</h2>
          </div>

          <div className="divide-y divide-slate-200">
            {loading ? (
              <Loading message="Loading receivals..." />
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                <p className="text-red-500 font-medium">{error}</p>
                <button 
                  onClick={loadReceivals}
                  className="mt-4 px-4 py-2 rounded-lg bg-[#0f4d8a] text-white hover:bg-[#0e447d] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredReceivalsData.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No receivals found</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter</p>
              </div>
            ) : (
              filteredReceivalsData.map((receival) => {
                const statusStyle = getStatusColor(receival.status);
                const StatusIcon = statusStyle.icon;
                const isExpanded = expandedId === receival.id;

                return (
                  <div key={receival.id} className="hover:bg-slate-50 transition-colors">
                    <div
                      className="p-5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : receival.id)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`w-12 h-12 rounded-lg ${statusStyle.bg} border ${statusStyle.border} flex items-center justify-center flex-shrink-0`}>
                            <StatusIcon className={`w-6 h-6 ${statusStyle.text}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-800 text-lg">{receival.receivalNumber}</h3>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                                {receival.status.replace("_", " ").toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-600 mb-2">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-[#0f4d8a]" />
                                {receival.fromWarehouse}
                              </span>
                              <ArrowRight className="hidden sm:block w-4 h-4 text-slate-400" />
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-[#E67919]" />
                                {receival.toBranch}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <Box className="w-4 h-4" />
                                {receival.totalItems} items
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                Expected: {new Date(receival.expectedDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
                          {/* Timeline */}
                          <div className="bg-slate-50 rounded-lg p-4">
                            <h4 className="font-semibold text-slate-800 mb-3">Shipment Timeline</h4>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#0f4d8a] flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-800">Shipped</p>
                                  <p className="text-sm text-slate-600">{new Date(receival.shippedDate).toLocaleDateString()}</p>
                                </div>
                              </div>
                              
                              {receival.status === "in_transit" && (
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                    <Truck className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800">In Transit</p>
                                    <p className="text-sm text-slate-600">Currently en route</p>
                                  </div>
                                </div>
                              )}
                              
                              {receival.receivedDate && (
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800">Received</p>
                                    <p className="text-sm text-slate-600">{new Date(receival.receivedDate).toLocaleDateString()}</p>
                                    {receival.receivedBy && (
                                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                                        <User className="w-3 h-3" />
                                        {receival.receivedBy}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Items List */}
                          <div>
                            <h4 className="font-semibold text-slate-800 mb-3">Items ({receival.items.length})</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {receival.items.map((item, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-white to-slate-50 rounded-lg p-4 border border-slate-200">
                                  <p className="font-medium text-slate-800">{item.name}</p>
                                  <p className="text-sm text-slate-600 mt-1">SKU: {item.sku}</p>
                                  <p className="text-lg font-bold text-[#E67919] mt-2">Qty: {item.quantity}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tracking Info */}
                          {receival.trackingNumber && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <p className="text-sm font-medium text-slate-700">Tracking Number</p>
                              <p className="text-lg font-mono font-bold text-[#0f4d8a] mt-1">{receival.trackingNumber}</p>
                            </div>
                          )}

                          {/* Record Received Action */}
                          {receival.status !== "received" && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <button
                                onClick={async () => {
                                  if (!confirm(`Mark receival ${receival.receivalNumber} as received?`)) return;
                                  try {
                                    // Update package status to "At Warehouse" (received)
                                    const res = await fetch(`/api/admin/packages`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      credentials: 'include',
                                      body: JSON.stringify({
                                        id: receival.id,
                                        status: "At Warehouse",
                                      }),
                                    });
                                    if (res.ok) {
                                      alert("Receival recorded successfully!");
                                      loadReceivals();
                                    } else {
                                      const data = await res.json();
                                      alert(data?.error || "Failed to record receival");
                                    }
                                  } catch (e) {
                                    alert("Error recording receival: " + (e instanceof Error ? e.message : "Unknown error"));
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Record as Received
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}