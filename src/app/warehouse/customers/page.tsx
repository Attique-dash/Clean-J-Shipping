"use client";

import { useEffect, useState } from "react";
import { Users, Search, Trash2, Copy, CheckCircle, Package, Mail, Phone, MapPin, AlertCircle, Loader2 } from "lucide-react";

type Customer = {
  user_code: string;
  full_name?: string;
  email?: string;
  phone?: string;
  address_line?: string;
  active_packages?: number;
};

export default function WarehouseCustomersPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/warehouse/customers", window.location.origin);
      if (q.trim()) url.searchParams.set("q", q.trim());
      const r = await fetch(url.toString(), { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to load");
      setItems(d.customers || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(user_code: string) {
    if (!user_code) return;
    if (!confirm(`Delete customer ${user_code}? This cannot be undone.`)) return;
    setDeleting(user_code);
    try {
      const r = await fetch("/api/warehouse/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Delete failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  const handleCopy = async (code: string) => {
    await navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f4d8a] via-[#0a3a6b] to-[#062844] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#E67919] rounded-lg shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Customers</h1>
              <p className="text-blue-200 text-sm mt-1">Manage and view all warehouse customer accounts</p>
            </div>
          </div>

          {/* Search Bar Card */}
          <div className="bg-white rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg pl-11 pr-4 py-3 text-gray-800 focus:border-[#0f4d8a] focus:ring-2 focus:ring-[#0f4d8a] focus:ring-opacity-20 transition-all outline-none"
                  placeholder="Search by user code, name, or email..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                />
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-[#E67919] to-[#d46a0f] text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {err && (
            <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-red-800">{err}</span>
            </div>
          )}
        </div>

        {/* Customers Table Card */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#0a3a6b] px-6 py-4 border-b-4 border-[#E67919]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Customer List</h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">{items.length} {items.length === 1 ? 'Customer' : 'Customers'}</span>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">User Code</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Active Packages</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((c) => (
                  <tr key={c.user_code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-[#0f4d8a] bg-blue-50 px-2 py-1 rounded">
                          {c.user_code}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.user_code)}
                          className="p-1.5 rounded-lg border-2 border-gray-200 hover:border-[#E67919] hover:bg-orange-50 transition-all group"
                          title="Copy user code"
                        >
                          {copiedCode === c.user_code ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500 group-hover:text-[#E67919]" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Users className="w-4 h-4 text-gray-400" />
                        {c.full_name || <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {c.email || <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {c.phone || <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="max-w-xs truncate">{c.address_line || <span className="text-gray-400">-</span>}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Package className="w-4 h-4 text-[#0f4d8a]" />
                        <span className="inline-flex items-center justify-center min-w-[2rem] bg-blue-100 text-[#0f4d8a] font-bold text-sm px-2.5 py-1 rounded-full">
                          {typeof c.active_packages === "number" ? c.active_packages : 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/warehouse/packages?userCode=${c.user_code}`}
                          className="inline-flex items-center gap-2 bg-[#0f4d8a] hover:bg-[#0a3d6e] text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <Package className="w-4 h-4" />
                          <span className="text-xs">View Packages</span>
                        </a>
                        <button
                          onClick={() => remove(c.user_code)}
                          disabled={deleting === c.user_code}
                          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                          {deleting === c.user_code ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-xs">Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span className="text-xs">Delete</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {!loading && items.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search criteria or add new customers</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}