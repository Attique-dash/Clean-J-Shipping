// src/app/customer/dashboard/page.tsx
// Optimized: uses single aggregated API endpoint + sessionStorage caching + instant UI

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Package,
  FileText,
  Bell,
  AlertCircle,
  MapPin,
  DollarSign,
  Home,
  CreditCard,
  MessageSquare,
  Plane,
  Ship,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Stats {
  totalPackages: number;
  pendingBills: number;
  unreadMessages: number;
  walletBalance: number;
  preAlerts: number;
  payments: number;
  invoices: number;
}

interface ShippingAddress {
  type: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const CACHE_KEY = "customer_dashboard_cache";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export default function CustomerDashboardPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<Stats>({
    totalPackages: 0, pendingBills: 0, unreadMessages: 0,
    walletBalance: 0, preAlerts: 0, payments: 0, invoices: 0,
  });
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const loadStats = useCallback(async (forceRefresh = false) => {
    // Check cache first (instant UI)
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL && data?.stats) {
            setStats(data.stats);
            setShippingAddresses(data.shippingAddresses || []);
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
      const res = await fetch("/api/customer/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load dashboard");

      setStats(data.stats || {
        totalPackages: 0, pendingBills: 0, unreadMessages: 0,
        walletBalance: 0, preAlerts: 0, payments: 0, invoices: 0,
      });
      setShippingAddresses(data.shippingAddresses || []);

      // Cache the result
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: { stats: data.stats, shippingAddresses: data.shippingAddresses },
          timestamp: Date.now(),
        }));
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadStats();
    } else if (session === null) {
      setInitialLoad(false);
      setLoading(false);
    }
  }, [session, loadStats]);

  // Show minimal loading only on very first visit (no cache)
  if (initialLoad && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center max-w-md">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-6">Please log in to access your dashboard</p>
          <Link href="/login" className="inline-flex items-center px-6 py-3 bg-[#0f4d8a] text-white rounded-xl hover:shadow-lg font-medium">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";

  const statCards = [
    {
      href: "/customer/invoice-upload",
      label: "Submit Required Invoice",
      count: stats.invoices,
      description: "Packages requiring invoice",
      icon: FileText,
      gradient: "from-orange-400 to-orange-500",
    },
    {
      href: "/customer/pre-alerts",
      label: "Pre-Alerts",
      count: stats.preAlerts,
      description: "Pre-alerts submitted by me",
      icon: Bell,
      gradient: "from-teal-400 to-teal-500",
    },
    {
      href: "/customer/packages",
      label: "Packages",
      count: stats.totalPackages,
      description: "Packages not yet picking up",
      icon: Package,
      gradient: "from-green-400 to-green-500",
    },
    {
      href: "/customer/bills",
      label: "Bills / Transactions",
      count: stats.pendingBills,
      description: "Pay online, schedule deliveries",
      icon: CreditCard,
      gradient: "from-red-400 to-red-500",
    },
    {
      href: "/customer/payments",
      label: "Payments",
      count: stats.payments,
      description: "View all my previous payments",
      icon: DollarSign,
      gradient: "from-indigo-400 to-indigo-500",
    },
    {
      href: "/customer/messages",
      label: "Messages",
      count: stats.unreadMessages,
      description: "All previous messages sent to me",
      icon: MessageSquare,
      gradient: "from-pink-400 to-pink-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => loadStats(true)}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Greeting + Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Hello, {userName}
            </h1>
            <p className="text-gray-500 mt-1">Here&apos;s a quick look at your account</p>
          </div>
          <button
            onClick={() => loadStats(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Wallet Balance + Local Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-6 w-6" />
              <h2 className="font-semibold">Your Wallet Balance</h2>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(stats.walletBalance)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Home className="h-6 w-6" />
              <h2 className="font-semibold">Your Local Branch</h2>
            </div>
            <p className="font-medium">Clean J Shipping</p>
            <p className="text-sm opacity-90 mt-1">Kingston, Jamaica</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow block`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{card.label}</span>
                    </div>
                    <span className="text-2xl font-bold">{card.count}</span>
                  </div>
                  <p className="text-xs opacity-90 mt-2">{card.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Shipping Addresses */}
        {shippingAddresses.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-sm">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                Your Shipping Addresses
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {shippingAddresses.length} {shippingAddresses.length === 1 ? "Address" : "Addresses"}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shippingAddresses.map((address: any, index: number) => (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 transform rotate-45 translate-x-4 -translate-y-4"></div>
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${
                        address.type?.toLowerCase() === "sea"
                          ? "bg-gradient-to-br from-blue-100 to-cyan-100"
                          : address.type?.toLowerCase() === "china"
                          ? "bg-gradient-to-br from-red-100 to-orange-100"
                          : "bg-gradient-to-br from-blue-100 to-cyan-100"
                      }`}>
                        {address.type?.toLowerCase() === "sea" ? (
                          <Ship className="h-4 w-4 text-blue-600" />
                        ) : address.type?.toLowerCase() === "china" ? (
                          <span className="text-xl">🇨🇳</span>
                        ) : (
                          <Plane className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800 capitalize">
                        {address.type || "Shipping"} Address
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {userName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Recipient</p>
                      <p className="font-semibold text-gray-800">{userName}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-1">
                      <span className="text-gray-500">Address:</span>
                      <p className="text-gray-800 font-medium">{address.street}</p>
                    </div>
                    {address.city && (
                      <div className="flex items-start gap-1">
                        <span className="text-gray-500">City:</span>
                        <span className="text-gray-700 ml-1">{address.city}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {address.state && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">State:</span>
                          <span className="text-gray-700 text-sm">{address.state}</span>
                        </div>
                      )}
                      {address.zipCode && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">ZIP:</span>
                          <span className="text-gray-700 text-sm font-mono">{address.zipCode}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                      <span>Ready to ship</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
