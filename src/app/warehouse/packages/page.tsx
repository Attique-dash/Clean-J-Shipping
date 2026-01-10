// src/app/warehouse/packages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { ExportService } from '@/lib/export-service';
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
  Loader2,
  Eye,
  X,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";
import Loading from "@/components/Loading";

type PackageRow = {
  _id: string;
  trackingNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  mailboxNumber?: string;
  userCode?: string;
  serviceMode?: 'air' | 'ocean' | 'local';
  status: string;
  weight: number;
  weightUnit: string;
  weightLbs: number;
  itemValueUsd?: number;
  dateReceived?: string | null;
  daysInStorage: number;
  warehouseLocation?: string;
  customsRequired?: boolean;
  customsStatus?: string;
  paymentStatus?: string;
  // Add cost fields like admin
  totalAmount?: number;
  shippingCost?: number;
  // Sender information
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderAddress?: string;
  senderCountry?: string;
  sender?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
  };
  // Recipient information
  recipient?: {
    name?: string;
    shippingId?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
  };
  receiverName?: string;
  receiverEmail?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  // Additional details
  shipper?: string;
  description?: string;
  itemDescription?: string;
  contents?: string;
  specialInstructions?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    weight?: number;
    weightUnit?: string;
  };
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

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

export default function WarehousePackagesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<PackageRow[]>([]);
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
  const [packageToDelete, setPackageToDelete] = useState<PackageRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // View package modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [packageToView, setPackageToView] = useState<PackageRow | null>(null);

  // Get userCode from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userCode = params.get('userCode');
    if (userCode) {
      setUserCodeFilter(userCode);
    }
  }, []);

  // Redirect if not authenticated or not warehouse staff
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const params = new URLSearchParams();
        if (userCodeFilter) params.set('userCode', userCodeFilter);
        if (searchTerm) params.set('q', searchTerm);
        if (selectedStatuses.length > 0) params.set('statuses', selectedStatuses.join(','));
        
        const res = await fetch(`/api/warehouse/packages/search?${params.toString()}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          setPackages(data.packages || []);
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

  const formatUsd = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const humanStatus = (s: string) => {
    const found = STATUS_OPTIONS.find((o) => o.value === s);
    if (found) return found.label;
    return s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getServiceBadge = (mode: string) => {
    if (mode === 'air') return 'bg-sky-100 text-sky-800 border-sky-200';
    if (mode === 'ocean') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (mode === 'local') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusBadge = (s: string) => {
    if (s === 'delivered') return 'bg-emerald-100 text-emerald-800';
    if (s === 'out_for_delivery') return 'bg-blue-100 text-blue-800';
    if (s === 'ready_for_delivery') return 'bg-cyan-100 text-cyan-800';
    if (s === 'customs_pending') return 'bg-amber-100 text-amber-800';
    if (s === 'customs_cleared') return 'bg-green-100 text-green-800';
    if (s === 'in_transit') return 'bg-yellow-100 text-yellow-800';
    if (s === 'received' || s === 'At Warehouse') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const runBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch('/api/warehouse/packages', {
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
      'Tracking Number': p.trackingNumber,
      'Customer Name': p.customerName,
      'Customer Email': p.customerEmail || '',
      'Customer Phone': p.customerPhone || '',
      'Mailbox Number': p.mailboxNumber,
      'Service Type': String(p.serviceMode).toUpperCase(),
      'Status': humanStatus(p.status),
      'Weight (lbs)': Number(p.weightLbs || 0).toFixed(2),
      'Value (USD)': Number(p.itemValueUsd || 0).toFixed(2),
      'Date Received': p.dateReceived ? new Date(p.dateReceived).toLocaleDateString() : '',
      'Days in Storage': p.daysInStorage,
      'Warehouse Location': p.warehouseLocation,
      'Customs Required': p.customsRequired ? 'Yes' : 'No',
      'Customs Status': p.customsStatus,
      'Payment Status': p.paymentStatus,
      'Shipper': p.shipper || '',
      'Sender Name': p.senderName || '',
      'Sender Email': p.senderEmail || '',
      'Sender Phone': p.senderPhone || '',
      'Sender Country': p.senderCountry || '',
    }));

    const filename = `packages_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      ExportService.toCSV(exportRows, filename);
    } else {
      ExportService.toExcel(exportRows, filename, 'Packages');
    }
  };

  // Handle package view
  const handleViewPackage = async (pkg: PackageRow) => {
    setPackageToView(pkg);
    setViewModalOpen(true);
  };

  // Handle package delete
  const handleDeletePackage = async (pkg: PackageRow) => {
    setPackageToDelete(pkg);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!packageToDelete) return;
    
    setDeleting(true);
    try {
      const res = await fetch('/api/warehouse/packages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trackingNumber: packageToDelete.trackingNumber }),
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
                  <p className="text-sm uppercase tracking-widest text-blue-100">Package Management</p>
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
                  <RefreshCw className={`h-4 w-4 transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <Link
                  href="/warehouse/add-package"
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E67919] to-[#d46a0f] px-4 py-3 sm:px-6 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-sm sm:text-base"
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-blue-500" />
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-blue-500" />
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-blue-500" />
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
                    <span className="font-medium text-orange-800">Status: {selectedStatuses.length === 1 ? humanStatus(selectedStatuses[0]) : `${selectedStatuses.length} selected`}</span>
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
                {searchTerm || selectedStatuses.length > 0 || userCodeFilter 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by adding your first package'}
              </p>
              <Link
                href="/warehouse/add-package"
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
                              {pkg.trackingNumber}
                            </button>
                            <div className="text-xs text-gray-500">
                              {pkg.dateReceived ? new Date(pkg.dateReceived).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(pkg.status)}`}>
                          {humanStatus(pkg.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Customer:</span>
                          <span className="font-medium text-gray-900">{pkg.customerName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Mailbox:</span>
                          <span className="font-medium text-gray-900">{pkg.mailboxNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Shipper:</span>
                          <span className="font-medium text-gray-900">{pkg.shipper || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-medium text-gray-900">{Number(pkg.weightLbs || 0).toFixed(2)} lbs</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Value:</span>
                          <span className="font-medium text-gray-900">{formatUsd(pkg.itemValueUsd || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Days in storage:</span>
                          <span className="font-medium text-gray-900">{pkg.daysInStorage}</span>
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
                            href={`/warehouse/add-package?edit=${pkg._id}`}
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
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Value (USD)</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date Received</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Days</th>
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
                              {pkg.trackingNumber}
                            </button>
                            <div className="text-xs text-gray-500">
                              {pkg.warehouseLocation}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{pkg.customerName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{pkg.customerEmail || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pkg.mailboxNumber || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pkg.shipper || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center border px-2 py-1 text-xs font-semibold rounded-full ${getServiceBadge(pkg.serviceMode || '')}`}>
                          {String(pkg.serviceMode).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(pkg.status)}`}>
                          {humanStatus(pkg.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="inline-flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          {Number(pkg.weightLbs || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatUsd(pkg.itemValueUsd || 0)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pkg.dateReceived ? new Date(pkg.dateReceived).toLocaleDateString() : ''}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pkg.daysInStorage}</td>
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
                            <Link
                              href={`/warehouse/add-package?edit=${pkg._id}`}
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
        itemName={packageToDelete?.trackingNumber}
        loading={deleting}
      />

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
            
            <div className="p-6 space-y-6">
              {/* Package Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Package
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Tracking:</span><span className="text-sm font-medium text-gray-900 font-mono">{packageToView.trackingNumber}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Status:</span><span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(packageToView.status)}`}>{humanStatus(packageToView.status)}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Service:</span><span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getServiceBadge(packageToView?.serviceMode || '')}`}>{String(packageToView?.serviceMode || '').toUpperCase()}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Mailbox:</span><span className="text-sm font-medium text-gray-900">{packageToView.mailboxNumber || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Customer:</span><span className="text-sm font-medium text-gray-900">{packageToView.customerName || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Phone:</span><span className="text-sm font-medium text-gray-900">{packageToView.customerPhone || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Weight:</span><span className="text-sm font-medium text-gray-900">{Number(packageToView.weightLbs || 0).toFixed(2)} lbs</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Value:</span><span className="text-sm font-medium text-gray-900">{formatUsd(packageToView.itemValueUsd || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Date Received:</span><span className="text-sm font-medium text-gray-900">{packageToView.dateReceived ? new Date(packageToView.dateReceived).toLocaleDateString() : ''}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Days in Storage:</span><span className="text-sm font-medium text-gray-900">{packageToView.daysInStorage}</span></div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Additional Details
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Shipper:</span><span className="text-sm font-medium text-gray-900">{packageToView.shipper || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Warehouse:</span><span className="text-sm font-medium text-gray-900">{packageToView.warehouseLocation || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Customs Required:</span><span className="text-sm font-medium text-gray-900">{packageToView.customsRequired ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Customs Status:</span><span className="text-sm font-medium text-gray-900">{packageToView.customsStatus || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Payment Status:</span><span className="text-sm font-medium text-gray-900">{packageToView.paymentStatus || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Entry Date:</span><span className="text-sm font-medium text-gray-900">{packageToView.dateReceived ? new Date(packageToView.dateReceived).toLocaleDateString() : 'N/A'}</span></div>
                </div>
              </div>

              {/* Recipient Information */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Recipient Information
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Name:</span><span className="text-sm font-medium text-gray-900">{packageToView.recipient?.name || packageToView.receiverName || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Email:</span><span className="text-sm font-medium text-gray-900">{packageToView.recipient?.email || packageToView.receiverEmail || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Phone:</span><span className="text-sm font-medium text-gray-900">{packageToView.recipient?.phone || packageToView.receiverPhone || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Address:</span><span className="text-sm font-medium text-gray-900">{packageToView.recipient?.address || packageToView.receiverAddress || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Country:</span><span className="text-sm font-medium text-gray-900">{packageToView.recipient?.country || packageToView.receiverCountry || 'N/A'}</span></div>
                </div>
              </div>

              {/* Sender Information */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  Sender Information
                </h4>
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.sender?.name || packageToView.senderName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.sender?.email || packageToView.senderEmail || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.sender?.phone || packageToView.senderPhone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Address:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.sender?.address || packageToView.senderAddress || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Country:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.sender?.country || packageToView.senderCountry || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(packageToView.description || packageToView.itemDescription || packageToView.specialInstructions || packageToView.contents) && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    Additional Information
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {packageToView.description && packageToView.description !== packageToView.itemDescription && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 mb-1">Description:</span>
                        <span className="text-sm text-gray-600">{packageToView.description}</span>
                      </div>
                    )}
                    {packageToView.itemDescription && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 mb-1">Item Description:</span>
                        <span className="text-sm text-gray-600">{packageToView.itemDescription}</span>
                      </div>
                    )}
                    {packageToView.description && packageToView.description === packageToView.itemDescription && !packageToView.contents && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 mb-1">Description:</span>
                        <span className="text-sm text-gray-600">{packageToView.description}</span>
                      </div>
                    )}
                    {packageToView.contents && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 mb-1">Contents:</span>
                        <span className="text-sm text-gray-600">{packageToView.contents}</span>
                      </div>
                    )}
                    {packageToView.specialInstructions && (
                      <div className="flex flex-col md:col-span-2">
                        <span className="text-sm font-medium text-gray-700 mb-1">Special Instructions:</span>
                        <span className="text-sm text-gray-600">{packageToView.specialInstructions}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
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
    </div>
  );
}