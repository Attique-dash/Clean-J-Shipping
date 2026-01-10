"use client";

import { useEffect, useState } from "react";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Search, Trash2, Copy, CheckCircle, Package, Mail, Phone, MapPin, AlertCircle, Loader2 } from "lucide-react";
import Loading from "@/components/Loading";

type Customer = {
  user_code: string;
  full_name?: string;
  email?: string;
  phone?: string;
  address_line?: string;
  active_packages?: number;
};

export default function WarehouseCustomersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Redirect if not authenticated or not warehouse staff
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/warehouse/customers", window.location.origin);
      if (q.trim()) url.searchParams.set("q", q.trim());
      const r = await fetch(url.toString(), { cache: "no-store", credentials: 'include' });
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
  }, [status]);

  async function remove(user_code: string) {
    if (!user_code) return;
    if (!confirm(`Delete customer ${user_code}? This cannot be undone.`)) return;
    setDeleting(user_code);
    try {
      const r = await fetch("/api/warehouse/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
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

  if (status === 'loading') {
    return <Loading message="Loading customers..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-100">Customer Management</p>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">Customers</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

          {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Customers
            </h2>
          </div>
          <div className="p-6">
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
        </div>

        {/* Error Message */}
        {err && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium text-red-800">{err}</span>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customer List
              </h2>
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