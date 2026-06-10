// src/app/customer/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Package, FileText, Bell, CheckCircle, AlertCircle, Loader2, MapPin, DollarSign, Home, CreditCard } from "lucide-react";
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
      // Load packages
      const packagesRes = await fetch("/api/customer/packages", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });

      if (!packagesRes.ok) {
        throw new Error("Failed to fetch packages");
      }

      const packagesData = await packagesRes.json();
      const packages = packagesData?.packages || [];
      
      // Load bills
      const billsRes = await fetch("/api/customer/bills", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });

      let bills = [];
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        bills = billsData?.bills || [];
      }
      
      // Load messages
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
      } catch (error) {
        console.error("Error loading messages count:", error);
      }

      // Load pre-alerts
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
          preAlertsCount = preAlertsData?.preAlerts?.length || 0;
        }
      } catch (error) {
        console.error("Error loading pre-alerts count:", error);
      }

      // Load payments
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
      } catch (error) {
        console.error("Error loading payments count:", error);
      }

      // Load invoices
      let invoicesCount = 0;
      try {
        const invoicesRes = await fetch("/api/customer/invoices", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          invoicesCount = invoicesData?.invoices?.length || 0;
        }
      } catch (error) {
        console.error("Error loading invoices count:", error);
      }

      // Load shipping addresses
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
          if (profileData.success && profileData.data?.authorizedUsers) {
            invoicesCount = profileData.data.authorizedUsers.length || 0;
          }
        }
      } catch (error) {
        console.error("Error loading shipping addresses:", error);
      }

      // Calculate wallet balance (sum of unpaid bills)
      const walletBalance = bills
        .filter((b: BillData) => b.payment_status === 'submitted' || b.payment_status === 'none')
        .reduce((sum: number, b: BillData) => sum + (b.amount_due || 0), 0);

      setStats({
        totalPackages: packages.length,
        pendingBills: bills.filter((b: BillData) => 
          b.payment_status === 'submitted' || b.payment_status === 'none'
        ).length,
        unreadMessages: unreadMessagesCount,
        walletBalance,
        preAlerts: preAlertsCount,
        payments: paymentsCount,
        invoices: invoicesCount,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data";
      setError(errorMessage);
      
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

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                loadStats();
              }}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Welcome Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Hello, {userName}
          </h1>
        </div>

        {/* Wallet Balance and Local Branch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-6 w-6" />
              <h2 className="font-semibold">Your Wallet Balance</h2>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(stats.walletBalance)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Home className="h-6 w-6" />
              <h2 className="font-semibold">Your Local Branch</h2>
            </div>
            <p className="font-medium">Clean J Shipping</p>
            <p className="text-sm opacity-90 mt-1">Kingston, Jamaica</p>
          </div>
        </div>

        {/* Stats Cards - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-y-auto pb-4">
          {/* Column 1: Invoice, Messages */}
          <div className="space-y-4">
            <Link href="/customer/invoice-upload" className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">Submit Required Invoice</span>
                </div>
                <span className="text-2xl font-bold">{stats.invoices}</span>
              </div>
              <p className="text-xs opacity-90 mt-1">packages</p>
            </Link>
            <Link href="/customer/messages" className="bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <span className="text-sm font-medium">Messages</span>
                </div>
                <span className="text-2xl font-bold">{stats.unreadMessages}</span>
              </div>
              <p className="text-xs opacity-90 mt-1">messages</p>
            </Link>
          </div>

          {/* Column 2: Pre-Alerts, Packages, Bills, Payments */}
          <div className="space-y-4">
            <Link href="/customer/pre-alerts" className="bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <span className="text-sm font-medium">Pre-Alert</span>
                </div>
                <span className="text-2xl font-bold">{stats.preAlerts}</span>
              </div>
              <p className="text-xs opacity-90 mt-1">pre-alerts</p>
            </Link>
            <Link href="/customer/packages" className="bg-gradient-to-br from-green-400 to-green-500 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <span className="text-sm font-medium">Packages</span>
                </div>
                <span className="text-2xl font-bold">{stats.totalPackages}</span>
              </div>
              <p className="text-xs opacity-90 mt-1">not yet picked up</p>
            </Link>
            <Link href="/customer/bills" className="bg-gradient-to-br from-red-400 to-red-500 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">Bills/Transactions</span>
                </div>
                <span className="text-2xl font-bold">{stats.pendingBills}</span>
              </div>
              <p className="text-xs opacity-90 mt-1">items</p>
            </Link>
            <Link href="/customer/payments" className="bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  <span className="text-sm font-medium">Payments</span>
                </div>
                <span className="text-2xl font-bold">{stats.payments}</span>
              </div>
              <p className="text-xs opacity-90 mt-1">payments</p>
            </Link>
          </div>

          {/* Column 3: Shipping Addresses */}
          <div className="space-y-4">
            {shippingAddresses.length > 0 ? (
              shippingAddresses.map((address: any, index: number) => (
                <div key={index} className="bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-xl p-4 text-white shadow-lg">
                  <h3 className="font-semibold mb-2 capitalize flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {address.type} Address
                  </h3>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium opacity-90">Name:</span> {userName}</p>
                    <p><span className="font-medium opacity-90">Address 1:</span> {address.street}</p>
                    {address.city && <p><span className="font-medium opacity-90">City:</span> {address.city}</p>}
                    {address.state && <p><span className="font-medium opacity-90">State/Province:</span> {address.state}</p>}
                    {address.zipCode && <p><span className="font-medium opacity-90">Zip/Postal Code:</span> {address.zipCode}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl p-4 text-white shadow-lg">
                <p className="text-sm">No shipping addresses configured</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
