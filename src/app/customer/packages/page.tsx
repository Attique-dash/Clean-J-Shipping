// src/app/customer/packages/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Package,
  Search,
  Loader2,
  Plane,
  Ship,
  Truck,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Box,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

type UIPackage = {
  id?: string;
  _id?: string;
  tracking_number: string;
  trackingNumber?: string;
  description?: string;
  itemDescription?: string;
  status: string;
  weight?: string | number;
  weight_kg?: number;
  total_amount?: number;
  shipping_cost?: number;
  itemValueUsd?: number;
  dateReceived?: string;
  createdAt?: string;
  serviceMode?: "air" | "ocean" | "local";
  invoice_status?: string;
  paymentStatus?: string;
  shipper?: string;
};

const PAGE_SIZE = 8;

export default function CustomerPackagesPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [items, setItems] = useState<UIPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const load = async () => {
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
      const list: UIPackage[] = Array.isArray(data?.data?.packages)
        ? data.data.packages.map((pkg: any) => ({
            ...pkg,
            tracking_number: pkg.trackingNumber || pkg.tracking_number || pkg._id,
            weight: pkg.weight || pkg.weight_kg,
            total_amount: pkg.totalAmount || pkg.total_amount,
            shipping_cost: pkg.shippingCost || pkg.shipping_cost,
            dateReceived: pkg.dateReceived || pkg.createdAt,
          }))
        : Array.isArray(data?.packages)
        ? data.packages.map((pkg: any) => ({
            ...pkg,
            tracking_number: pkg.trackingNumber || pkg.tracking_number || pkg._id,
            weight: pkg.weight || pkg.weight_kg,
            total_amount: pkg.totalAmount || pkg.total_amount,
            shipping_cost: pkg.shippingCost || pkg.shipping_cost,
            dateReceived: pkg.dateReceived || pkg.createdAt,
          }))
        : [];

      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      load();
    } else if (session === null) {
      setLoading(false);
    }
  }, [session]);

  // Reset to page 1 whenever the search/filter changes
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const filtered = items.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.tracking_number.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.itemDescription || "").toLowerCase().includes(q);
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function statusLabel(s: string): string {
    switch (s) {
      case "received":
        return "Received";
      case "processing":
        return "Processing";
      case "pending":
        return "Pending";
      case "in_transit":
        return "In Transit";
      case "shipped":
        return "Shipped";
      case "ready_for_pickup":
        return "Ready for Pickup";
      case "ready_for_delivery":
        return "Ready for Delivery";
      case "collected":
      case "Collected":
        return "Collected";
      case "delivered":
        return "Delivered";
      default:
        return s ? String(s).replace(/_/g, " ") : "Unknown";
    }
  }

  function getStatusBadgeClasses(s: string) {
    const key = (s || "").toLowerCase();
    switch (key) {
      case "received":
        return "bg-purple-100 text-purple-800";
      case "processing":
        return "bg-orange-100 text-orange-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_transit":
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "ready_for_pickup":
      case "ready_for_delivery":
        return "bg-orange-100 text-orange-800";
      case "collected":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "at local sorting area":
      case "at_local_sorting_area":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getServiceIcon(mode?: string) {
    switch ((mode || "").toLowerCase()) {
      case "air":
        return <Plane className="h-5 w-5" />;
      case "ocean":
      case "sea":
        return <Ship className="h-5 w-5" />;
      case "local":
        return <Truck className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view your packages</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-[#0f4d8a] text-white rounded hover:bg-[#1e6bb8]"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Packages</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filtered.length} package{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm"
                placeholder="Search tracking number or description..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="received">Received</option>
              <option value="processing">Processing</option>
              <option value="in_transit">In Transit</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Package Cards */}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No packages found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paginated.map((pkg) => (
              <div
                key={pkg.tracking_number}
                className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Card Header */}
                <div className="p-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-[#0f4d8a]">
                      {getServiceIcon(pkg.serviceMode)}
                      <span className="font-semibold text-sm">{pkg.tracking_number}</span>
                    </div>
                  </div>
                  {(pkg.total_amount || pkg.shipping_cost) ? (
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(pkg.total_amount || pkg.shipping_cost || 0)}
                    </p>
                  ) : null}
                  {formatDate(pkg.dateReceived || pkg.createdAt) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(pkg.dateReceived || pkg.createdAt)}
                    </p>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(
                      pkg.status
                    )}`}
                  >
                    {statusLabel(pkg.status)}
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {pkg.weight ? (
                      <div>
                        <span className="text-gray-400 text-xs block">Weight</span>
                        <span className="font-medium text-gray-700">
                          {typeof pkg.weight === "number" ? pkg.weight.toFixed(2) : pkg.weight} kg
                        </span>
                      </div>
                    ) : null}
                    {pkg.itemValueUsd ? (
                      <div>
                        <span className="text-gray-400 text-xs block">Value</span>
                        <span className="font-medium text-gray-700">
                          {formatCurrency(pkg.itemValueUsd)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {(pkg.shipper || pkg.itemDescription || pkg.description) && (
                    <div className="pt-2 border-t border-gray-100">
                      {pkg.shipper && (
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                          {pkg.shipper}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {pkg.itemDescription || pkg.description}
                      </p>
                    </div>
                  )}

                  {/* Action icons - matches reference's small icon-button row */}
                  <div className="flex gap-2 pt-2">
                    <Link
                      href={`/customer/invoice-upload`}
                      className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-[#0f4d8a] hover:border-blue-200 transition-colors"
                      title="Upload Invoice"
                    >
                      <Box className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/customer/bills`}
                      className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-[#0f4d8a] hover:border-blue-200 transition-colors"
                      title="View Bill"
                    >
                      <Receipt className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // show first, last, current, and neighbors
                return (
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1
                );
              })
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium border transition-colors ${
                      currentPage === p
                        ? "bg-[#0f4d8a] text-white border-[#0f4d8a]"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}