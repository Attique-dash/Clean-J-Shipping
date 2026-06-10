// src/app/customer/packages/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Package, Search, Loader2 } from "lucide-react";
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
  dateReceived?: string;
  createdAt?: string;
  serviceMode?: 'air' | 'ocean' | 'local';
  invoice_status?: string;
  paymentStatus?: string;
};

export default function CustomerPackagesPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [items, setItems] = useState<UIPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

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

  const filtered = items.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || p.tracking_number.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function statusLabel(s: string): string {
    switch (s) {
      case "received": return "Received";
      case "processing": return "Processing";
      case "pending": return "Pending";
      case "in_transit": return "In Transit";
      case "shipped": return "Shipped";
      case "ready_for_pickup": return "Ready";
      case "delivered": return "Delivered";
      default: return s ? String(s).replace(/_/g, ' ') : "Unknown";
    }
  }

  function getStatusColor(s: string) {
    switch (s) {
      case "received": return "bg-purple-100 text-purple-800";
      case "processing": return "bg-orange-100 text-orange-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "in_transit": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-blue-100 text-blue-800";
      case "ready_for_pickup": return "bg-orange-100 text-orange-800";
      case "delivered": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Packages</h1>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:border-[#0f4d8a] focus:outline-none"
                placeholder="Search tracking number or description..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded focus:border-[#0f4d8a] focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="received">Received</option>
              <option value="processing">Processing</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Package List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No packages found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((pkg) => (
                  <tr key={pkg.tracking_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{pkg.tracking_number}</td>
                    <td className="px-6 py-4 text-gray-600">{pkg.itemDescription || pkg.description || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(pkg.status)}`}>
                        {statusLabel(pkg.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {pkg.weight ? `${typeof pkg.weight === 'number' ? pkg.weight.toFixed(2) : pkg.weight} kg` : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {pkg.total_amount ? formatCurrency(pkg.total_amount) : pkg.shipping_cost ? formatCurrency(pkg.shipping_cost) : 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}