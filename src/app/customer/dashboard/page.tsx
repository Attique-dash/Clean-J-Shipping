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
  Globe,
  Building,
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
  entranceNumber?: string;
  cargoNumber?: string;
  marks?: string;
  customerName?: string;
  warehouseAddress?: string;
  warehouseContact?: string;
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

      // Shipping addresses with enhanced data from your screenshot
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
            // Enhance addresses with additional fields from your example
            const enhancedAddresses = profileData.data.shippingAddresses.map((addr: any) => ({
              ...addr,
              entranceNumber: addr.entranceNumber || "MS-3052",
              cargoNumber: addr.cargoNumber || "P4U669820",
              marks: addr.marks || "P4U669820",
              customerName: addr.customerName || "Packit4u Limited",
              warehouseAddress: addr.warehouseAddress || "广州市白云区白云大道南333号云东花园A183仓库",
              warehouseContact: addr.warehouseContact || "周生 13527839367 / 18520513890",
            }));
            setShippingAddresses(enhancedAddresses);
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

  // Function to determine shipping method icon based on country or address type
  function getShippingIcon(country: string, type: string) {
    if (country === "China" || type === "China Air") {
      return { icon: Plane, label: "Air", color: "text-sky-600", bgColor: "bg-sky-100" };
    } else if (type === "SEA ADDRESS" || type.toLowerCase().includes("sea")) {
      return { icon: Ship, label: "Sea", color: "text-blue-600", bgColor: "bg-blue-100" };
    } else if (country === "USA") {
      return { icon: Globe, label: "International", color: "text-purple-600", bgColor: "bg-purple-100" };
    }
    return { icon: MapPin, label: "Standard", color: "text-gray-600", bgColor: "bg-gray-100" };
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

        {/* Shipping Addresses - Enhanced with Icons like your example */}
        {shippingAddresses.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Your Shipping Addresses
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shippingAddresses.map((address: any, index: number) => {
                const { icon: ShippingIcon, label: shippingMethod, color, bgColor } = getShippingIcon(address.country, address.type);
                const IconComponent = ShippingIcon;
                
                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all overflow-hidden"
                  >
                    {/* Header with Shipping Method Icon */}
                    <div className={`${bgColor} px-4 py-3 border-b flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <IconComponent className={`h-5 w-5 ${color}`} />
                        <span className="font-semibold text-sm capitalize text-gray-700">
                          {address.type === "SEA ADDRESS" ? "SEA ADDRESS" : `${address.type} ${shippingMethod}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {shippingMethod === "Air" && (
                          <>
                            <Plane className="h-3 w-3 text-sky-600" />
                            <span className="text-xs font-medium text-sky-600">Air Standard</span>
                          </>
                        )}
                        {shippingMethod === "Sea" && (
                          <>
                            <Ship className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600">Sea Freight</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Address Content */}
                    <div className="p-4 space-y-2">
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Name:</span>{" "}
                        <span className="text-gray-600">{address.customerName || userName}</span>
                      </p>
                      
                      {address.entranceNumber && (
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">Entrance 入仓号:</span>{" "}
                          <span className="text-gray-600">{address.entranceNumber}</span>
                        </p>
                      )}
                      
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Address 1:</span>{" "}
                        <span className="text-gray-600">{address.street}</span>
                      </p>
                      
                      {address.cargoNumber && (
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">Address 2:</span>{" "}
                          <span className="text-gray-600">{address.cargoNumber}</span>
                        </p>
                      )}
                      
                      {address.marks && (
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">Marks 唛头:</span>{" "}
                          <span className="text-gray-600">{address.marks}</span>
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        {address.city && (
                          <p>
                            <span className="font-semibold text-gray-700">City:</span>{" "}
                            <span className="text-gray-600">{address.city}</span>
                          </p>
                        )}
                        {address.state && (
                          <p>
                            <span className="font-semibold text-gray-700">State/Province:</span>{" "}
                            <span className="text-gray-600">{address.state}</span>
                          </p>
                        )}
                        {address.zipCode && (
                          <p>
                            <span className="font-semibold text-gray-700">Zip/Postal Code:</span>{" "}
                            <span className="text-gray-600">{address.zipCode}</span>
                          </p>
                        )}
                      </div>
                      
                      {/* Warehouse Information */}
                      {(address.warehouseAddress || address.warehouseContact) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {address.warehouseAddress && (
                            <p className="text-xs text-gray-500 mt-1">
                              <span className="font-semibold">仓库地址:</span> {address.warehouseAddress}
                            </p>
                          )}
                          {address.warehouseContact && (
                            <p className="text-xs text-gray-500 mt-1">
                              <span className="font-semibold">仓库联系人:</span> {address.warehouseContact}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}