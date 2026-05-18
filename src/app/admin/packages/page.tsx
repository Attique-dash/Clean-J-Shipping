// src/app/admin/packages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { ExportService } from '@/lib/export-service';
import { CurrencyService } from '@/lib/currency-service';
import { 
  Search, 
  Plus, 
  Package, 
  Package2, 
  User, 
  Weight, 
  Edit, 
  Trash, 
  RefreshCw, 
  Filter, 
  ChevronRight, 
  Eye,
  X
} from 'lucide-react';
import Link from 'next/link';
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";
import Loading from "@/components/Loading";
import type { KcdPackageRecord } from '@/types/kcd-package';
import {
  formatPackageAmount,
  getCustomerDisplayName,
  getPackageStatusLabel,
  logKcdPackages,
  logKcdPackageConsole,
} from '@/lib/package-format';
import PackageDetailsPanel from '@/components/packages/PackageDetailsPanel';

type StatusOption = {
  value: string;
  label: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'received', label: 'Received' },
  { value: 'in_processing', label: 'In Processing' },
  { value: 'ready_to_ship', label: 'Ready to Ship' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
];

export default function AdminPackagesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<KcdPackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userCodeFilter, setUserCodeFilter] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<KcdPackageRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // View package modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [packageToView, setPackageToView] = useState<KcdPackageRecord | null>(null);

  // Payment update modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [packageToUpdatePayment, setPackageToUpdatePayment] = useState<KcdPackageRecord | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    paymentStatus: 'paid' as 'pending' | 'paid' | 'partially_paid',
    paymentMethod: 'cash' as 'cash' | 'card' | 'paypal' | 'bank_transfer',
    amountPaid: 0,
    paymentNote: ''
  });
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Get userCode from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userCode = params.get('userCode');
    if (userCode) {
      setUserCodeFilter(userCode);
    }
  }, []);

  // Redirect if not authenticated or not admin staff
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch packages function - defined at component level for reuse
  const fetchPackages = async () => {
    try {
      const params = new URLSearchParams();
      if (userCodeFilter) params.set('userCode', userCodeFilter);
      if (searchTerm) params.set('q', searchTerm);
      if (selectedStatuses.length > 0) params.set('statuses', selectedStatuses.join(','));
      // Fetch all packages without pagination
      params.set('per_page', 'all');

      const res = await fetch(`/api/admin/packages?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      if (res.ok) {
        const list: KcdPackageRecord[] = data.packages || [];
        setPackages(list);
        logKcdPackages('Admin Packages Panel', list);
        setSelectedIds(new Set());
      } else {
        const errorMessage = data.error || data.message || 'Failed to load packages';
        console.error('API Error:', errorMessage, data);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load packages on mount and when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (status === 'authenticated') {
      fetchPackages();
    }
  }, [status, userCodeFilter, searchTerm, selectedStatuses, refreshToken]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshToken((v) => v + 1);
  };

  // Filter packages based on search term (already filtered by API, but keep for client-side filtering if needed)
  const filteredPackages = packages;

  const allSelectedOnPage = filteredPackages.length > 0 && filteredPackages.every((p) => selectedIds.has(p._id));

  const toggleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPackages.map((p) => p._id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  const formatPkgAmount = (pkg: KcdPackageRecord, amount: number) =>
    formatPackageAmount(amount, pkg.pricePaidCurrency || 'USD');

  const formatJmd = (amount: number) => {
    return CurrencyService.format(amount, 'JMD');
  };

  const humanStatus = (pkg: KcdPackageRecord) => getPackageStatusLabel(pkg);

  const getServiceBadge = (mode: string) => {
    if (mode === 'air') return 'bg-sky-100 text-sky-800 border-sky-200';
    if (mode === 'ocean') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (mode === 'local') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusBadge = (pkg: KcdPackageRecord) => {
    const s = pkg.PackageStatus ?? 0;
    if (s >= 4) return 'bg-emerald-100 text-emerald-800';
    if (s === 3) return 'bg-cyan-100 text-cyan-800';
    if (s === 2) return 'bg-yellow-100 text-yellow-800';
    if (s === 1) return 'bg-blue-100 text-blue-800';
    return 'bg-purple-100 text-purple-800';
  };

  const getInvoiceStatusBadge = (status?: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'billed':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getInvoiceStatusLabel = (status?: string) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'billed':
        return 'Billed';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getPaymentStatusLabel = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'partially_paid':
        return 'Partially Paid';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const runBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch('/api/admin/packages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id, status: bulkStatus }),
          })
        )
      );
      toast.success(`Updated ${ids.length} package(s)`);
      setBulkStatus('');
      setRefreshToken((v) => v + 1);
    } catch (e) {
      console.error(e);
      toast.error('Bulk status update failed');
    }
  };

  const clearAllFilters = () => {
    setUserCodeFilter('');
    setSearchTerm('');
    setSelectedStatuses([]);
  };

  const exportSelected = (format: 'csv' | 'excel') => {
    const rows = filteredPackages.filter((p) => selectedIds.has(p._id));
    if (rows.length === 0) {
      toast.info('No packages selected');
      return;
    }

    const exportRows = rows.map((p) => ({
      PackageID: p.PackageID,
      TrackingNumber: p.TrackingNumber,
      UserCode: p.UserCode,
      FirstName: p.FirstName,
      LastName: p.LastName,
      Weight: p.Weight,
      Shipper: p.Shipper,
      Branch: p.Branch,
      PackageStatus: p.PackageStatus,
      PackagePayments: p.PackagePayments,
      EntryDate: p.EntryDate,
      Description: p.Description,
    }));

    const filename = `packages_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      ExportService.toCSV(exportRows, filename);
    } else {
      ExportService.toExcel(exportRows, filename, 'Packages');
    }
  };

  // Handle package view
  const handleViewPackage = async (pkg: KcdPackageRecord) => {
    try {
      const res = await fetch(`/api/admin/packages/${pkg._id}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const fullPackageData: KcdPackageRecord = await res.json();
        logKcdPackageConsole('Admin Package Detail', fullPackageData);
        setPackageToView(fullPackageData);
      } else {
        setPackageToView(pkg);
      }
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching package details:', error);
      setPackageToView(pkg);
      setViewModalOpen(true);
    }
  };

  const handleDeletePackage = async (pkg: KcdPackageRecord) => {
    setPackageToDelete(pkg);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!packageToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/packages?id=${packageToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        setPackages(packages.filter(p => p._id !== packageToDelete._id));
        toast.success('Package deleted successfully');
        setDeleteModalOpen(false);
        setPackageToDelete(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete package');
      }
    } catch {
      toast.error('Error deleting package');
    } finally {
      setDeleting(false);
    }
  };

  // Handle open payment update modal
  const handleOpenPaymentModal = (pkg: KcdPackageRecord) => {
    setPackageToUpdatePayment(pkg);
    const status = (pkg.paymentStatus as 'pending' | 'paid' | 'partially_paid') || 'pending';
    setPaymentFormData({
      paymentStatus: status,
      paymentMethod: (pkg.paymentMethod as 'cash' | 'card' | 'paypal' | 'bank_transfer') || 'cash',
      amountPaid: pkg.amountPaid ?? pkg.totalAmount ?? pkg.itemValueUsd ?? 0,
      paymentNote: '',
    });
    setPaymentModalOpen(true);
  };

  // Handle payment update submit
  const handleUpdatePayment = async () => {
    if (!packageToUpdatePayment) return;

    setUpdatingPayment(true);
    try {
      const res = await fetch(`/api/admin/packages/${packageToUpdatePayment._id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentStatus: paymentFormData.paymentStatus,
          paymentMethod: paymentFormData.paymentMethod,
          amountPaid: paymentFormData.amountPaid,
          paymentNote: paymentFormData.paymentNote
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Payment status updated to ${getPaymentStatusLabel(paymentFormData.paymentStatus)}`);
        // Refresh packages list to get updated data from backend
        await fetchPackages();
        // Also trigger refresh token to ensure full reload
        setRefreshToken((v) => v + 1);
        setPaymentModalOpen(false);
        setPackageToUpdatePayment(null);
      } else {
        toast.error(data.error || data.message || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Error updating payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  if (status === 'loading' || loading) {
    return <Loading message="Loading packages..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Package className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">Packages</h1>
                  <p className="text-blue-100 mt-1">Total packages: <span className="font-semibold">{packages.length}</span></p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="group flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-3 py-2.5 sm:px-4 font-medium text-white shadow-md ring-1 ring-white/30 transition-all hover:bg-white/30 hover:shadow-lg disabled:opacity-50 text-sm sm:text-base"
                >
                  <RefreshCw className={`h-4 w-4 transition-transform ${refreshing ? 'animate-spin' : 'hover:rotate-180'}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <Link
                  href="/admin/add-package"
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E67919] to-[#d46a0f] px-4 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Add Package</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter Packages
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
              {/* Search Input */}
              <div className="relative sm:col-span-2 md:col-span-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full h-12 pl-10 pr-4 text-sm border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Search by tracking #, customer name, mailbox, or phone"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Customer Code Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full h-12 pl-10 pr-4 text-sm border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Customer code (e.g. MB-001)"
                  value={userCodeFilter}
                  onChange={(e) => setUserCodeFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Package Status</h4>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-8 py-2.5 text-sm border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                  value={selectedStatuses[0] || ''}
                  onChange={(e) => {
                    setSelectedStatuses(e.target.value ? [e.target.value] : []);
                  }}
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {(userCodeFilter || searchTerm || selectedStatuses.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                {searchTerm && (
                  <div className="flex items-center gap-2 rounded-lg bg-teal-100 px-3 py-1.5 text-sm">
                    <Search className="h-4 w-4 text-teal-700" />
                    <span className="font-medium text-teal-900">Search: {searchTerm}</span>
                    <button onClick={() => setSearchTerm('')} className="ml-1 text-teal-700 hover:text-teal-900">×</button>
                  </div>
                )}
                {userCodeFilter && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Customer: {userCodeFilter}</span>
                    <button
                      onClick={() => setUserCodeFilter('')}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                )}
                {selectedStatuses.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-orange-100 px-3 py-1.5 text-sm">
                    <Filter className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Status: {selectedStatuses.length === 1 ? (STATUS_OPTIONS.find((o) => o.value === selectedStatuses[0])?.label || selectedStatuses[0]) : `${selectedStatuses.length} selected`}</span>
                    <button
                      onClick={() => setSelectedStatuses([])}
                      className="ml-1 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </div>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Packages List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Package List
              </h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">{filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {selectedCount > 0 && (
            <div className="border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{selectedCount}</span> selected
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <select
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                  >
                    <option value="">Bulk status update…</option>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={runBulkStatusUpdate}
                    disabled={!bulkStatus}
                    className="h-10 rounded-lg bg-[#0f4d8a] px-4 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => exportSelected('csv')}
                    className="h-10 rounded-lg bg-white px-4 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => exportSelected('excel')}
                    className="h-10 rounded-lg bg-white px-4 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                  >
                    Export Excel
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="h-10 rounded-lg bg-white px-4 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {filteredPackages.length === 0 ? (
            <div className="p-12 text-center">
              <Package2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
              <p className="text-sm text-gray-600 mb-6">
                {userCodeFilter || searchTerm || selectedStatuses.length > 0
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by adding your first package'}
              </p>
              <Link
                href="/admin/add-package"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                Add Package
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="block lg:hidden">
                <div className="space-y-4">
                  {filteredPackages.map((pkg) => (
                    <div key={pkg._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-3 mt-1"
                            checked={selectedIds.has(pkg._id)}
                            onChange={() => toggleSelectOne(pkg._id)}
                          />
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-3">
                            <button
                              type="button"
                              onClick={() => handleViewPackage(pkg)}
                              className="text-sm font-medium text-gray-900 font-mono hover:underline"
                            >
                              {pkg.TrackingNumber}
                            </button>
                            <div className="text-xs text-gray-500">
                              {pkg.dateReceived ? new Date(pkg.dateReceived).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(pkg)}`}>
                          {humanStatus(pkg)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Customer:</span>
                          <span className="font-medium text-gray-900">{getCustomerDisplayName(pkg) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Mailbox:</span>
                          <span className="font-medium text-gray-900">{pkg.UserCode || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Shipper:</span>
                          <span className="font-medium text-gray-900">{pkg.Shipper || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-medium text-gray-900">{Number(pkg.weightLbs ?? pkg.Weight ?? 0).toFixed(2)} lb</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="font-medium text-gray-900">{formatPkgAmount(pkg, pkg.totalAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Payment:</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getPaymentStatusBadge(pkg.paymentStatus)}`}>
                            {getPaymentStatusLabel(pkg.paymentStatus)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => handleViewPackage(pkg)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-white rounded-md hover:bg-blue-50 transition-all shadow-sm"
                            title="View Package Details"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </button>
                          <Link
                            href={`/admin/add-package?edit=${pkg._id}`}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-all shadow-sm"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeletePackage(pkg)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-white rounded-md hover:bg-red-50 transition-all shadow-sm"
                          >
                            <Trash className="h-3 w-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input type="checkbox" checked={allSelectedOnPage} onChange={toggleSelectAll} />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tracking</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mailbox</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Shipper</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Weight (lbs)</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Invoice Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date Received</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input type="checkbox" checked={selectedIds.has(pkg._id)} onChange={() => toggleSelectOne(pkg._id)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <button
                              type="button"
                              onClick={() => handleViewPackage(pkg)}
                              className="text-sm font-medium text-gray-900 font-mono hover:underline"
                            >
                              {pkg.TrackingNumber}
                            </button>
                            <div className="text-xs text-gray-500">
                              {pkg.Branch}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{getCustomerDisplayName(pkg) || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{pkg.customerEmail || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pkg.UserCode || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pkg.Shipper || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center border px-2 py-1 text-xs font-semibold rounded-full ${getServiceBadge(pkg.serviceMode || 'air')}`}>
                          {(pkg.serviceMode || 'air').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(pkg)}`}>
                          {humanStatus(pkg)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="inline-flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          {Number(pkg.weightLbs ?? pkg.Weight ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatPkgAmount(pkg, pkg.totalAmount || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusBadge(pkg.invoiceStatus)}`}>
                          {getInvoiceStatusLabel(pkg.invoiceStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPaymentStatusBadge(pkg.paymentStatus)}`}>
                          {getPaymentStatusLabel(pkg.paymentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {pkg.EntryDate || pkg.dateReceived
                          ? new Date(String(pkg.EntryDate || pkg.dateReceived)).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => handleViewPackage(pkg)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-white rounded-md hover:bg-blue-50 transition-all shadow-sm"
                              title="View Package Details"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => handleOpenPaymentModal(pkg)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-white rounded-md hover:bg-green-50 transition-all shadow-sm"
                              title="Update Payment Status"
                            >
                              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Payment
                            </button>
                            <Link
                              href={`/admin/add-package?edit=${pkg._id}`}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-all shadow-sm"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDeletePackage(pkg)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-white rounded-md hover:bg-red-50 transition-all shadow-sm"
                            >
                              <Trash className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          open={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setPackageToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Package"
          message="Are you sure you want to delete this package? This action cannot be undone and will permanently remove all package data from the system."
          itemName={packageToDelete?.TrackingNumber}
          loading={deleting}
        />

        {/* View Package Modal */}
       {/* View Package Modal */}
        {viewModalOpen && packageToView && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Package Details</h3>
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <PackageDetailsPanel
                  pkg={packageToView}
                  getStatusBadgeClass={getStatusBadge}
                />
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 space-y-3">
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    handleOpenPaymentModal(packageToView);
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Update Payment
                </button>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-medium shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Update Modal */}
        {paymentModalOpen && packageToUpdatePayment && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Update Payment Status
                  </h3>
                  <button
                    onClick={() => {
                      setPaymentModalOpen(false);
                      setPackageToUpdatePayment(null);
                    }}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-green-100 mt-1 text-xs">
                  Tracking: <span className="font-mono font-medium">{packageToUpdatePayment.TrackingNumber}</span>
                </p>
              </div>

              <div className="p-5 space-y-3 overflow-y-auto">
                {/* Current Status Display */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">Current Status:</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getPaymentStatusBadge(packageToUpdatePayment.paymentStatus)}`}>
                      {getPaymentStatusLabel(packageToUpdatePayment.paymentStatus)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">Total Amount:</span>
                    <span className="text-sm font-medium text-gray-900">{formatPkgAmount(packageToUpdatePayment, packageToUpdatePayment.totalAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Amount Paid:</span>
                    <span className={`text-sm font-medium ${(packageToUpdatePayment.amountPaid || 0) > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {formatPkgAmount(packageToUpdatePayment, packageToUpdatePayment.amountPaid || 0)}
                    </span>
                  </div>
                </div>

                {/* Payment Status Select */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    New Payment Status *
                  </label>
                  <select
                    value={paymentFormData.paymentStatus}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentStatus: e.target.value as 'pending' | 'paid' | 'partially_paid' })}
                    className="block w-full h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {/* Payment Method Select */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value as 'cash' | 'card' | 'paypal' | 'bank_transfer' })}
                    className="block w-full h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="paypal">PayPal</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount Paid (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentFormData.amountPaid}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amountPaid: parseFloat(e.target.value) || 0 })}
                    className="block w-full h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    placeholder="Enter amount paid"
                  />
                </div>

                {/* Payment Note */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Note (Optional)
                  </label>
                  <textarea
                    value={paymentFormData.paymentNote}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentNote: e.target.value })}
                    rows={2}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none"
                    placeholder="e.g., Cash payment received at counter"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
                <button
                  onClick={handleUpdatePayment}
                  disabled={updatingPayment}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {updatingPayment ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm Payment Update
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setPackageToUpdatePayment(null);
                  }}
                  disabled={updatingPayment}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all font-medium shadow-md disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}