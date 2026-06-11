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
  Ship,
  Plane,
  Building,
  Mail,
  Phone,
  Clock,
  TrendingUp,
  CheckCircle,
  Loader2,
  Receipt 
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
  shippingMethod?: "sea" | "air" | "express" | "standard";
  warehouse?: string;
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
  const [recentPackages, setRecentPackages] = useState<PackageData[]>([]);

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
      setRecentPackages(packages.slice(0, 3));

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

      // Invoices needed
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

      // Shipping addresses with enhanced data
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
            // Enhance addresses with shipping method suggestions
            const enhancedAddresses = profileData.data.shippingAddresses.map((addr: any) => ({
              ...addr,
              shippingMethod: addr.country === "China" ? "air" : 
                             addr.country === "USA" ? "express" : "sea",
              warehouse: getWarehouseForCountry(addr.country)
            }));
            setShippingAddresses(enhancedAddresses);
          }
        }
      } catch (err) {
        console.error("Error loading shipping addresses:", err);
      }

      // Wallet balance
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

  function getWarehouseForCountry(country: string): string {
    const warehouses: Record<string, string> = {
      "China": "Guangzhou Warehouse",
      "USA": "New York Warehouse", 
      "Jamaica": "Kingston Hub",
      "UK": "London Warehouse",
      "Canada": "Toronto Warehouse"
    };
    return warehouses[country] || "Global Warehouse";
  }

  function getShippingMethodIcon(method?: string) {
    switch(method) {
      case "air":
        return <Plane className="h-5 w-5 text-sky-500" />;
      case "sea":
        return <Ship className="h-5 w-5 text-blue-600" />;
      case "express":
        return <TrendingUp className="h-5 w-5 text-purple-500" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  }

  function getShippingMethodColor(method?: string) {
    switch(method) {
      case "air":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "sea":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "express":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl max-w-md">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-10 w-10 text-blue-600" />
          </div>
          <p className="text-gray-600 mb-6">Please log in to access your dashboard</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
          >
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
      description: "Packages requiring invoice submission",
      icon: FileText,
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "bg-gradient-to-br from-orange-50 to-orange-100",
      iconBg: "bg-orange-100",
      textColor: "text-orange-700"
    },
    {
      href: "/customer/pre-alerts",
      label: "Pre-Alerts",
      count: stats.preAlerts,
      description: "Packages waiting for processing",
      icon: Bell,
      gradient: "from-teal-500 to-teal-600",
      bgGradient: "bg-gradient-to-br from-teal-50 to-teal-100",
      iconBg: "bg-teal-100",
      textColor: "text-teal-700"
    },
    {
      href: "/customer/packages",
      label: "Active Packages",
      count: stats.totalPackages,
      description: "Packages in transit",
      icon: Package,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-700"
    },
    {
      href: "/customer/bills",
      label: "Pending Bills",
      count: stats.pendingBills,
      description: "Ready for payment",
      icon: CreditCard,
      gradient: "from-red-500 to-red-600",
      bgGradient: "bg-gradient-to-br from-red-50 to-red-100",
      iconBg: "bg-red-100",
      textColor: "text-red-700"
    },
    {
      href: "/customer/payments",
      label: "Payment History",
      count: stats.payments,
      description: "Completed transactions",
      icon: DollarSign,
      gradient: "from-indigo-500 to-indigo-600",
      bgGradient: "bg-gradient-to-br from-indigo-50 to-indigo-100",
      iconBg: "bg-indigo-100",
      textColor: "text-indigo-700"
    },
    {
      href: "/customer/messages",
      label: "Messages",
      count: stats.unreadMessages,
      description: "Unread communications",
      icon: MessageSquare,
      gradient: "from-pink-500 to-pink-600",
      bgGradient: "bg-gradient-to-br from-pink-50 to-pink-100",
      iconBg: "bg-pink-100",
      textColor: "text-pink-700"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadStats();
              }}
              className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Welcome back, {userName}
              </h1>
              <p className="text-slate-500 mt-2">Track your shipments and manage your account</p>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Wallet Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl p-2">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-white font-semibold">Wallet Balance</h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-4xl font-bold text-slate-800">{formatCurrency(stats.walletBalance)}</p>
              <p className="text-sm text-slate-500 mt-2">Available for shipping and services</p>
              <Link 
                href="/customer/wallet"
                className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add Funds →
              </Link>
            </div>
          </div>

          {/* Branch Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl p-2">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-white font-semibold">Local Branch</h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-lg font-semibold text-slate-800">Clean J Shipping</p>
              <p className="text-slate-600">Kingston, Jamaica</p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-slate-500">
                  <Phone className="h-3 w-3" />
                  +1 (876) 123-4567
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Mail className="h-3 w-3" />
                  support@cleanjshipping.com
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`${card.bgGradient} rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all group`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`${card.iconBg} rounded-lg p-2`}>
                      <Icon className={`h-5 w-5 ${card.textColor}`} />
                    </div>
                    <span className={`text-2xl font-bold ${card.textColor}`}>{card.count}</span>
                  </div>
                  <div className="mt-3">
                    <p className="font-medium text-slate-800 text-sm">{card.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{card.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Packages & Shipping Addresses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Packages */}
          {recentPackages.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Recent Packages
              </h2>
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {recentPackages.map((pkg, idx) => (
                  <div key={pkg.id} className={`p-4 ${idx !== recentPackages.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{pkg.tracking_number || `Package ${pkg.id.slice(-6)}`}</p>
                        <p className="text-sm text-slate-500 mt-1">Status: {pkg.status || "In Transit"}</p>
                      </div>
                      <Link 
                        href={`/customer/packages/${pkg.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Track →
                      </Link>
                    </div>
                  </div>
                ))}
                <div className="bg-slate-50 px-4 py-3">
                  <Link href="/customer/packages" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All Packages →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Shipping Addresses - Enhanced */}
          {shippingAddresses.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Your Shipping Addresses
              </h2>
              <div className="space-y-4">
                {shippingAddresses.map((address, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all overflow-hidden"
                  >
                    <div className={`${getShippingMethodColor(address.shippingMethod)} px-4 py-2 border-b flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        {getShippingMethodIcon(address.shippingMethod)}
                        <span className="font-semibold text-sm capitalize">
                          {address.type} Address
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {address.shippingMethod === "air" && (
                          <>
                            <Plane className="h-3 w-3" />
                            <span>Express Air Shipping</span>
                          </>
                        )}
                        {address.shippingMethod === "sea" && (
                          <>
                            <Ship className="h-3 w-3" />
                            <span>Ocean Freight</span>
                          </>
                        )}
                        {address.shippingMethod === "express" && (
                          <>
                            <TrendingUp className="h-3 w-3" />
                            <span>Express Delivery</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium text-slate-600">Recipient:</span> {userName}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium text-slate-600">Address:</span> {address.street}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {address.city && (
                            <p><span className="font-medium text-slate-600">City:</span> {address.city}</p>
                          )}
                          {address.state && (
                            <p><span className="font-medium text-slate-600">State:</span> {address.state}</p>
                          )}
                          {address.zipCode && (
                            <p><span className="font-medium text-slate-600">ZIP:</span> {address.zipCode}</p>
                          )}
                          {address.country && (
                            <p><span className="font-medium text-slate-600">Country:</span> {address.country}</p>
                          )}
                        </div>
                        {address.warehouse && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-600">Warehouse: </span>
                              <span className="font-medium text-slate-700">{address.warehouse}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                        <button className="flex-1 text-sm bg-slate-50 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                          Edit
                        </button>
                        <button className="flex-1 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                          Set as Default
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-slate-500">On-Time Delivery</p>
            <p className="text-sm font-semibold text-slate-700">98.5%</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
            <div className="flex items-center justify-center mb-1">
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs text-slate-500">Total Shipments</p>
            <p className="text-sm font-semibold text-slate-700">{stats.totalPackages}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-slate-500">Total Spent</p>
            <p className="text-sm font-semibold text-slate-700">{formatCurrency(stats.walletBalance * 2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-xs text-slate-500">Active Shipments</p>
            <p className="text-sm font-semibold text-slate-700">{stats.preAlerts}</p>
          </div>
        </div>
      </div>
    </div>
  );
}