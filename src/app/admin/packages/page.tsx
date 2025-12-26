// src/app/admin/packages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
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
  Mail,
  Calendar,
  X
} from 'lucide-react';
import Link from 'next/link';
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";

interface Package {
  _id: string;
  trackingNumber: string;
  status: 'received' | 'in_transit' | 'delivered' | 'unknown';
  userCode?: string;
  weight?: number;
  shipper?: string;
  description?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    weight?: number;
    weightUnit?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  branch?: string;
  manifestId?: string;
  recipient?: {
    name?: string;
    shippingId?: string;
  };
  // Database fields for recipient info
  receiverName?: string;
  receiverEmail?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  // Database fields for sender info
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderAddress?: string;
  senderCountry?: string;
  // Dimension fields
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  // Package details
  itemDescription?: string;
  itemValue?: number;
  contents?: string;
  specialInstructions?: string;
}

export default function AdminPackagesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userCodeFilter, setUserCodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // View package modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [packageToView, setPackageToView] = useState<Package | null>(null);

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

  // Load packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const params = new URLSearchParams();
        if (userCodeFilter) params.set('userCode', userCodeFilter);
        if (searchTerm) params.set('q', searchTerm);
        if (statusFilter) params.set('status', statusFilter);
        
        const res = await fetch(`/api/admin/packages?${params.toString()}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          setPackages(data.packages || []);
        } else {
          throw new Error(data.message || 'Failed to load packages');
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
  }, [status, userCodeFilter, searchTerm, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    // Trigger useEffect to refetch
  };

  // Filter packages based on search term (already filtered by API, but keep for client-side filtering if needed)
  const filteredPackages = packages;

  // Handle package view
  const handleViewPackage = async (pkg: Package) => {
    setPackageToView(pkg);
    setViewModalOpen(true);
  };

  // Handle package delete
  const handleDeletePackage = async (pkg: Package) => {
    setPackageToDelete(pkg);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!packageToDelete) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/packages?trackingNumber=${packageToDelete.trackingNumber}`, {
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
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
                  href="/admin/add-package"
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
                  placeholder="Search by tracking #, customer name, or ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-blue-500" />
                </div>
                <select
                  className="block w-full h-12 pl-10 pr-8 text-sm border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="received">Received</option>
                  <option value="in_processing">In Processing</option>
                  <option value="ready_to_ship">Ready to Ship</option>
                  <option value="shipped">Shipped</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

          {/* Active Filters */}
            {(userCodeFilter || statusFilter) && (
              <div className="flex flex-wrap items-center gap-2">
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
                {statusFilter && (
                  <div className="flex items-center gap-2 rounded-lg bg-orange-100 px-3 py-1.5 text-sm">
                    <Filter className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Status: {statusFilter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <button
                      onClick={() => setStatusFilter('')}
                      className="ml-1 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setUserCodeFilter('');
                    setStatusFilter('');
                    setSearchTerm('');
                  }}
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
          
          {filteredPackages.length === 0 ? (
            <div className="p-12 text-center">
              <Package2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
              <p className="text-sm text-gray-600 mb-6">
                {searchTerm || statusFilter || userCodeFilter 
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
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 font-mono">
                              {pkg.trackingNumber}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(pkg.createdAt || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pkg.status === 'received' ? 'bg-green-100 text-green-800' :
                          pkg.status === 'in_processing' ? 'bg-purple-100 text-purple-800' :
                          pkg.status === 'ready_to_ship' ? 'bg-orange-100 text-orange-800' :
                          pkg.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          pkg.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                          pkg.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pkg.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Recipient:</span>
                          <span className="font-medium text-gray-900">{pkg.recipient?.name || pkg.receiverName || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Dimensions:</span>
                          <span className="font-medium text-gray-900">
                            {(pkg.dimensions?.length || pkg.length || 'N/A')}×{(pkg.dimensions?.width || pkg.width || 'N/A')}×{(pkg.dimensions?.height || pkg.height || 'N/A')} {pkg.dimensions?.unit || pkg.dimensionUnit || 'cm'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-medium text-gray-900">{(pkg.dimensions?.weight || pkg.weight || 'N/A')} {(pkg.dimensions?.weightUnit || pkg.weightUnit || 'kg')}</span>
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
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Package</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Dimensions</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 font-mono">
                              {pkg.trackingNumber}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(pkg.createdAt || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {pkg.recipient?.name || pkg.receiverName || 'Unknown'}
                        </div>
                        {(pkg.recipient?.shippingId || pkg.shipper) && (
                          <div className="text-xs text-gray-500 mt-1">
                            ID: <span className="font-mono">{pkg.recipient?.shippingId || pkg.shipper || 'N/A'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {(pkg.dimensions?.length || pkg.length || 'N/A')}×{(pkg.dimensions?.width || pkg.width || 'N/A')}×{(pkg.dimensions?.height || pkg.height || 'N/A')} {pkg.dimensions?.unit || pkg.dimensionUnit || 'cm'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Weight className="h-3 w-3 mr-1" />
                          {(pkg.dimensions?.weight || pkg.weight || 'N/A')} {(pkg.dimensions?.weightUnit || pkg.weightUnit || 'kg')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pkg.status === 'received' ? 'bg-green-100 text-green-800' :
                          pkg.status === 'in_processing' ? 'bg-purple-100 text-purple-800' :
                          pkg.status === 'ready_to_ship' ? 'bg-orange-100 text-orange-800' :
                          pkg.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          pkg.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                          pkg.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pkg.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
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
            
            <div className="p-6 space-y-8">
              {/* Package Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Package Information
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tracking Number:</span>
                      <span className="text-sm font-medium text-gray-900 font-mono">{packageToView.trackingNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        packageToView.status === 'received' ? 'bg-green-100 text-green-800' :
                        packageToView.status === 'in_processing' ? 'bg-purple-100 text-purple-800' :
                        packageToView.status === 'ready_to_ship' ? 'bg-orange-100 text-orange-800' :
                        packageToView.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        packageToView.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                        packageToView.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {packageToView.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Weight:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.weight || 'N/A'} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dimensions:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {(packageToView.dimensions?.length || packageToView.length || 'N/A')}×{(packageToView.dimensions?.width || packageToView.width || 'N/A')}×{(packageToView.dimensions?.height || packageToView.height || 'N/A')} {packageToView.dimensions?.unit || packageToView.dimensionUnit || 'cm'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Shipper:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.shipper || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipient Information */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Recipient Information
                </h4>
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.recipient?.name || packageToView.receiverName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.recipient?.email || packageToView.receiverEmail || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.recipient?.phone || packageToView.receiverPhone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Address:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.recipient?.address || packageToView.receiverAddress || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Country:</span>
                      <span className="text-sm font-medium text-gray-900">{packageToView.recipient?.country || packageToView.receiverCountry || 'N/A'}</span>
                    </div>
                  </div>
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

              {/* Additional Details */}
              {(packageToView.description || packageToView.itemDescription || packageToView.contents || packageToView.specialInstructions) && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    Additional Information
                  </h4>
                  <div className="space-y-4">
                    {packageToView.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Description: </span>
                        <span className="text-sm text-gray-600">{packageToView.description}</span>
                      </div>
                    )}
                    {packageToView.itemDescription && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Item Description: </span>
                        <span className="text-sm text-gray-600">{packageToView.itemDescription}</span>
                      </div>
                    )}
                    {packageToView.contents && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Contents: </span>
                        <span className="text-sm text-gray-600">{packageToView.contents}</span>
                      </div>
                    )}
                    {packageToView.specialInstructions && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Special Instructions: </span>
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