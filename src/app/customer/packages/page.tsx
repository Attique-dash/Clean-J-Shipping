// src/app/customer/packages/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Package, Search, MapPin, Filter, X, Calendar, Weight, Download, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

type UIPackage = {
  id?: string;
  tracking_number: string;
  description?: string;
  status:
    | "pending"
    | "received"
    | "in_processing"
    | "ready_to_ship"
    | "shipped"
    | "in_transit"
    | "ready_for_pickup"
    | "delivered"
    | "archived"
    | "unknown";
  current_location?: string;
  estimated_delivery?: string;
  weight?: string;
  invoice_status?: string;
  actions_available?: string[];
  ready_since?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  weight_kg?: number;
  hasInvoice?: boolean;
  invoiceNumber?: string;
  warehouse_location?: string;
  received_by?: string;
  received_date?: string;
  shipper?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
};

export default function CustomerPackagesPage() {
  const [items, setItems] = useState<UIPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [locationQuery, setLocationQuery] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const previousItemsRef = useRef<UIPackage[]>([]);
  
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [weightMin, setWeightMin] = useState<string>("");
  const [weightMax, setWeightMax] = useState<string>("");
  
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/packages", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load packages");
      const list: UIPackage[] = Array.isArray(data?.packages) ? data.packages : [];
      
      const receivedPackages = list.filter(pkg => pkg.status === "received");
      const previousReceived = previousItemsRef.current.filter(pkg => pkg.status === "received");
      
      if (receivedPackages.length > previousReceived.length && previousItemsRef.current.length > 0) {
        const newPackages = receivedPackages.filter(pkg => 
          !previousReceived.some(prev => prev.tracking_number === pkg.tracking_number)
        );
        
        newPackages.forEach(pkg => {
          toast.success(`📦 Package ${pkg.tracking_number} received at warehouse!`, {
            position: "top-right",
            autoClose: 5000,
          });
        });
      }
      
      previousItemsRef.current = list;
      setItems(list);
      setTotal(Number(data?.total_packages || list.length));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const q = debouncedQuery.trim().toLowerCase();
      const lq = locationQuery.trim().toLowerCase();
      const matchesQuery = !q || p.tracking_number.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesLocation = !lq || (p.current_location || "").toLowerCase().includes(lq);
      
      const fromOk = !dateFrom || (p.updated_at ? new Date(p.updated_at) >= new Date(dateFrom) : true);
      const toOk = !dateTo || (p.updated_at ? new Date(p.updated_at) <= new Date(dateTo + "T23:59:59") : true);
      
      const w = p.weight_kg as number | undefined;
      const wMinOk = !weightMin || (typeof w === "number" ? w >= Number(weightMin) : true);
      const wMaxOk = !weightMax || (typeof w === "number" ? w <= Number(weightMax) : true);
      
      return matchesQuery && matchesStatus && matchesLocation && fromOk && toOk && wMinOk && wMaxOk;
    });
  }, [items, debouncedQuery, statusFilter, locationQuery, dateFrom, dateTo, weightMin, weightMax]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(Math.max(1, page), totalPages);
  const paged = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  function statusLabel(s: UIPackage["status"] | string): string {
    switch (s) {
      case "received": return "Received";
      case "pending":
      case "in_processing": return "Processing";
      case "in_transit":
      case "shipped": return "Shipped";
      case "ready_for_pickup":
      case "ready_to_ship": return "Ready for Pickup";
      case "delivered": return "Delivered";
      case "archived": return "Archived";
      case "unknown": return "Unknown";
      default: return s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Unknown";
    }
  }

  function getStatusColor(s: UIPackage["status"] | string) {
    switch (s) {
      case "received": return "bg-purple-100 text-purple-800 border-purple-200";
      case "pending":
      case "in_processing": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_transit":
      case "shipped": return "bg-blue-100 text-blue-800 border-blue-200";
      case "ready_for_pickup":
      case "ready_to_ship": return "bg-orange-100 text-orange-800 border-orange-200";
      case "delivered": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  async function downloadInvoice(pkg: UIPackage, format: 'pdf' | 'excel' = 'pdf') {
    if (!pkg?.invoiceNumber) {
      setError("No invoice available for this package");
      return;
    }
    
    setUploadingId(pkg.id ?? null);
    setError(null);
    try {
      const res = await fetch(`/api/customer/invoices/${encodeURIComponent(pkg.invoiceNumber)}/download?format=${format}`, {
        method: "GET",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Download failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setUploadingId(null);
    }
  }

  function clearFilters() {
    setQuery("");
    setLocationQuery("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setWeightMin("");
    setWeightMax("");
    setPage(1);
  }

  const hasActiveFilters = query || locationQuery || statusFilter || dateFrom || dateTo || weightMin || weightMax;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 space-y-6">
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Package className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-tight md:text-3xl">My Packages</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Showing {filtered.length} of {total} packages
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                        Data Loaded
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => load()}
                  className="flex items-center space-x-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </header>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Search & Filters
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      placeholder="Search tracking/description..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#E67919] focus:ring-2 focus:ring-orange-100 transition-all text-sm"
                      placeholder="Filter by location..."
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                    />
                  </div>

                  <select
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100 transition-all text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="received">Received</option>
                    <option value="pending">Processing</option>
                    <option value="in_transit">Shipped</option>
                    <option value="ready_for_pickup">Ready for Pickup</option>
                    <option value="delivered">Delivered</option>
                    <option value="archived">Archived</option>
                  </select>

                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center justify-center space-x-2 px-4 py-2.5 border-2 border-gray-200 rounded-lg hover:border-[#E67919] hover:bg-orange-50 transition-all text-sm font-medium"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Advanced</span>
                  </button>
                </div>

                {showAdvancedFilters && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          Date From
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          Date To
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Weight className="inline h-3 w-3 mr-1" />
                          Min Weight (kg)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                          placeholder="0"
                          value={weightMin}
                          onChange={(e) => setWeightMin(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Weight className="inline h-3 w-3 mr-1" />
                          Max Weight (kg)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                          placeholder="999"
                          value={weightMax}
                          onChange={(e) => setWeightMax(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-600">
                      {filtered.length} results found
                    </span>
                    <button
                      onClick={clearFilters}
                      className="flex items-center space-x-1 text-sm text-[#E67919] hover:text-[#d66a15] font-medium"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear all filters</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 text-red-600">⚠</div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Package List
              </h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin" />
                  <p className="text-sm text-gray-600 font-medium">Loading packages...</p>
                </div>
              ) : paged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Package className="h-12 w-12 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">No packages found</p>
                  <p className="text-xs text-gray-400">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {paged.map((p) => (
                    <div
                      key={p.tracking_number}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 hover:border-[#0f4d8a] overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                              <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white">{p.tracking_number}</h3>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border bg-white/20 text-white">
                                {statusLabel(p.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-sm text-gray-900 font-medium mb-1">Description</p>
                          <p className="text-sm text-gray-600">
                            {p.description || <span className="text-gray-400">No description</span>}
                          </p>
                        </div>

                        {p.status === "received" && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="font-semibold text-green-800 mb-2 text-sm">📦 Received at Warehouse</div>
                            <div className="space-y-1 text-xs text-green-700">
                              {p.warehouse_location && <div><span className="font-medium">Location:</span> {p.warehouse_location}</div>}
                              {p.received_date && <div><span className="font-medium">Received:</span> {new Date(p.received_date).toLocaleDateString()}</div>}
                              {p.received_by && <div><span className="font-medium">Received by:</span> {p.received_by}</div>}
                              {p.shipper && <div><span className="font-medium">Shipper:</span> {p.shipper}</div>}
                              {p.dimensions && (
                                <div>
                                  <span className="font-medium">Dimensions:</span>{" "}
                                  {p.dimensions.length && <span>L: {p.dimensions.length}cm</span>}
                                  {p.dimensions.width && <span> × W: {p.dimensions.width}cm</span>}
                                  {p.dimensions.height && <span> × H: {p.dimensions.height}cm</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Weight</p>
                            <p className="text-sm font-medium text-gray-900">{p.weight || <span className="text-gray-400">-</span>}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Date Added</p>
                            <p className="text-sm font-medium text-gray-900">
                              {(() => {
                                const dateStr = p.created_at || p.createdAt || p.updated_at || p.updatedAt;
                                return dateStr ? new Date(dateStr).toLocaleDateString() : <span className="text-gray-400">N/A</span>;
                              })()}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 mb-1">Invoice Status</p>
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(p.status)}`}>
                              {p.invoice_status === 'submitted' ? 'Invoice Generated' : p.invoice_status === 'none' ? 'Invoice Pending' : p.invoice_status || 'Pending'}
                            </span>
                            <Link href="/customer/bills" className="text-xs text-blue-600 hover:text-blue-800 underline">
                              View Bills →
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {p.hasInvoice && p.invoiceNumber && (
                              <>
                                <button
                                  onClick={() => downloadInvoice(p, 'pdf')}
                                  disabled={uploadingId === p.id}
                                  className="inline-flex items-center px-3 py-2 border border-[#E67919] text-[#E67919] rounded-lg hover:bg-orange-50 transition-all text-sm font-medium disabled:opacity-50"
                                  title="Download PDF"
                                >
                                  {uploadingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => downloadInvoice(p, 'excel')}
                                  disabled={uploadingId === p.id}
                                  className="inline-flex items-center px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-all text-sm font-medium disabled:opacity-50"
                                  title="Download Excel"
                                >
                                  {uploadingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                </button>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => window.open(`/track?p=${p.tracking_number}`, '_blank')}
                            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Track
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!loading && paged.length > 0 && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-[#0f4d8a]">{(pageClamped - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold text-[#0f4d8a]">{Math.min(pageClamped * pageSize, filtered.length)}</span>{" "}
                  of <span className="font-semibold text-[#0f4d8a]">{filtered.length}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageClamped === 1}
                    className="inline-flex items-center px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page <span className="font-semibold text-[#0f4d8a]">{pageClamped}</span> of{" "}
                    <span className="font-semibold text-[#0f4d8a]">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageClamped === totalPages}
                    className="inline-flex items-center px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}