"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useSession } from "next-auth/react";
import { User, Package, BarChart3, Users, TrendingUp, Calendar, DollarSign, CheckCircle, Clock, Key, Eye, EyeOff, Loader2, Mail, Edit2 } from "lucide-react";
import { toast } from "react-toastify";
import Loading from "@/components/Loading";

export default function WarehouseSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPackages: 0,
    pendingPackages: 0,
    inTransitPackages: 0,
    deliveredPackages: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    weeklyPackages: 0,
    todayPackages: 0
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load analytics data
      const analyticsRes = await fetch('/api/warehouse/analytics', {
        credentials: 'include'
      });
      
      if (analyticsRes.ok) {
        const analyticsData: {
          statusCounts?: Record<string, unknown>;
          totalCustomers?: unknown;
          today?: { packages?: unknown };
        } = await analyticsRes.json();

        const statusCountsRaw: Record<string, unknown> = analyticsData.statusCounts || {};
        const statusCounts: Record<string, number> = Object.fromEntries(
          Object.entries(statusCountsRaw).map(([key, value]) => [
            key,
            typeof value === 'number' ? value : Number(value) || 0,
          ])
        );
        
        setStats(prev => ({
          ...prev,
          totalPackages: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
          pendingPackages: (statusCounts["Unknown"] || 0) + (statusCounts["At Warehouse"] || 0),
          inTransitPackages: statusCounts["In Transit"] || 0,
          deliveredPackages: statusCounts["Delivered"] || 0,
          totalCustomers: typeof analyticsData.totalCustomers === 'number' ? analyticsData.totalCustomers : Number(analyticsData.totalCustomers) || 0,
          todayPackages: typeof analyticsData.today?.packages === 'number' ? analyticsData.today?.packages : Number(analyticsData.today?.packages) || 0,
          monthlyRevenue: 0 // This would need revenue calculation from payments
        }));
      }

      // Load customer count as fallback
      const customersRes = await fetch('/api/warehouse/customers', {
        credentials: 'include'
      });
      
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setStats(prev => ({
          ...prev,
          totalCustomers: customersData.customers?.length || 0
        }));
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/warehouse/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully!');
        // Reset form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return <Loading message="Loading settings..." />;
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
          {/* Header Banner */}
          <header className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f4d8a] via-[#1565a8] to-[#0891b2] p-8 shadow-xl">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -bottom-8 -left-8 h-64 w-64 rounded-full bg-[#E67919]/20 blur-3xl"></div>
            <div className="relative flex items-center gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
                <User className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white sm:text-4xl">{session?.user?.name || 'Warehouse Staff'}</h1>
                <p className="mt-2 flex items-center gap-2 text-blue-100">
                  <Mail className="h-4 w-4" />
                  {session?.user?.email || 'N/A'}
                </p>
                <p className="mt-1 text-sm text-blue-200">Warehouse Management Portal</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm ring-2 ring-emerald-400/30">
                  <CheckCircle className="h-4 w-4" />
                  Active
                </span>
              </div>
            </div>
          </header>

          {/* Staff Profile Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Staff Profile
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900 font-medium">{session?.user?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900 font-medium">{session?.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-gray-900 font-medium capitalize">{session?.user?.role || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Code</label>
                  <p className="text-gray-900 font-medium">{session?.user?.userCode || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#dc2626] to-[#ef4444] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Key className="w-5 h-5" />
                Change Password
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    <p>Password must be at least 6 characters long</p>
                  </div>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Analytics Dashboard Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Package Analytics
              </h2>
            </div>
            <div className="p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalPackages}</p>
                  <p className="text-sm text-blue-700">All Packages</p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="text-xs text-yellow-600 font-medium">Pending</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pendingPackages}</p>
                  <p className="text-sm text-yellow-700">Awaiting Processing</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span className="text-xs text-purple-600 font-medium">In Transit</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{stats.inTransitPackages}</p>
                  <p className="text-sm text-purple-700">Currently Shipping</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Delivered</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.deliveredPackages}</p>
                  <p className="text-sm text-green-700">Successfully Delivered</p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Total Customers</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Today&apos;s Packages</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayPackages}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Monthly Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Quick Actions
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-900 font-medium">View Customers</span>
                </button>
                <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span className="text-gray-900 font-medium">Generate Reports</span>
                </button>
                <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="text-gray-900 font-medium">Manage Team</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}