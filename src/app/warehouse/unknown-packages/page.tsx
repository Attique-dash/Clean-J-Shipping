// src/app/warehouse/unknown-packages/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import {
  FaBox,
  FaUser,
  FaSearch,
  FaLink,
  FaTrash,
  FaExclamationTriangle,
} from 'react-icons/fa';
import Link from 'next/link';

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
  const router = useRouter();
  const { data: session, status } = useSession();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/warehouse/login');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unknown Packages</h1>
          <p className="text-gray-600">Packages that couldn't be matched to a customer</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md p-3 border"
            placeholder="Search by tracking #, sender name, or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Packages List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {filteredPackages.length === 0 ? (
            <li className="p-4 text-center text-gray-500">
              {searchTerm ? 'No packages match your search' : 'No unknown packages found'}
            </li>
          ) : (
            filteredPackages.map((pkg) => (
              <li key={pkg._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                        <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-yellow-800 truncate">
                            {pkg.trackingNumber}
                          </p>
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Unassigned
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          <div className="flex items-center">
                            <FaUser className="mr-1" />
                            <span>{pkg.sender?.name || 'Unknown Sender'}</span>
                          </div>
                          {pkg.sender?.email && (
                            <div className="mt-1 flex items-center text-xs text-gray-400">
                              <FaSearch className="mr-1" />
                              <span>{pkg.sender.email}</span>
                            </div>
                          )}
                          <div className="mt-1 text-xs text-gray-400">
                            <span>Received: {new Date(pkg.receivedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => {
                        // In a real app, this would open a modal to select a customer
                        const customerId = prompt('Enter customer ID:');
                        if (customerId) {
                          linkToCustomer(pkg._id, customerId);
                        }
                      }}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FaLink className="mr-1" /> Link to Customer
                    </button>
                    <button
                      onClick={() => handleDelete(pkg._id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FaTrash className="mr-1" /> Delete
                    </button>
                  </div>
                </div>
                {pkg.notes && (
                  <div className="mt-2 text-sm text-gray-500 bg-yellow-50 p-2 rounded-md">
                    <p className="font-medium">Notes:</p>
                    <p>{pkg.notes}</p>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}