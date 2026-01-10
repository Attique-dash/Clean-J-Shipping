// src/app/customer/packages/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Package, Search, MapPin, Filter, X, Calendar, Weight, Download, ExternalLink, RefreshCw, Loader2, Eye, User, Plane, Ship } from "lucide-react";
import { toast } from "react-toastify";

type UIPackage = {
  id?: string;
  tracking_number: string;
  description?: string;
  status: "pending" | "received" | "in_processing" | "ready_to_ship" | "shipped" | "in_transit" | "ready_for_pickup" | "delivered" | "archived" | "unknown";
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
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  itemValueUsd?: number;
  serviceMode?: 'air' | 'ocean' | 'local';
  customsRequired?: boolean;
  customsStatus?: string;
  paymentStatus?: string;
  dateReceived?: string;
  daysInStorage?: number;
  senderEmail?: string;
  senderPhone?: string;
  senderAddress?: string;
  senderCountry?: string;
  receiverName?: string;
  receiverEmail?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  total_amount?: number;
  shipping_cost?: number;
};

export default function CustomerPackagesPage() {
  const { data: session } = useSession();
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
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [packageToView, setPackageToView] = useState<UIPackage | null>(null);
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
    // Only load on initial mount if user is authenticated
    // Don't auto-refresh - user must click refresh button
    if (session?.user) {
      load();
    } else if (session === null) {
      // Session is explicitly null (not undefined), user is not authenticated
      setLoading(false);
    }
    // If session is undefined, wait for it to load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user ? 'authenticated' : session === null ? 'unauthenticated' : 'loading']); // Stable dependency

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
      default: return s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown";
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

  function handleViewDetails(pkg: UIPackage) {
    setPackageToView(pkg);
    setViewModalOpen(true);
  }

  function handleTrackPackage(pkg: UIPackage) {
    const trackingNumber = pkg.tracking_number;
    const existingTracking = localStorage.getItem('dashboardTracking') || '[]';
    const trackingList = JSON.parse(existingTracking);
    
    if (!trackingList.includes(trackingNumber)) {
      trackingList.push(trackingNumber);
      localStorage.setItem('dashboardTracking', JSON.stringify(trackingList));
      toast.success(`📍 ${trackingNumber} added to tracking dashboard`, { position: "top-right", autoClose: 3000 });
    } else {
      toast.info(`📍 ${trackingNumber} is already in tracking dashboard`, { position: "top-right", autoClose: 3000 });
    }
    
    // Store tracking number in sessionStorage for auto-fill
    sessionStorage.setItem('trackingNumber', trackingNumber);
    
    window.open('/customer/dashboard', '_blank');
  }

  const hasActiveFilters = query || locationQuery || statusFilter || dateFrom || dateTo || weightMin || weightMax;

  // Show loading while checking authentication
  if (loading && session === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not authenticated and not loading
  if (!session && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 mx-auto mb-6">
              <Package className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to view your packages</p>
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">Data Loaded</span>
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
                        <input type="date" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          Date To
                        </label>
                        <input type="date" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Weight className="inline h-3 w-3 mr-1" />
                          Min Weight (kg)
                        </label>
                        <input type="number" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm" placeholder="0" value={weightMin} onChange={(e) => setWeightMin(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          <Weight className="inline h-3 w-3 mr-1" />
                          Max Weight (kg)
                        </label>
                        <input type="number" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm" placeholder="999" value={weightMax} onChange={(e) => setWeightMax(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-600">{filtered.length} results found</span>
                    <button onClick={clearFilters} className="flex items-center space-x-1 text-sm text-[#E67919] hover:text-[#d66a15] font-medium">
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
              <div className="h-5 w-5 text-red-600">⚠</div>
              <p className="text-sm font-medium text-red-800">{error}</p>
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
                    <div key={p.tracking_number} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 hover:border-[#0f4d8a] overflow-hidden group">
                      <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                              <Package className="h-6 w-6 text-white" />
                            </div>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border bg-white/20 text-white backdrop-blur-sm">
                              {statusLabel(p.status)}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white mb-1 group-hover:underline cursor-pointer" onClick={() => handleViewDetails(p)}>
                              {p.tracking_number}
                            </h3>
                            <p className="text-xs text-blue-100 flex items-center gap-1">
                              {p.serviceMode?.toLowerCase() === 'ocean' ? (
                                <><Ship className="h-3 w-3" /> {p.serviceMode?.toUpperCase() || 'OCEAN'}</>
                              ) : p.serviceMode?.toLowerCase() === 'air' ? (
                                <><Plane className="h-3 w-3" /> {p.serviceMode?.toUpperCase() || 'AIR'}</>
                              ) : (
                                <><Package className="h-3 w-3" /> {p.serviceMode?.toUpperCase() || 'LOCAL'}</>
                              )}
                              <span className="text-blue-200">•</span>
                              <span>{p.weight || 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-sm text-gray-900 font-medium mb-1 line-clamp-2">{p.description || <span className="text-gray-400">No description</span>}</p>
                          <div className="flex flex-col gap-1">
                            {p.itemValueUsd && (
                              <p className="text-xs text-gray-500">Item Value: ${p.itemValueUsd.toFixed(2)} USD</p>
                            )}
                            {p.total_amount && p.total_amount > 0 ? (
                              <p className="text-sm font-semibold text-green-600">
                                Shipping Cost: ${p.total_amount.toFixed(2)} JMD
                              </p>
                            ) : p.shipping_cost && p.shipping_cost > 0 ? (
                              <p className="text-sm font-semibold text-green-600">
                                Shipping Cost: ${p.shipping_cost.toFixed(2)} JMD
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-orange-600">
                                Shipping cost pending
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-500 mb-1">Days</p>
                            <p className="font-semibold text-gray-900">{p.daysInStorage || 0}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-500 mb-1">Shipper</p>
                            <p className="font-semibold text-gray-900 truncate">{p.shipper || 'N/A'}</p>
                          </div>
                        </div>

                        {p.status === "received" && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                            <div className="flex items-center gap-2 text-green-700">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium">Received at {p.warehouse_location || 'warehouse'}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(p.status)}`}>
                              {p.invoice_status === 'submitted' ? 'Invoice Generated' : 
                               p.invoice_status === 'none' ? 'Invoice Pending' : 
                               p.customsRequired && p.customsStatus !== 'cleared' ? 'Customs Pending' :
                               p.paymentStatus === 'pending' ? 'Payment Pending' :
                               p.invoice_status || 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {p.hasInvoice && p.invoiceNumber && (
                              <button onClick={() => downloadInvoice(p, 'pdf')} disabled={uploadingId === p.id} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-50" title="Download PDF">
                                {uploadingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                              </button>
                            )}
                            <button onClick={() => handleViewDetails(p)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Details">
                              <Eye className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleTrackPackage(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Track Package">
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {viewModalOpen && packageToView && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">Package Details</h3>
                    <button onClick={() => setViewModalOpen(false)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      Package Information
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Tracking:</span><span className="text-sm font-medium text-gray-900 font-mono">{packageToView.tracking_number}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Status:</span><span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(packageToView.status)}`}>{statusLabel(packageToView.status)}</span></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Service:</span>
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border bg-sky-100 text-sky-800 border-sky-200">
                          {packageToView.serviceMode?.toLowerCase() === 'ocean' ? (
                            <><Ship className="h-3 w-3" /> OCEAN</>
                          ) : packageToView.serviceMode?.toLowerCase() === 'air' ? (
                            <><Plane className="h-3 w-3" /> AIR</>
                          ) : (
                            <><Package className="h-3 w-3" /> LOCAL</>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Weight:</span><span className="text-sm font-medium text-gray-900">{packageToView.weight || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Item Value:</span><span className="text-sm font-medium text-gray-900">{packageToView.itemValueUsd ? `$${packageToView.itemValueUsd.toFixed(2)} USD` : 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Shipping Cost:</span><span className="text-sm font-medium text-gray-900">{packageToView.total_amount ? `$${packageToView.total_amount.toFixed(2)} JMD` : packageToView.shipping_cost ? `$${packageToView.shipping_cost.toFixed(2)} JMD` : 'Pending'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Date Received:</span><span className="text-sm font-medium text-gray-900">{packageToView.dateReceived ? new Date(packageToView.dateReceived).toLocaleDateString() : 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-emerald-600" />
                      Sender Information
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Shipper:</span><span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">{packageToView.shipper || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Email:</span><span className="text-sm font-medium text-gray-900">{packageToView.senderEmail || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Phone:</span><span className="text-sm font-medium text-gray-900">{packageToView.senderPhone || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Country:</span><span className="text-sm font-medium text-gray-900">{packageToView.senderCountry || 'N/A'}</span></div>
                      <div className="flex justify-between col-span-2"><span className="text-sm text-gray-600">Address:</span><span className="text-sm font-medium text-gray-900">{packageToView.senderAddress || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Recipient Information
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Name:</span><span className="text-sm font-medium text-gray-900">{packageToView.receiverName || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Email:</span><span className="text-sm font-medium text-gray-900">{packageToView.receiverEmail || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Phone:</span><span className="text-sm font-medium text-gray-900">{packageToView.receiverPhone || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Country:</span><span className="text-sm font-medium text-gray-900">{packageToView.receiverCountry || 'N/A'}</span></div>
                      <div className="flex justify-between col-span-2"><span className="text-sm text-gray-600">Address:</span><span className="text-sm font-medium text-gray-900">{packageToView.receiverAddress || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      Additional Details
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Warehouse:</span><span className="text-sm font-medium text-gray-900">{packageToView.warehouse_location || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Customs Required:</span><span className="text-sm font-medium text-gray-900">{packageToView.customsRequired ? 'Yes' : 'No'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Customs Status:</span><span className="text-sm font-medium text-gray-900">{packageToView.customsStatus || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Payment Status:</span><span className="text-sm font-medium text-gray-900">{packageToView.paymentStatus || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-gray-600">Days in Storage:</span><span className="text-sm font-medium text-gray-900">{packageToView.daysInStorage || 0}</span></div>
                      {packageToView.dimensions && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-sm text-gray-600">Dimensions:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {packageToView.dimensions.length && <span>L: {packageToView.dimensions.length}{packageToView.dimensions.unit || 'cm'}</span>}
                            {packageToView.dimensions.width && <span> × W: {packageToView.dimensions.width}{packageToView.dimensions.unit || 'cm'}</span>}
                            {packageToView.dimensions.height && <span> × H: {packageToView.dimensions.height}{packageToView.dimensions.unit || 'cm'}</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                  <button onClick={() => setViewModalOpen(false)} className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-medium shadow-lg">
                    Close
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