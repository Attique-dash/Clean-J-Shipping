// src/app/customer/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
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
  Ship
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

interface PackageData {
  id: string;
  status: string;
  tracking_number?: string;
  destination?: string;
  [key: string]: unknown;
}

interface BillData {
  id: string;
  payment_status: string;
  invoice_number?: string;
  amount_due?: number;
  tracking_number?: string;
  [key: string]: unknown;
}

export default function CustomerDashboardPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<Stats>({
    totalPackages: 0,
    pendingBills: 0,
    unreadMessages: 0,
    walletBalance: 0,
    preAlerts: 0,
    payments: 0,
    invoices: 0,
  });
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      loadStats();
    } else if (session === null) {
      setLoading(false);
    } else if (session === undefined) {
      return;
    }
  }, [session]);

  async function loadStats() {
    try {
      // Packages
      const packagesRes = await fetch("/api/customer/packages", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });
      if (!packagesRes.ok) throw new Error("Failed to fetch packages");
      const packagesData = await packagesRes.json();
      const packages = packagesData?.packages || [];

      // Bills
      let bills: BillData[] = [];
      const billsRes = await fetch("/api/customer/bills", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        bills = billsData?.bills || [];
      }

      // Messages
      let unreadMessagesCount = 0;
      try {
        const messagesRes = await fetch("/api/customer/messages", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          const messages = messagesData?.messages || [];
          unreadMessagesCount = messages.filter((m: any) => !m.read || !m.viewedAt).length;
        }
      } catch (err) {
        console.error("Error loading messages count:", err);
      }

      // Pre-alerts
      let preAlertsCount = 0;
      try {
        const preAlertsRes = await fetch("/api/customer/pre-alerts", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        if (preAlertsRes.ok) {
          const preAlertsData = await preAlertsRes.json();
          preAlertsCount = preAlertsData?.pre_alerts?.length || 0;
        }
      } catch (err) {
        console.error("Error loading pre-alerts count:", err);
      }

      // Payments
      let paymentsCount = 0;
      try {
        const paymentsRes = await fetch("/api/customer/payments", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          paymentsCount = paymentsData?.payments?.length || 0;
        }
      } catch (err) {
        console.error("Error loading payments count:", err);
      }

      // Invoices needed (Submit Required Invoice)
      let invoicesCount = 0;
      try {
        const invoiceUploadRes = await fetch("/api/customer/invoice-upload", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        if (invoiceUploadRes.ok) {
          const invoiceUploadData = await invoiceUploadRes.json();
          const pkgs = invoiceUploadData?.packages || [];
          invoicesCount = pkgs.filter(
            (p: any) =>
              p.invoiceStatus !== "submitted" &&
              p.invoiceStatus !== "billed" &&
              p.invoiceStatus !== "approved"
          ).length;
        }
      } catch (err) {
        console.error("Error loading invoice count:", err);
      }

      // Shipping addresses
      try {
        const profileRes = await fetch("/api/customer/profile", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.success && profileData.data?.shippingAddresses) {
            setShippingAddresses(profileData.data.shippingAddresses);
          }
        }
      } catch (err) {
        console.error("Error loading shipping addresses:", err);
      }

      // Wallet balance = sum of unpaid bills
      const walletBalance = bills
        .filter((b: BillData) => b.payment_status === "submitted" || b.payment_status === "none")
        .reduce((sum: number, b: BillData) => sum + (b.amount_due || 0), 0);

      setStats({
        totalPackages: packages.length,
        pendingBills: bills.filter(
          (b: BillData) => b.payment_status === "submitted" || b.payment_status === "none"
        ).length,
        unreadMessages: unreadMessagesCount,
        walletBalance,
        preAlerts: preAlertsCount,
        payments: paymentsCount,
        invoices: invoicesCount,
      });
    } catch (err) {
      console.error("Error loading stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      setStats({
        totalPackages: 0,
        pendingBills: 0,
        unreadMessages: 0,
        walletBalance: 0,
        preAlerts: 0,
        payments: 0,
        invoices: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access your dashboard</p>
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

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";

  // Simple, clean stat card list - matches the reference site's
  // "icon + title + count + one-line description" pattern
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
      description: "Packages not yet picked up",
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadStats();
              }}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Hello, {userName}
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s a quick look at your account</p>
        </div>

        {/* Wallet Balance + Local Branch - simple two-card row, like the reference site */}
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

        {/* Stat Cards - single clean grid, simplified from the previous 3-column layout */}
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

        {/* Shipping Addresses - simplified, matches reference's clean address cards */}
       {shippingAddresses.length > 0 && (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-sm">
          <Package className="h-5 w-5 text-white" />
        </div>
        Your Shipping Addresses
        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {shippingAddresses.length} {shippingAddresses.length === 1 ? 'Address' : 'Addresses'}
        </span>
      </h2>
      
      {/* Delivery notice with airplane and China flag */}
      <div className="hidden md:flex items-center gap-2 text-sm bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
        <span className="text-yellow-600 text-base">🇨🇳</span>
        <span className="text-gray-600">Shipping from China</span>
        <Plane className="h-3.5 w-3.5 text-blue-500" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {shippingAddresses.map((address: any, index: number) => (
        <div
          key={index}
          className="group relative bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 transform rotate-45 translate-x-4 -translate-y-4"></div>
          </div>
          
          {/* Address header with type badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 capitalize">
                {address.type || 'Shipping'} Address
              </h3>
            </div>
            
            {/* China flag indicator */}
            <div className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
              <span className="text-sm">🇨🇳</span>
              <span className="text-gray-500">CN</span>
            </div>
          </div>
          
          {/* User name */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {userName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-gray-500">Recipient</p>
              <p className="font-semibold text-gray-800">{userName}</p>
            </div>
          </div>
          
          {/* Address details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Home className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-gray-500">Address:</span>
                <p className="text-gray-800 font-medium">{address.street}</p>
              </div>
            </div>
            
            {address.city && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-gray-500">City:</span>
                  <span className="text-gray-700 ml-1">{address.city}</span>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {address.state && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-xs">State/Province:</span>
                  <span className="text-gray-700 text-sm">{address.state}</span>
                </div>
              )}
              
              {address.zipCode && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-xs">Postal Code:</span>
                  <span className="text-gray-700 text-sm font-mono">{address.zipCode}</span>
                </div>
              )}
            </div>
            
            {/* Country with flag */}
            <div className="flex items-center gap-2 pt-2 mt-1 border-t border-gray-50">
              <span className="text-lg">🇨🇳</span>
              <span className="text-sm text-gray-600">China</span>
              <Ship className="h-3.5 w-3.5 text-gray-400 ml-auto" />
            </div>
          </div>
          
          {/* Hover effect shipping indicator */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
              <Plane className="h-3 w-3" />
              <span>Ready to ship</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Global shipping notice banner */}
    <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xl">🇨🇳</span>
          <Plane className="h-4 w-4 text-blue-500 mx-1" />
          <span className="text-xl">🌍</span>
        </div>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">International Shipping</span> — All orders ship from our warehouse in China
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Ship className="h-3.5 w-3.5" />
        <span>Delivery worldwide</span>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}