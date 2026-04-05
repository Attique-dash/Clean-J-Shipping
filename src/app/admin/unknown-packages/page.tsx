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
  ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AddButton from '@/components/admin/AddButton';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import SharedModal from '@/components/admin/SharedModal';

interface Package {
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
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load unknown packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await fetch('/api/warehouse/packages/unknown');
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load packages');
        }

        setPackages(data.packages);
      } catch (error) {
        console.error('Error loading packages:', error);
        toast.error('Failed to load unknown packages');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchPackages();
    }
  }, [status]);

  // Filter packages based on search term
  const filteredPackages = packages.filter(pkg => 
    pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.sender?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.sender?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Link package to customer
  const linkToCustomer = async (packageId: string, customerId: string) => {
    try {
      const res = await fetch(`/api/warehouse/packages/${packageId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      if (!res.ok) {
        throw new Error('Failed to link package');
      }

      // Remove from the list
      setPackages(packages.filter(pkg => pkg._id !== packageId));
      toast.success('Package linked successfully');
    } catch (error) {
      console.error('Error linking package:', error);
      toast.error('Failed to link package');
    }
  };

  // Delete package
  const handleDelete = async (packageId: string) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;

    try {
      const res = await fetch(`/api/warehouse/packages/${packageId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete package');
      }

      // Remove from the list
      setPackages(packages.filter(pkg => pkg._id !== packageId));
      toast.success('Package deleted successfully');
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Failed to delete package');
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; pkg: Package | null }>({ open: false, pkg: null });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-[#0f4d8a]" />
            Unknown Packages
          </h1>
          <p className="text-gray-500 mt-1">
            Packages that couldn&apos;t be matched to a customer
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            className="pl-10"
            placeholder="Search by tracking #, sender name, or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {/* Packages Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Received
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {searchTerm ? 'No packages match your search' : 'No unknown packages found'}
                    </h3>
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{pkg.trackingNumber}</span>
                            <Badge className="bg-yellow-100 text-yellow-800">Unassigned</Badge>
                          </div>
                          {pkg.notes && (
                            <p className="text-sm text-gray-500 mt-1">{pkg.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-gray-900">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{pkg.sender?.name || 'Unknown Sender'}</span>
                        </div>
                        {pkg.sender?.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{pkg.sender.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(pkg.receivedAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const customerId = prompt('Enter customer ID:');
                            if (customerId) {
                              linkToCustomer(pkg._id, customerId);
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm({ open: true, pkg })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation */}
      <DeleteConfirmationModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, pkg: null })}
        onConfirm={() => deleteConfirm.pkg && handleDelete(deleteConfirm.pkg._id)}
        title="Delete Package"
        message={`Are you sure you want to delete package "${deleteConfirm.pkg?.trackingNumber}"? This action cannot be undone.`}
      />
    </div>
  );
}