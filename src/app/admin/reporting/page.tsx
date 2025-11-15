import React from 'react';
import { TrendingUp, Package, Users, Truck, DollarSign, AlertCircle, CheckCircle, Bell, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function ReportingPage() {
  // Mock data - replace with your actual data
  const totalPackages = 1247;
  const totalCustomers = 856;
  const inTransit = 143;
  const revenueThisWeek = 15750;
  
  const packagesThisWeek = 89;
  const newCustomersThisWeek = 12;
  
  const awaitingInvoice = 23;
  const readyForPickup = 47;
  const largePayments = 5;

  // Calculate growth percentages
  const packageGrowth = 12.5;
  const customerGrowth = 8.3;
  const transitGrowth = -4.2;
  const revenueGrowth = 18.7;

  function formatCurrency(v) {
    return new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency: "USD", 
      maximumFractionDigits: 0 
    }).format(v);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
              Reporting & Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-600">Real-time business insights and metrics</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm border border-gray-200">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">Live Dashboard</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard 
            label="Total Packages" 
            value={totalPackages.toLocaleString()} 
            icon={<Package className="h-6 w-6" />}
            gradient="from-[#0f4d8a] to-blue-600"
            growth={packageGrowth}
          />
          <KpiCard 
            label="Active Customers" 
            value={totalCustomers.toLocaleString()} 
            icon={<Users className="h-6 w-6" />}
            gradient="from-[#E67919] to-orange-600"
            growth={customerGrowth}
          />
          <KpiCard 
            label="In Transit" 
            value={inTransit.toLocaleString()} 
            icon={<Truck className="h-6 w-6" />}
            gradient="from-purple-500 to-purple-700"
            growth={transitGrowth}
          />
          <KpiCard 
            label="Week Revenue" 
            value={formatCurrency(revenueThisWeek)} 
            icon={<DollarSign className="h-6 w-6" />}
            gradient="from-emerald-500 to-emerald-700"
            growth={revenueGrowth}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Weekly Statistics */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
              <div className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Weekly Performance</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <StatRow 
                name="Packages Created" 
                value={`${packagesThisWeek} this week`} 
                level={packagesThisWeek} 
                maxLevel={100}
                color="bg-gradient-to-r from-[#0f4d8a] to-blue-600"
                icon={<Package className="h-5 w-5 text-[#0f4d8a]" />}
              />
              <StatRow 
                name="Revenue Generated" 
                value={formatCurrency(revenueThisWeek)} 
                level={revenueThisWeek} 
                maxLevel={20000}
                color="bg-gradient-to-r from-emerald-500 to-emerald-700"
                icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              />
              <StatRow 
                name="New Customers" 
                value={`${newCustomersThisWeek} joined`} 
                level={newCustomersThisWeek} 
                maxLevel={20}
                color="bg-gradient-to-r from-[#E67919] to-orange-600"
                icon={<Users className="h-5 w-5 text-[#E67919]" />}
              />
            </div>
          </div>

          {/* Alerts & Quick Actions */}
          <div className="space-y-6">
            {/* Alerts */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
                <div className="flex items-center gap-2 text-white">
                  <Bell className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Active Alerts</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <AlertRow 
                  icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
                  text={`${awaitingInvoice} packages awaiting invoice`}
                  variant="warning"
                />
                <AlertRow 
                  icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                  text={`${readyForPickup} ready for pickup`}
                  variant="success"
                />
                <AlertRow 
                  icon={<DollarSign className="h-5 w-5 text-[#E67919]" />}
                  text={`${largePayments} large payments`}
                  variant="info"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <ActionButton 
                  text="Add New Package" 
                  variant="primary"
                  icon={<Package className="h-4 w-4" />}
                />
                <ActionButton 
                  text="Create Customer" 
                  variant="secondary"
                  icon={<Users className="h-4 w-4" />}
                />
                <ActionButton 
                  text="Generate Report" 
                  href="/admin/reports"
                  variant="accent"
                  icon={<TrendingUp className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, gradient, growth }) {
  const isPositive = growth >= 0;
  
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          
          <div className="mt-3 flex items-center gap-1">
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(growth)}%
            </span>
            <span className="text-xs text-gray-500 ml-1">vs last week</span>
          </div>
        </div>
        
        <div className={`rounded-xl bg-gradient-to-br ${gradient} p-3 text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatRow({ name, value, level, maxLevel, color, icon }) {
  const percentage = Math.min(100, (level / maxLevel) * 100);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-700">{name}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      </div>
      
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out shadow-sm`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

function AlertRow({ icon, text, variant }) {
  const bgColors = {
    warning: 'bg-amber-50 border-amber-200',
    success: 'bg-green-50 border-green-200',
    info: 'bg-blue-50 border-blue-200'
  };
  
  return (
    <div className={`flex items-center gap-3 rounded-lg border ${bgColors[variant]} p-3 transition-all duration-200 hover:shadow-md`}>
      {icon}
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </div>
  );
}

function ActionButton({ text, variant, icon, href }) {
  const styles = {
    primary: 'bg-gradient-to-r from-[#0f4d8a] to-blue-600 text-white hover:shadow-lg',
    secondary: 'bg-gradient-to-r from-gray-600 to-gray-800 text-white hover:shadow-lg',
    accent: 'bg-gradient-to-r from-[#E67919] to-orange-600 text-white hover:shadow-lg'
  };
  
  const buttonClass = `w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${styles[variant]}`;
  
  if (href) {
    return (
      <a href={href} className={buttonClass}>
        {icon}
        {text}
      </a>
    );
  }
  
  return (
    <button className={buttonClass}>
      {icon}
      {text}
    </button>
  );
}