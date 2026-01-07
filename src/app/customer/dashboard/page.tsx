// src/app/customer/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Package, TrendingUp, FileText, Bell, ChevronRight, Clock, CheckCircle, AlertCircle, Loader2, MapPin, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCurrency } from "@/contexts/CurrencyContext";

const PackageTracker = dynamic(() => import("@/components/tracking/PackageTracker"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
    </div>
  ),
});

interface Stats {
  totalPackages: number;
  activeShipments: number;
  pendingBills: number;
  unreadMessages: number;
}

interface PackageData {
  id: string;
  status: string;
  tracking_number?: string;
  destination?: string;
  [key: string]: any;
}

interface BillData {
  id: string;
  payment_status: string;
  invoice_number?: string;
  amount_due?: number;
  tracking_number?: string;
  [key: string]: any;
}

export default function CustomerDashboardPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<Stats>({
    totalPackages: 0,
    activeShipments: 0,
    pendingBills: 0,
    unreadMessages: 0,
  });
  const [recentPackages, setRecentPackages] = useState<PackageData[]>([]);
  const [upcomingShipments, setUpcomingShipments] = useState<PackageData[]>([]);
  const [pendingPayments, setPendingPayments] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [showTracker, setShowTracker] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      loadStats();
      
      // Check for auto-fill tracking number from sessionStorage
      const savedTrackingNumber = sessionStorage.getItem('trackingNumber');
      if (savedTrackingNumber) {
        setTrackingNumber(savedTrackingNumber);
        // Clear it after using
        sessionStorage.removeItem('trackingNumber');
      }
    } else if (session === null) {
      // Session is explicitly null (not undefined), user is not authenticated
      setLoading(false);
    } else if (session === undefined) {
      // Session is undefined, wait for it to load
      return;
    }
  }, [session]);

  async function loadStats() {
    try {
      console.log('Loading stats for user:', session?.user?.email);
      
      // Load packages with proper authentication
      const packagesRes = await fetch("/api/customer/packages", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        cache: "no-store", // Prevent caching to get fresh data
      });

      console.log('Packages API response status:', packagesRes.status);

      if (!packagesRes.ok) {
        const errorData = await packagesRes.json();
        console.error("Packages API error:", errorData);
        
        // Show specific error message based on status
        if (packagesRes.status === 401) {
          throw new Error("Please log in to view your packages");
        } else if (packagesRes.status === 403) {
          throw new Error("You don't have permission to access these packages");
        } else if (packagesRes.status >= 500) {
          throw new Error("Server error. Please try again later");
        } else {
          throw new Error(errorData?.error || `Failed to fetch packages: ${packagesRes.status}`);
        }
      }

      const packagesData = await packagesRes.json();
      const packages = packagesData?.packages || [];
      
      // Load bills with proper authentication
      const billsRes = await fetch("/api/customer/bills", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      let bills = [];
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        bills = billsData?.bills || [];
      } else {
        console.warn("Bills API error, but continuing:", billsRes.status);
      }
      
      setStats({
        totalPackages: packages.length,
        activeShipments: packages.filter((p: PackageData) => 
          p.status === 'in_transit' || p.status === 'ready_for_pickup'
        ).length,
        pendingBills: bills.filter((b: BillData) => 
          b.payment_status === 'submitted' || b.payment_status === 'none'
        ).length,
        unreadMessages: 0,
      });

      // Set recent packages (latest 3)
      setRecentPackages(packages.slice(0, 3));
      
      // Set upcoming shipments (in transit or ready for pickup, latest 5)
      setUpcomingShipments(
        packages
          .filter((p: PackageData) => 
            p.status === 'in_transit' || p.status === 'ready_for_pickup'
          )
          .slice(0, 5)
      );
      
      // Set pending payments (latest 5)
      setPendingPayments(
        bills
          .filter((b: BillData) => 
            b.payment_status === 'submitted' || b.payment_status === 'none'
          )
          .slice(0, 5)
      );
    } catch (error) {
      console.error("Error loading stats:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data";
      setError(errorMessage);
      
      // Set default values on error to prevent UI crashes
      setStats({
        totalPackages: 0,
        activeShipments: 0,
        pendingBills: 0,
        unreadMessages: 0,
      });
      setRecentPackages([]);
      setUpcomingShipments([]);
      setPendingPayments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleTrackPackage() {
    if (!trackingNumber.trim()) {
      setTrackingError("Please enter a tracking number");
      return;
    }

    setTrackingError(null);
    setShowTracker(true);
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'delivered':
        return {
          label: 'Delivered',
          icon: CheckCircle,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          badgeColor: 'bg-green-100 text-green-800'
        };
      case 'in_transit':
        return {
          label: 'In Transit',
          icon: TrendingUp,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          badgeColor: 'bg-blue-100 text-blue-800'
        };
      case 'ready_for_pickup':
        return {
          label: 'Ready',
          icon: AlertCircle,
          bgColor: 'bg-orange-100',
          iconColor: 'text-orange-600',
          badgeColor: 'bg-orange-100 text-orange-800'
        };
      default:
        return {
          label: 'Processing',
          icon: Clock,
          bgColor: 'bg-gray-100',
          iconColor: 'text-gray-600',
          badgeColor: 'bg-gray-100 text-gray-800'
        };
    }
  };

  // Show loading while checking authentication
  if (loading && session === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not authenticated and not loading
  if (!session && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access your customer dashboard</p>
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Animated Background Pattern */}
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setError(null);
                      loadStats();
                    }}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header Section */}
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Package className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-tight md:text-3xl">Dashboard</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Last updated: Just now
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                        Data Loaded
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Real-Time Tracking Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Real-Time Package Tracking
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && trackingNumber.trim()) {
                        handleTrackPackage();
                      }
                    }}
                    placeholder="Enter Package ID / Tracking Number"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleTrackPackage}
                    disabled={!trackingNumber.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <MapPin className="h-5 w-5" />
                    Track
                  </button>
                  {showTracker && (
                    <button
                      onClick={() => {
                        setShowTracker(false);
                        setTrackingNumber("");
                        setTrackingError(null);
                      }}
                      className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
              
              {trackingError && (
                <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-800">{trackingError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Package Tracker Display */}
          {showTracker && trackingNumber && (
            <PackageTracker
              trackingNumber={trackingNumber.trim()}
              onClose={() => {
                setShowTracker(false);
                setTrackingNumber("");
                setTrackingError(null);
              }}
            />
          )}

          {/* Stats Grid */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Overview Statistics
              </h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Packages"
                  value={stats.totalPackages}
                  icon={Package}
                  color="blue"
                  href="/customer/packages"
                />
                <StatCard
                  title="Active Shipments"
                  value={stats.activeShipments}
                  icon={TrendingUp}
                  color="orange"
                  href="/customer/packages"
                />
                <StatCard
                  title="Pending Bills"
                  value={stats.pendingBills}
                  icon={FileText}
                  color="blue"
                  href="/customer/bills"
                />
                <StatCard
                  title="Messages"
                  value={stats.unreadMessages}
                  icon={Bell}
                  color="green"
                  href="/customer/messages"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity - Upcoming Shipments */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8]">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Upcoming Shipments
                </h3>
              </div>
              <div className="p-6">
                {upcomingShipments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingShipments.map((pkg, index) => {
                      const statusInfo = getStatusInfo(pkg.status);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <div
                          key={pkg.id || `upcoming-${index}`}
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 transition-all duration-200 border border-gray-200"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
                              <StatusIcon className={`h-5 w-5 ${statusInfo.iconColor}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {pkg.tracking_number || pkg.id}
                              </p>
                              <p className="text-sm text-gray-600">
                                {pkg.destination || 'Destination not set'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.badgeColor}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No upcoming shipments</p>
                    <p className="text-sm text-gray-400 mt-1">Your active shipments will appear here</p>
                  </div>
                )}
                <Link
                  href="/customer/packages"
                  className="mt-6 w-full py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                >
                  View All Packages
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#E67919] to-[#f59e42]">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Pending Payments
                </h3>
              </div>
              <div className="p-6">
                {pendingPayments.length > 0 ? (
                  <div className="space-y-3">
                    {pendingPayments.map((bill, index) => (
                      <Link
                        key={bill.id || `pending-${index}`}
                        href="/customer/bills"
                        className="block p-3 rounded-lg border-2 border-gray-200 hover:border-[#E67919] hover:bg-orange-50 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {bill.invoice_number || 'Invoice'}
                          </p>
                          <span className="text-xs font-medium text-[#E67919]">
                            {typeof bill.amount_due === 'number' 
                              ? formatCurrency(bill.amount_due)
                              : 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {bill.tracking_number || 'No tracking'}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">All payments up to date</p>
                  </div>
                )}
                <Link
                  href="/customer/bills"
                  className="mt-4 w-full py-2.5 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center text-sm"
                >
                  View All Bills
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Packages Section */}
          {recentPackages.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#0891b2] to-[#06b6d4]">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Recent Activity
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentPackages.map((pkg, index) => {
                    const statusInfo = getStatusInfo(pkg.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div
                        key={pkg.id || `recent-${index}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 transition-all duration-200 border border-gray-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
                            <StatusIcon className={`h-5 w-5 ${statusInfo.iconColor}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {pkg.tracking_number || pkg.id}
                            </p>
                            <p className="text-sm text-gray-600">
                              {pkg.destination || 'Destination not set'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.badgeColor}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Banner */}
          <div className="bg-gradient-to-r from-[#0f4d8a] via-[#1e6bb8] to-[#E67919] rounded-2xl p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-xl font-bold mb-2">Need help with shipping?</h3>
                <p className="text-blue-100">Our support team is available 24/7 to assist you</p>
              </div>
              <Link
                href="/customer/support"
                className="bg-white text-[#0f4d8a] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: number;
  icon: any;
  color: "blue" | "orange" | "green";
  href: string;
}) {
  const gradient = color === "blue" 
    ? "from-blue-500 to-cyan-600" 
    : color === "orange" 
    ? "from-orange-500 to-red-600"
    : "from-emerald-500 to-teal-600";
  
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </Link>
  );
}