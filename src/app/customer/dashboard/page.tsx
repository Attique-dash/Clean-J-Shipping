"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Package, FileText, Bell, AlertCircle, MapPin, DollarSign, Home,
  CreditCard, MessageSquare, Plane, Ship, RefreshCw, Loader2, BarChart3,
  ChevronRight, Activity, Receipt, Upload,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import Loading from "@/components/Loading";

interface Stats { totalPackages: number; pendingBills: number; unreadMessages: number; walletBalance: number; preAlerts: number; payments: number; invoices: number; }
interface ShippingAddress { type: string; street: string; city: string; state: string; zipCode: string; country: string; }

const CACHE_KEY = "customer_dashboard_cache";
const CACHE_TTL = 2 * 60 * 1000;

export default function CustomerDashboardPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<Stats>({ totalPackages: 0, pendingBills: 0, unreadMessages: 0, walletBalance: 0, preAlerts: 0, payments: 0, invoices: 0 });
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL && data?.stats) {
            setStats(data.stats);
            setShippingAddresses(data.shippingAddresses || []);
            setLastUpdated(new Date(timestamp));
            setInitialLoad(false);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/dashboard", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load dashboard");
      setStats(data.stats || { totalPackages: 0, pendingBills: 0, unreadMessages: 0, walletBalance: 0, preAlerts: 0, payments: 0, invoices: 0 });
      setShippingAddresses(data.shippingAddresses || []);
      setLastUpdated(new Date());
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: { stats: data.stats, shippingAddresses: data.shippingAddresses }, timestamp: Date.now() })); } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally { setLoading(false); setInitialLoad(false); }
  }, []);

  useEffect(() => { if (session?.user) loadStats(); else if (session === null) { setInitialLoad(false); setLoading(false); } }, [session, loadStats]);

  if (initialLoad && loading) return <Loading message="Loading dashboard..." />;

  if (!session) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center max-w-md">
        <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
        <p className="text-gray-600 mb-6">Please log in to access your dashboard</p>
        <Link href="/login" className="inline-flex items-center px-6 py-3 bg-[#0f4d8a] text-white rounded-xl hover:shadow-lg font-medium">Sign In</Link>
      </div>
    </div>
  );

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";

  const statCards = [
    { href: "/customer/invoice-upload", label: "Submit Invoice", count: stats.invoices, description: "Packages requiring invoice upload", icon: Upload, gradient: "from-orange-500 to-orange-600" },
    { href: "/customer/pre-alerts", label: "Pre-Alerts", count: stats.preAlerts, description: "Pre-alerts submitted by me", icon: Bell, gradient: "from-yellow-500 to-yellow-600" },
    { href: "/customer/packages", label: "Packages", count: stats.totalPackages, description: "Track and manage your packages", icon: Package, gradient: "from-indigo-500 to-indigo-600" },
    { href: "/customer/bills", label: "Bills", count: stats.pendingBills, description: "View and pay your bills", icon: Receipt, gradient: "from-cyan-500 to-cyan-600" },
    { href: "/customer/payments", label: "Payments", count: stats.payments, description: "View payment history", icon: CreditCard, gradient: "from-green-500 to-green-600" },
    { href: "/customer/messages", label: "Messages", count: stats.unreadMessages, description: "Communication center", icon: MessageSquare, gradient: "from-pink-500 to-pink-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" /><p className="text-sm text-red-800">{error}</p></div>
            <button onClick={() => loadStats(true)} className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700">Retry</button>
          </div>
        )}

        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 admin-header p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">Welcome, {userName}</h1>
                  <p className="text-gray-300-custom mt-1">
                    {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Your account overview"}
                  </p>
                </div>
              </div>
              <button onClick={() => loadStats(true)} disabled={loading} className="group flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2.5 font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg disabled:opacity-50 text-sm">
                <RefreshCw className={`h-4 w-4 transition-transform text-gray-600 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {/* Key Metrics */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="admin-section-header px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Activity className="w-5 h-5" />Account Overview</h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg"><span className="text-white text-sm font-medium">Live Data</span></div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Wallet */}
              <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-10 blur-2xl transition-all group-hover:opacity-20"></div>
                <div className="relative">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg transition-transform group-hover:scale-110">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Wallet Balance</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(stats.walletBalance)}</p>
                </div>
              </div>
              {/* Total Packages */}
              <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 opacity-10 blur-2xl transition-all group-hover:opacity-20"></div>
                <div className="relative">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg transition-transform group-hover:scale-110">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Total Packages</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalPackages}</p>
                </div>
              </div>
              {/* Pending Bills */}
              <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-red-500 to-pink-600 opacity-10 blur-2xl transition-all group-hover:opacity-20"></div>
                <div className="relative">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-pink-600 shadow-lg transition-transform group-hover:scale-110">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Pending Bills</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stats.pendingBills}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="admin-section-header px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Activity className="w-5 h-5" />Quick Access</h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href} className="group relative overflow-hidden rounded-xl bg-white p-6 text-left shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-2xl transition-all group-hover:opacity-20`}></div>
                    <div className="relative">
                      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient} shadow-lg transition-transform group-hover:scale-110`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900">{card.label}</h4>
                        <span className="text-2xl font-bold text-gray-900">{card.count}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{card.description}</p>
                      <ChevronRight className="mt-2 h-5 w-5 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-gray-600" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shipping Addresses */}
        {shippingAddresses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="admin-section-header px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2"><MapPin className="w-5 h-5" />Shipping Addresses</h2>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-white text-sm font-medium">{shippingAddresses.length} {shippingAddresses.length === 1 ? "Address" : "Addresses"}</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {shippingAddresses.map((address: any, index: number) => (
                  <div key={index} className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className={`absolute right-0 top-0 h-24 w-24 rounded-full opacity-10 blur-2xl ${address.type?.toLowerCase() === "sea" ? "bg-gradient-to-br from-cyan-500 to-blue-600" : address.type?.toLowerCase() === "china" ? "bg-gradient-to-br from-red-500 to-orange-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}></div>
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg shadow-lg ${address.type?.toLowerCase() === "sea" ? "bg-gradient-to-br from-cyan-500 to-blue-600" : address.type?.toLowerCase() === "china" ? "bg-gradient-to-br from-red-500 to-orange-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                          {address.type?.toLowerCase() === "sea" ? <Ship className="h-6 w-6 text-white" /> : address.type?.toLowerCase() === "china" ? <span className="text-xl">🇨🇳</span> : <Plane className="h-6 w-6 text-white" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 capitalize">{address.type || "Shipping"} Address</h3>
                          <p className="text-sm text-gray-500">Clean J Shipping</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" /><p className="text-gray-700 font-medium">{address.street}</p></div>
                        {address.city && <div className="flex items-center gap-2 text-gray-600"><span className="text-gray-400">City:</span><span>{address.city}</span></div>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                          {address.state && <span>{address.state}</span>}
                          {address.zipCode && <span className="font-mono">{address.zipCode}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
