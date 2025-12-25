// src/app/customer/packages/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Search, MapPin, Filter, X, Calendar, Weight, Upload, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type UIPackage = {
  id?: string;
  tracking_number: string;
  description?: string;
  status: "in_transit" | "ready_for_pickup" | "delivered" | "pending" | "received" | "archived";
  current_location?: string;
  estimated_delivery?: string;
  weight?: string;
  invoice_status?: string;
  actions_available?: string[];
  ready_since?: string;
  updated_at?: string;
  weight_kg?: number;
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
  
  // Advanced filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [weightMin, setWeightMin] = useState<string>("");
  const [weightMax, setWeightMax] = useState<string>("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce query input changes (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/packages", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        cache: "no-store",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load packages");
      const list: UIPackage[] = Array.isArray(data?.packages) ? data.packages : [];
      setItems(list);
      setTotal(Number(data?.total_packages || list.length));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const q = debouncedQuery.trim().toLowerCase();
      const lq = locationQuery.trim().toLowerCase();
      const matchesQuery = !q
        || p.tracking_number.toLowerCase().includes(q)
        || (p.description || "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesLocation = !lq || (p.current_location || "").toLowerCase().includes(lq);
      
      // Date range filter on updated_at or ready_since/estimated_delivery as fallback
      const fromOk = !dateFrom || (p.updated_at ? new Date(p.updated_at) >= new Date(dateFrom) : true);
      const toOk = !dateTo || (p.updated_at ? new Date(p.updated_at) <= new Date(dateTo + "T23:59:59") : true);
      
      // Weight filters use numeric weight_kg if available
      const w = p.weight_kg as number | undefined;
      const wMinOk = !weightMin || (typeof w === "number" ? w >= Number(weightMin) : true);
      const wMaxOk = !weightMax || (typeof w === "number" ? w <= Number(weightMax) : true);
      
      return matchesQuery && matchesStatus && matchesLocation && fromOk && toOk && wMinOk && wMaxOk;
    });
  }, [items, debouncedQuery, statusFilter, locationQuery, dateFrom, dateTo, weightMin, weightMax]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(Math.max(1, page), totalPages);
  const paged = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  function statusLabel(s: UIPackage["status"]) {
    switch (s) {
      case "received":
        return "Received";
      case "pending":
        return "Processing";
      case "in_transit":
        return "Shipped";
      case "ready_for_pickup":
        return "Ready for Pickup";
      case "delivered":
        return "Delivered";
      case "archived":
        return "Archived";
      default:
        return "Unknown";
    }
  }

  function getStatusColor(s: UIPackage["status"]) {
    switch (s) {
      case "received":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_transit":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ready_for_pickup":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  async function uploadInvoice(pkg: UIPackage, files: FileList | null) {
    if (!pkg?.id || !files || files.length === 0) return;
    setUploadingId(pkg.id);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/customer/packages/${encodeURIComponent(pkg.id)}/invoice`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
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
                  <Package className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-100">Customer Portal</p>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">My Packages</h1>
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

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filters
            </h2>
          </div>
          <div className="p-6">
          <div className="space-y-4">
            {/* Main Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  placeholder="Search tracking/description..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Location */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#E67919] focus:ring-2 focus:ring-orange-100 transition-all text-sm"
                  placeholder="Filter by location..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
              </div>

              {/* Status */}
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

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 border-2 border-gray-200 rounded-lg hover:border-[#E67919] hover:bg-orange-50 transition-all text-sm font-medium"
              >
                <Filter className="h-4 w-4" />
                <span>Advanced</span>
              </button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date From */}
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

                  {/* Date To */}
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

                  {/* Weight Min */}
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

                  {/* Weight Max */}
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

            {/* Clear Filters */}
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

        {/* Error Message */}
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

        {/* Packages Table Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Package List
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8]">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Tracking
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Date Added
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={7}>
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin" />
                        <p className="text-sm text-gray-600 font-medium">Loading packages...</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={7}>
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Package className="h-12 w-12 text-gray-300" />
                        <p className="text-sm font-medium text-gray-600">No packages found</p>
                        <p className="text-xs text-gray-400">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((p) => (
                    <tr
                      key={p.tracking_number}
                      className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 border-b border-gray-100"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-xl flex items-center justify-center shadow-lg">
                            <Package className="h-6 w-6 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">
                              {p.tracking_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {p.description || <span className="text-gray-400">No description</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="h-4 w-4 text-[#E67919] mr-1.5" />
                          {p.current_location || <span className="text-gray-400">Unknown</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {p.weight || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {p.created_at || p.createdAt || p.updated_at || p.updatedAt
                          ? new Date(p.created_at || p.createdAt || p.updated_at || p.updatedAt).toLocaleDateString()
                          : <span className="text-gray-400">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs rounded ${
                          p.invoice_status === 'uploaded' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {p.invoice_status || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <a
                            href={`/track?q=${encodeURIComponent(p.tracking_number)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-2 border border-[#0891b2] text-[#0891b2] rounded-lg hover:bg-cyan-50 transition-all text-sm font-medium"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Track
                          </a>
                          {p.id && (
                            <label className="inline-flex items-center px-3 py-2 border border-[#E67919] text-[#E67919] rounded-lg hover:bg-orange-50 transition-all text-sm font-medium cursor-pointer">
                              {uploadingId === p.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-1" />
                                  Invoice
                                </>
                              )}
                              <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                multiple
                                className="hidden"
                                onChange={(e) => uploadInvoice(p, e.target.files)}
                                disabled={uploadingId === p.id}
                              />
                            </label>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && paged.length > 0 && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-[#0f4d8a]">{(pageClamped - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold text-[#0f4d8a]">
                    {Math.min(pageClamped * pageSize, filtered.length)}
                  </span>{" "}
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
      </div>
    </div>
  );
}