// src/app/admin/unknown-packages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  User,
  Search,
  Trash2,
  AlertTriangle,
  Mail,
  Loader2,
  Package,
  Calendar,
  ExternalLink,
  RefreshCw,
  Filter,
  ChevronRight,
  Package2,
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';

interface UnknownPackage {
  _id: string;
  trackingNumber: string;
  sender: {
    name: string;
    email?: string;
    phone?: string;
  };
  receivedAt: string;
  notes?: string;
}

export default function UnknownPackagesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<UnknownPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; pkg: UnknownPackage | null }>({ open: false, pkg: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/warehouse/packages/unknown');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load packages');
      setPackages(data.packages);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Failed to load unknown packages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') fetchPackages();
  }, [status]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPackages();
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.sender?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.sender?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const linkToCustomer = async (packageId: string, customerId: string) => {
    try {
      const res = await fetch(`/api/warehouse/packages/${packageId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      if (!res.ok) throw new Error('Failed to link package');
      setPackages(packages.filter(pkg => pkg._id !== packageId));
      toast.success('Package linked successfully');
    } catch (error) {
      console.error('Error linking package:', error);
      toast.error('Failed to link package');
    }
  };

  const handleDelete = async (packageId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/warehouse/packages/${packageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete package');
      setPackages(packages.filter(pkg => pkg._id !== packageId));
      toast.success('Package deleted successfully');
      setDeleteConfirm({ open: false, pkg: null });
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Failed to delete package');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Package className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight md:text-4xl">Unknown Packages</h1>
                <p className="text-blue-100 mt-1">
                  Total unmatched: <span className="font-semibold">{packages.length}</span>
                </p>
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
            </div>
          </div>
        </header>

        {/* ── Alert Banner ── */}
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Packages Require Attention</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              These packages couldn&apos;t be matched to a customer. Link them to the correct customer or delete if invalid.
            </p>
          </div>
        </div>

        {/* ── Search & Filter ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Packages
            </h2>
          </div>
          <div className="p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full h-12 pl-10 pr-4 text-sm border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Search by tracking number, sender name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm">
                  <Search className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">"{searchTerm}"</span>
                  <button onClick={() => setSearchTerm('')} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                </div>
                <button onClick={() => setSearchTerm('')} className="text-sm text-gray-600 hover:text-gray-800 underline">
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Packages List ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Package List
              </h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">
                  {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No packages match your search' : 'No Unknown Packages'}
              </h3>
              <p className="text-sm text-gray-600">
                {searchTerm ? 'Try adjusting your search term' : 'All packages have been matched to customers'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Package Info</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sender</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Received</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900 font-mono">{pkg.trackingNumber}</span>
                              <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Unassigned
                              </span>
                            </div>
                            {pkg.notes && (
                              <p className="text-xs text-gray-500 mt-0.5">{pkg.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-900">
                            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span>{pkg.sender?.name || 'Unknown Sender'}</span>
                          </div>
                          {pkg.sender?.email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span>{pkg.sender.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span>{new Date(pkg.receivedAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => {
                              const customerId = prompt('Enter customer ID:');
                              if (customerId) linkToCustomer(pkg._id, customerId);
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-white rounded-md hover:bg-blue-50 transition-all shadow-sm"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Link
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, pkg })}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-white rounded-md hover:bg-red-50 transition-all shadow-sm"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation ── */}
      <DeleteConfirmationModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, pkg: null })}
        onConfirm={() => deleteConfirm.pkg && handleDelete(deleteConfirm.pkg._id)}
        title="Delete Package"
        message={`Are you sure you want to delete package "${deleteConfirm.pkg?.trackingNumber}"? This action cannot be undone.`}
        itemName={deleteConfirm.pkg?.trackingNumber}
        loading={deleting}
      />
    </div>
  );
}