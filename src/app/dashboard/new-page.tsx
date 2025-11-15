'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ShipmentMap } from '@/components/dashboard/ShipmentMap';
import { PopularRoutes } from '@/components/dashboard/PopularRoutes';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { DashboardResponse } from '@/types/dashboard';
import { 
  TruckIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function NewDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">Error: {error || 'Failed to load dashboard data'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, revenue, activeShipments, customerStats, popularRoutes } = data;

  // Generate sample revenue data for the chart
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    data: [30000, 35000, 40000, 38000, 42000, 45000, 48000, 50000, 52000, 50000, 48000, 55000],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Shipments"
            value={stats.totalShipments.toLocaleString()}
            icon={<TruckIcon className="h-6 w-6 text-blue-600" />}
          />
          <StatsCard
            title="Active Shipments"
            value={stats.activeShipments.toLocaleString()}
            icon={<TruckIcon className="h-6 w-6 text-yellow-600" />}
          />
          <StatsCard
            title="Monthly Revenue"
            value={`$${revenue.currentMonth.toLocaleString()}`}
            change={revenue.growthRate}
            icon={<CurrencyDollarIcon className="h-6 w-6 text-green-600" />}
          />
          <StatsCard
            title="Total Customers"
            value={customerStats.totalCustomers.toLocaleString()}
            icon={<UsersIcon className="h-6 w-6 text-purple-600" />}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue Chart */}
            <RevenueChart data={revenueData} />
            
            {/* Active Shipments Map */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Active Shipments</h3>
              <div className="h-96">
                <ShipmentMap shipments={activeShipments} />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Popular Routes */}
            <PopularRoutes routes={popularRoutes} />
            
            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Average Delivery Time</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats.averageDeliveryTime} hours
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, (stats.averageDeliveryTime / 72) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">On-time Delivery Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats.onTimeDeliveryRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${stats.onTimeDeliveryRate}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">New Customers This Month</span>
                    <span className="text-sm font-semibold text-gray-900">
                      +{customerStats.newCustomersThisMonth}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  <TruckIcon className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-sm font-medium">New Shipment</span>
                </button>
                <button className="p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  <CurrencyDollarIcon className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-sm font-medium">Record Payment</span>
                </button>
                <button className="p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                  <UsersIcon className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-sm font-medium">Add Customer</span>
                </button>
                <button className="p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                  <ClockIcon className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-sm font-medium">Schedule Pickup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
