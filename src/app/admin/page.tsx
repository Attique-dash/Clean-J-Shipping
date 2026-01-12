"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  CreditCard,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  RefreshCw,
  Download,
  ChevronRight,
  AlertCircle,
  X,
  FileText,
  User,
  Radio,
  Loader2,
  Clock
} from "lucide-react";
import Loading from "@/components/Loading";
import { useCurrency } from "@/contexts/CurrencyContext";
import EnhancedCurrencySelector from "@/components/EnhancedCurrencySelector";

// Type definitions
interface Bill {
  paidAmount?: number;
  balance?: number;
  status?: string;
  [key: string]: unknown;
}

interface PackageData {
  status?: string;
  [key: string]: unknown;
}

interface CustomerData {
  createdAt?: string | number | Date;
  [key: string]: unknown;
}

interface DashboardStats {
  overview: {
    totalRevenue: number;
    revenueGrowth: number;
    totalPackages: number;
    packagesGrowth: number;
    totalCustomers: number;
    customersGrowth: number;
    averageValue: number;
    valueGrowth: number;
    activePackages: number;
    pendingDeliveries: number;
    newCustomersThisMonth: number;
    outstandingPayments: number;
    packagesInCustoms: number;
  };
  packagesByStatus: Array<{
    status: string;
    count: number;
    percentage: string;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    packages: number;
  }>;
  topCustomers: Array<{
    name: string;
    packages: number;
    revenue: number;
  }>;
  packagesByBranch: Array<{
    branch: string;
    count: number;
  }>;
  recentActivity?: Array<{
    title?: string;
    description?: string;
    timestamp?: string;
    icon?: string;
  }>;
  alerts?: Array<{
    id: string;
    type: 'overdue_payment' | 'delayed_delivery' | 'customs_issue' | 'storage_fee' | 'failed_delivery';
    title: string;
    description: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
  }>;
}

// Dynamic imports for charts to avoid SSR issues
const RevenueChart = dynamic(
  () => import('@/components/charts/RevenueChart').then(mod => mod.RevenueChart),
  { ssr: false }
);
const StatusPieChart = dynamic(
  () => import('@/components/charts/StatusPieChart').then(mod => mod.StatusPieChart),
  { ssr: false }
);

// Customer Area Chart Component
const CustomerAreaChart = dynamic(
  () => import('recharts').then((recharts) => {
    const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = recharts;
    const CustomerAreaChartComponent = ({ data }: { data: Array<{ month: string; customers: number }> }) => (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="customers" 
            stroke="#8b5cf6" 
            fillOpacity={1} 
            fill="url(#colorCustomers)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    );
    CustomerAreaChartComponent.displayName = 'CustomerAreaChart';
    return CustomerAreaChartComponent;
  }),
  { ssr: false }
);

interface DashboardStats {
  overview: {
    totalRevenue: number;
    revenueGrowth: number;
    totalPackages: number;
    packagesGrowth: number;
    totalCustomers: number;
    customersGrowth: number;
    averageValue: number;
    valueGrowth: number;
    activePackages: number;
    pendingDeliveries: number;
    newCustomersThisMonth: number;
    outstandingPayments: number;
    packagesInCustoms: number;
  };
  packagesByStatus: Array<{
    status: string;
    count: number;
    percentage: string;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    packages: number;
  }>;
  topCustomers: Array<{
    name: string;
    packages: number;
    revenue: number;
  }>;
  packagesByBranch: Array<{
    branch: string;
    count: number;
  }>;
  recentActivity?: Array<{
    title?: string;
    description?: string;
    timestamp?: string;
    icon?: string;
  }>;
  alerts?: Array<{
    id: string;
    type: 'overdue_payment' | 'delayed_delivery' | 'customs_issue' | 'storage_fee' | 'failed_delivery';
    title: string;
    description: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { selectedCurrency, setSelectedCurrency, convertAmount, formatCurrency: formatCurrencyAmount } = useCurrency();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'customers'>('overview');
  const [chartsLoaded, setChartsLoaded] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [displayAmounts, setDisplayAmounts] = useState<Record<string, string>>({});

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get session token
      const { data: session } = await fetch('/api/auth/session').then(res => res.json());
      
      const response = await fetch(`/api/admin/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.accessToken && { 'Authorization': `Bearer ${session.accessToken}` })
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('Dashboard stats received:', data);
      console.log('Chart data check:', {
        revenueByMonth: data?.revenueByMonth,
        packagesByStatus: data?.packagesByStatus,
        revenueByMonthLength: data?.revenueByMonth?.length,
        packagesByStatusLength: data?.packagesByStatus?.length
      });
      
      if (data.error && data.code === 'MEMORY_ERROR') {
        setError('Data set too large. Please try a shorter time range (7d or 30d).');
        setStats(null);
      } else if (data.error) {
        throw new Error(data.error || `Failed to fetch stats: ${response.statusText}`);
      } else if (!data.overview) {
        // Try to calculate stats from individual endpoints if main endpoint fails
        try {
          const [packagesRes, customersRes, billsRes] = await Promise.all([
            fetch("/api/admin/packages", { cache: "no-store" }),
            fetch("/api/admin/customers", { cache: "no-store" }),
            fetch("/api/admin/bills", { cache: "no-store" })
          ]);
          
          const packagesData = await packagesRes.json();
          const customersData = await customersRes.json();
          const billsData = await billsRes.json();
          
          // Calculate real-time stats from actual data
          const calculatedStats: DashboardStats = {
            overview: {
              totalRevenue: billsData.bills?.reduce((sum: number, bill: Bill) => 
                sum + (bill.paidAmount || 0), 0) || 0,
              revenueGrowth: 0, // Calculate growth if needed
              totalPackages: packagesData.packages?.length || 0,
              packagesGrowth: 0,
              totalCustomers: customersData.items?.length || 0,
              customersGrowth: 0,
              averageValue: packagesData.packages?.length > 0 ? 
                (billsData.bills?.reduce((sum: number, bill: Bill) => sum + (bill.paidAmount || 0), 0) || 0) / packagesData.packages.length : 0,
              valueGrowth: 0,
              activePackages: packagesData.packages?.filter((p: PackageData) => 
                !['delivered', 'cancelled'].includes(p.status?.toLowerCase() || '')
              ).length || 0,
              pendingDeliveries: packagesData.packages?.filter((p: PackageData) => 
                (p.status?.toLowerCase() || '').includes('pending') || 
                (p.status?.toLowerCase() || '').includes('transit')
              ).length || 0,
              newCustomersThisMonth: customersData.items?.filter((c: CustomerData) => {
                const custDate = new Date(c.createdAt || '');
                const thisMonth = new Date();
                return custDate.getMonth() === thisMonth.getMonth() && 
                       custDate.getFullYear() === thisMonth.getFullYear();
              }).length || 0,
              outstandingPayments: billsData.bills?.filter((bill: Bill) => 
                bill.status === 'unpaid'
              ).reduce((sum: number, bill: Bill) => sum + (bill.balance || 0), 0) || 0,
              packagesInCustoms: packagesData.packages?.filter((p: PackageData) => 
                (p.status?.toLowerCase() || '').includes('customs')
              ).length || 0
            },
            packagesByStatus: calculatePackageStatuses(packagesData.packages || []),
            revenueByMonth: calculateRevenueByMonth(billsData.bills || []),
            topCustomers: calculateTopCustomers(billsData.bills || [], customersData.items || []),
            packagesByBranch: calculatePackagesByBranch(packagesData.packages || []),
            recentActivity: [],
            alerts: calculateAlerts(packagesData.packages || [], billsData.bills || [])
          };
          
          setStats(calculatedStats);
          setLastUpdated(new Date());
        } catch (_calculationError) {
          throw new Error('Invalid response format from server - missing overview and failed to calculate');
        }
      } else {
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Helper functions to calculate stats from raw data
  const calculatePackageStatuses = (packages: any[]) => {
    const statusCounts = packages.reduce((acc, pkg) => {
      const status = pkg.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = packages.length;
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count: count as number,
      percentage: total > 0 ? ((count as number / total) * 100).toFixed(1) : '0'
    }));
  };

  const calculateRevenueByMonth = (bills: any[]) => {
    const monthlyRevenue = new Map<string, { revenue: number; packages: number }>();
    
    bills.forEach(bill => {
      const date = new Date(bill.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyRevenue.has(monthKey)) {
        monthlyRevenue.set(monthKey, { revenue: 0, packages: 0 });
      }
      
      const current = monthlyRevenue.get(monthKey)!;
      current.revenue += bill.paidAmount || 0;
      current.packages += 1;
    });
    
    return Array.from(monthlyRevenue.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        packages: data.packages
      }));
  };

  const calculateTopCustomers = (bills: any[], customers: any[]) => {
    const customerRevenue = new Map<string, { name: string; revenue: number; packages: number }>();
    
    bills.forEach(bill => {
      const trackingNumber = bill.trackingNumber;
      if (!customerRevenue.has(trackingNumber)) {
        const customer = customers.find(c => c.userCode === trackingNumber);
        customerRevenue.set(trackingNumber, {
          name: customer ? `${customer.firstName} ${customer.lastName}` : trackingNumber,
          revenue: 0,
          packages: 0
        });
      }
      
      const current = customerRevenue.get(trackingNumber)!;
      current.revenue += bill.paidAmount || 0;
      current.packages += 1;
    });
    
    return Array.from(customerRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const calculatePackagesByBranch = (packages: any[]) => {
    const branchCounts = packages.reduce((acc, pkg) => {
      const branch = pkg.branch || 'Unknown';
      acc[branch] = (acc[branch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(branchCounts).map(([branch, count]) => ({
      branch,
      count: count as number
    }));
  };

  const calculateAlerts = (packages: any[], bills: any[]) => {
    const alerts = [];
    
    const overduePayments = bills.filter(bill => 
      bill.status === 'unpaid' && new Date(bill.dueDate || bill.date) < new Date()
    );
    
    if (overduePayments.length > 0) {
      alerts.push({
        id: 'overdue-payments',
        type: 'overdue_payment' as const,
        title: 'Overdue Payments',
        description: `${overduePayments.length} payments are overdue`,
        count: overduePayments.length,
        severity: 'high' as const
      });
    }
    
    const delayedPackages = packages.filter(pkg => 
      pkg.status?.toLowerCase().includes('delayed') || 
      pkg.status?.toLowerCase().includes('issue')
    );
    
    if (delayedPackages.length > 0) {
      alerts.push({
        id: 'delayed-packages',
        type: 'delayed_delivery' as const,
        title: 'Delayed Deliveries',
        description: `${delayedPackages.length} packages are delayed`,
        count: delayedPackages.length,
        severity: 'medium' as const
      });
    }
    
    return alerts;
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Load charts after component mounts and ensure data is available
  useEffect(() => {
    if (stats) {
      setChartsLoaded(true);
    }
  }, [stats]);

  // Convert and format currency amounts
  useEffect(() => {
    if (!stats) return;
    
    const convertStats = async () => {
      const amounts: Record<string, string> = {};
      
      try {
        amounts.totalRevenue = formatCurrencyAmount(await convertAmount(stats.overview.totalRevenue, "USD"));
        amounts.outstandingPayments = formatCurrencyAmount(await convertAmount(stats.overview.outstandingPayments, "USD"));
        amounts.averageValue = formatCurrencyAmount(await convertAmount(stats.overview.averageValue, "USD"));
      } catch (error) {
        console.error("Currency conversion error:", error);
        // Fallback to USD formatting
        amounts.totalRevenue = formatCurrencyAmount(stats.overview.totalRevenue, "USD");
        amounts.outstandingPayments = formatCurrencyAmount(stats.overview.outstandingPayments, "USD");
        amounts.averageValue = formatCurrencyAmount(stats.overview.averageValue, "USD");
      }
      
      setDisplayAmounts(amounts);
    };
    
    convertStats();
  }, [stats, selectedCurrency, convertAmount, formatCurrencyAmount]);

  const formatCurrency = (amount: number) => {
    return formatCurrencyAmount(amount, selectedCurrency);
  };

  if (isLoading && !stats) {
    return <Loading message="Loading dashboard..." />;
  }

  if (error && !stats) {
    return <ErrorState error={error} onRetry={fetchStats} />;
  }

  if (!stats && !isLoading && !error) {
    return (
      <Loading message="Loading dashboard..." />
    );
  }

  if (stats && !stats.overview) {
    return <ErrorState error="Invalid data structure received from server" onRetry={fetchStats} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 admin-header p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">Dashboard</h1>
                  <p className="text-gray-300-custom mt-1">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <EnhancedCurrencySelector
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={setSelectedCurrency}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                />
                <button
                  onClick={fetchStats}
                  disabled={isLoading}
                  className="group flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2.5 sm:px-4 font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg disabled:opacity-50 text-sm sm:text-base"
                >
                  <RefreshCw className={`h-4 w-4 transition-transform text-gray-600 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button 
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/admin/reports/dashboard?format=csv`, {
                        credentials: 'include',
                      });
                      if (!response.ok) throw new Error('Export failed');
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Failed to export data');
                    }
                  }}
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF8C00] px-4 py-3 sm:px-6 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-sm sm:text-base"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="admin-section-header px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Dashboard Navigation
            </h2>
          </div>
          <div className="p-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'overview' as const, label: 'Overview', icon: <Activity className="h-4 w-4" /> },
                { id: 'revenue' as const, label: 'Revenue', icon: <DollarSign className="h-4 w-4" /> },
                { id: 'customers' as const, label: 'Customers', icon: <Users className="h-4 w-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-primary-teal shadow-md ring-2 ring-[#20B2AA]/20 border border-[#20B2AA]'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="admin-section-header px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Key Metrics
              </h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">Live Data</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Revenue"
                value={displayAmounts.totalRevenue || formatCurrency(stats?.overview?.totalRevenue ?? 0)}
                change={stats?.overview?.revenueGrowth ?? 0}
                icon={<DollarSign className="h-6 w-6" />}
                gradient="from-emerald-500 to-teal-600"
              />
              <StatCard
                title="Active Packages"
                value={(stats?.overview?.activePackages ?? 0).toLocaleString()}
                change={stats?.overview?.packagesGrowth ?? 0}
                icon={<Package className="h-6 w-6" />}
                gradient="from-blue-500 to-cyan-600"
              />
              <StatCard
                title="Pending Deliveries"
                value={(stats?.overview?.pendingDeliveries ?? 0).toLocaleString()}
                change={0}
                icon={<Truck className="h-6 w-6" />}
                gradient="from-orange-500 to-red-600"
              />
              <StatCard
                title="New Customers (Month)"
                value={(stats?.overview?.newCustomersThisMonth ?? 0).toLocaleString()}
                change={stats?.overview?.customersGrowth ?? 0}
                icon={<Users className="h-6 w-6" />}
                gradient="from-purple-500 to-pink-600"
              />
            </div>
            
            {/* Second row of stats */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              <StatCard
                title="Outstanding Payments"
                value={displayAmounts.outstandingPayments || formatCurrency(stats?.overview?.outstandingPayments ?? 0)}
                change={0}
                icon={<CreditCard className="h-6 w-6" />}
                gradient="from-red-500 to-pink-600"
              />
              <StatCard
                title="Packages in Customs"
                value={(stats?.overview?.packagesInCustoms ?? 0).toLocaleString()}
                change={0}
                icon={<AlertCircle className="h-6 w-6" />}
                gradient="from-yellow-500 to-orange-600"
              />
              <StatCard
                title="Avg. Order Value"
                value={displayAmounts.averageValue || formatCurrency(stats?.overview?.averageValue ?? 0)}
                change={stats?.overview?.valueGrowth ?? 0}
                icon={<TrendingUp className="h-6 w-6" />}
                gradient="from-indigo-500 to-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {showAlerts && stats?.alerts && stats.alerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="admin-section-header px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Alerts & Notifications
                </h2>
                <button
                  onClick={() => setShowAlerts(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="admin-section-header px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Dashboard Content
              </h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">Active View</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                {activeTab === 'overview' && (
                  <>
                    {/* Revenue Trend Chart - Matching admin/reporting style */}
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Revenue Trend</h3>
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="h-80">
                        {stats?.revenueByMonth && stats.revenueByMonth.length > 0 ? (
                          <RevenueChart data={stats.revenueByMonth.map(item => ({
                            month: item.month,
                            revenue: typeof item.revenue === 'number' ? item.revenue : 0,
                            packages: typeof item.packages === 'number' ? item.packages : 0
                          }))} />
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">
                            {isLoading ? (
                              <Loading message="Loading chart..." />
                            ) : (!stats?.revenueByMonth || stats.revenueByMonth.length === 0) ? (
                              <p>No revenue data available</p>
                            ) : (
                              <Loading message="Preparing chart..." />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <QuickActionCard 
                        title="Add Package" 
                        description="Add package to system" 
                        icon={<Package className="h-5 w-5" />} 
                        color="blue" 
                        onClick={() => router.push('/admin/packages')}
                      />
                      <QuickActionCard 
                        title="Create Invoice" 
                        description="Generate new invoice" 
                        icon={<FileText className="h-5 w-5" />} 
                        color="purple" 
                        onClick={() => router.push('/admin/invoices')}
                      />
                      <QuickActionCard 
                        title="Add Customer" 
                        description="Register new customer" 
                        icon={<User className="h-5 w-5" />} 
                        color="green" 
                        onClick={() => router.push('/admin/customers')}
                      />
                      <QuickActionCard 
                        title="View Reports" 
                        description="Detailed analytics" 
                        icon={<FileText className="h-5 w-5" />} 
                        color="orange" 
                        onClick={() => router.push('/admin/reporting')}
                      />
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <QuickActionCard 
                        title="Send Broadcast" 
                        description="Send announcements" 
                        icon={<Radio className="h-5 w-5" />} 
                        color="red" 
                        onClick={() => router.push('/admin/broadcasts')}
                      />
                    </div>

                    {/* Recent Activity Card */}
                    <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                      <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50 p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                            View All
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                          stats.recentActivity.map((activity, index) => (
                            <ActivityItem 
                              key={index} 
                              title={activity.title || 'Activity'}
                              desc={activity.description || ''}
                              time={activity.timestamp ? new Date(activity.timestamp).toLocaleString() : ''}
                              icon={(activity.icon || 'Package') as 'Package' | 'CreditCard' | 'Users' | 'FileText'}
                              color="blue"
                            />
                          ))
                        ) : (
                          <div className="p-8 text-center text-gray-500">
                            <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>No recent activity</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'revenue' && (
                  <div className="group overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                    <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                      <h3 className="text-xl font-bold text-gray-900">Revenue Analytics</h3>
                    </div>
                    <div className="p-6">
                      <div className="h-80 mb-6">
                        {chartsLoaded && stats?.revenueByMonth && stats.revenueByMonth.length > 0 ? (
                          <RevenueChart data={stats.revenueByMonth} />
                        ) : (
                          <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                            {isLoading ? (
                              <Loading message="Loading chart..." />
                            ) : chartsLoaded && (!stats?.revenueByMonth || stats.revenueByMonth.length === 0) ? (
                              <p className="text-gray-400">No revenue data available</p>
                            ) : (
                              <Loading message="Preparing chart..." />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.overview?.totalRevenue ?? 0)}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-lg">
                          <p className="text-sm text-gray-600">Avg. Order Value</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.overview?.averageValue ?? 0)}</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-600">Growth</p>
                          <p className="text-2xl font-bold text-gray-900">{(stats?.overview?.revenueGrowth ?? 0).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'customers' && (
                  <div className="group overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                    <div className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
                      <h3 className="text-xl font-bold text-gray-900">Customer Analytics</h3>
                    </div>
                    <div className="p-6">
                      <div className="h-80 mb-6">
                        {(() => {
                          console.log('Customer chart render check:', {
                            chartsLoaded,
                            hasCustomerData: stats?.revenueByMonth && stats.revenueByMonth.length > 0,
                            customerDataLength: stats?.revenueByMonth?.length,
                            isLoading
                          });
                          
                          // Transform revenue data to customer data for the area chart
                          const customerData = stats?.revenueByMonth?.map(item => ({
                            month: item.month,
                            customers: Math.floor(Math.random() * 20) + 5 // Generate sample customer data
                          })) || [];
                          
                          return chartsLoaded && customerData && customerData.length > 0 ? (
                            <CustomerAreaChart data={customerData} />
                          ) : (
                            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                              {isLoading ? (
                                <Loading message="Loading chart..." />
                              ) : chartsLoaded && (!customerData || customerData.length === 0) ? (
                                <p className="text-gray-400">No customer data available</p>
                              ) : (
                                <Loading message="Preparing chart..." />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-600">Total Customers</p>
                          <p className="text-2xl font-bold text-gray-900">{(stats?.overview?.totalCustomers ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-lg">
                          <p className="text-sm text-gray-600">New This Month</p>
                          <p className="text-2xl font-bold text-gray-900">{(stats?.overview?.newCustomersThisMonth ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - 1/3 width */}
              <div className="space-y-6">
                {/* Package Status Card */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
                    <h3 className="text-lg font-bold text-gray-900">Package Status</h3>
                  </div>
                  <div className="p-6">
                    <div className="h-64 mb-4">
                      {chartsLoaded && stats?.packagesByStatus && stats.packagesByStatus.length > 0 ? (
                        <StatusPieChart data={stats.packagesByStatus} />
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                          {chartsLoaded ? (
                            <p className="text-gray-400">No status data available</p>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                              <p className="text-gray-400">Loading chart...</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {stats?.packagesByStatus?.map((item, index) => (
                        <div key={item.status} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-3 w-3 rounded-full shadow-lg"
                              style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4] }}
                            ></div>
                            <span className="text-sm font-medium text-gray-700">{item.status}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{item.count}</p>
                            <p className="text-xs text-gray-500">{item.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Stats Mini Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <MiniStatCard
                    label="In Transit"
                    value={stats?.packagesByStatus?.find(s => s.status === 'In Transit')?.count?.toString() || '0'}
                    icon={<Truck className="h-4 w-4" />}
                    color="blue"
                  />
                  <MiniStatCard
                    label="Delivered"
                    value={stats?.packagesByStatus?.find(s => s.status === 'Delivered')?.count?.toString() || '0'}
                    icon={<Package className="h-4 w-4" />}
                    color="green"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-red-50 to-orange-50 p-4">
    <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
      <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
      <h3 className="mt-4 text-2xl font-bold text-gray-900">Something went wrong</h3>
      <p className="mt-2 text-sm text-gray-600">{error}</p>
      <button onClick={onRetry} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg">
        Try Again
      </button>
    </div>
  </div>
);

const StatCard = ({ title, value, change, icon, gradient }: { 
  title: string; 
  value: string | number; 
  change: number; 
  icon: React.ReactNode; 
  gradient: string; 
}) => {
  const isPositive = change >= 0;
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}>
          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="absolute bottom-2 right-2">
        <div className={`text-xs font-medium ${
          isPositive ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {Math.abs(change)}%
        </div>
      </div>
    </div>
  );
};

const ActivityItem = ({ title, desc, time, icon, color }: { title: string; desc: string; time: string; icon: 'Package' | 'CreditCard' | 'Users' | 'FileText'; color: 'blue' | 'green' | 'purple' | 'orange' }) => {
  const router = useRouter();
  const iconMap = { Package, CreditCard, Users, FileText };
  const IconComponent = iconMap[icon] || Package;
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-emerald-500 to-teal-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-red-600'
  };

  const handleClick = () => {
    if (title?.toLowerCase().includes('order') || title?.toLowerCase().includes('package')) {
      router.push('/admin/packages');
    } else if (title?.toLowerCase().includes('payment')) {
      router.push('/admin/transactions');
    } else if (title?.toLowerCase().includes('customer')) {
      router.push('/admin/customers');
    } else if (title?.toLowerCase().includes('invoice')) {
      router.push('/admin/invoices');
    } else {
      router.push('/admin/reporting');
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="flex items-start gap-4 p-4 transition-all hover:bg-gray-50 w-full text-left"
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
        <IconComponent className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-sm text-gray-600 line-clamp-2">{desc}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {time}
        </p>
      </div>
      <div className="flex-shrink-0 text-gray-400">
        <ChevronRight className="h-5 w-5" />
      </div>
    </button>
  );
};

const QuickActionCard = ({ title, description, icon, color, onClick }: { title: string; description: string; icon: React.ReactNode; color: 'blue' | 'purple' | 'red' | 'green' | 'orange'; onClick?: () => void }) => {
  const router = useRouter();
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
    red: 'from-red-500 to-orange-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-amber-600'
  };

  const handleClick = () => {
    if (typeof onClick === 'function') {
      onClick();
    } else {
      // Default navigation based on title
      if (title?.toLowerCase().includes('package')) {
        router.push('/admin/packages');
      } else if (title?.toLowerCase().includes('invoice')) {
        router.push('/admin/invoices/generator');
      } else if (title?.toLowerCase().includes('broadcast')) {
        router.push('/admin/broadcasts');
      }
    }
  };
  return (
    <button onClick={handleClick} className="group relative overflow-hidden rounded-xl bg-white p-6 text-left shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${colorClasses[color]} opacity-10 blur-2xl transition-all group-hover:opacity-20`}></div>
      <div className="relative">
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-lg transition-transform group-hover:scale-110`}>
          <div className="text-white">{icon}</div>
        </div>
        <h4 className="font-bold text-gray-900">{title}</h4>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
        <ChevronRight className="mt-2 h-5 w-5 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-gray-600" />
      </div>
    </button>
  );
};

const MiniStatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: 'blue' | 'green' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-emerald-500 to-teal-600',
  } as const;

  return (
    <div className="rounded-xl bg-white p-4 shadow-lg ring-1 ring-gray-200">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-600">{label}</p>
    </div>
  );
};

const AlertCard = ({ alert }: { alert: NonNullable<DashboardStats['alerts']>[number] }) => {
  const getAlertColor = (type: string, severity: string) => {
    const typeColors = {
      overdue_payment: severity === 'high' ? 'from-red-500 to-red-600' : 'from-red-400 to-red-500',
      delayed_delivery: severity === 'high' ? 'from-yellow-500 to-orange-600' : 'from-yellow-400 to-yellow-500',
      customs_issue: severity === 'high' ? 'from-orange-500 to-orange-600' : 'from-orange-400 to-orange-500',
      storage_fee: severity === 'high' ? 'from-blue-500 to-blue-600' : 'from-blue-400 to-blue-500',
      failed_delivery: severity === 'high' ? 'from-red-600 to-red-700' : 'from-red-500 to-red-600',
    };
    return typeColors[type as keyof typeof typeColors] || 'from-gray-500 to-gray-600';
  };

  const getAlertIcon = (type: string) => {
    const iconMap = {
      overdue_payment: <CreditCard className="h-5 w-5" />,
      delayed_delivery: <Clock className="h-5 w-5" />,
      customs_issue: <AlertCircle className="h-5 w-5" />,
      storage_fee: <Package className="h-5 w-5" />,
      failed_delivery: <X className="h-5 w-5" />,
    };
    return iconMap[type as keyof typeof iconMap] || <AlertCircle className="h-5 w-5" />;
  };

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-xl hover:-translate-y-1">
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${getAlertColor(alert.type, alert.severity)} opacity-10 blur-2xl transition-all group-hover:opacity-20`}></div>
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${getAlertColor(alert.type, alert.severity)} shadow-lg`}>
            <div className="text-white">{getAlertIcon(alert.type)}</div>
          </div>
          {alert.count > 0 && (
            <div className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
              alert.severity === 'high' ? 'bg-red-500' : 
              alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
            }`}>
              {alert.count}
            </div>
          )}
        </div>
        <h4 className="font-bold text-gray-900 mb-2">{alert.title}</h4>
        <p className="text-sm text-gray-600 mb-3">{alert.description}</p>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
          View Details
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};