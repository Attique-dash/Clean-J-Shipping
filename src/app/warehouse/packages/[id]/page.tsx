// src/app/warehouse/packages/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaBox,
  FaEdit,
  FaSave,
  FaTimes,
  FaTrash,
  FaCheck,
  FaExclamationTriangle,
} from 'react-icons/fa';
import Link from 'next/link';

interface Package {
  _id: string;
  trackingNumber: string;
  status: 'received' | 'in_transit' | 'delivered' | 'unknown';
  sender: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  recipient: {
    name: string;
    email: string;
    shippingId: string;
    phone?: string;
    address?: string;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
    weight: number;
    weightUnit: 'kg' | 'lb';
  };
  receivedAt: string;
  notes?: string;
  history: Array<{
    status: string;
    timestamp: string;
    notes?: string;
    location?: string;
    updatedBy: string;
  }>;
}

export default function PackageDetailsPage() {
  const params = useParams() as { id?: string } | null;
  const id = params?.id;
  const router = useRouter();
  const { data: _session } = useSession();
  const [pkg, setPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Package>>({});
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    notes: '',
    location: '',
  });

  // Load package details
  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const res = await fetch(`/api/warehouse/packages/${id}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load package');
        }

        setPackage(data);
        setFormData(data);
        setStatusUpdate(prev => ({ ...prev, status: data.status }));
      } catch (error) {
        console.error('Error loading package:', error);
        toast.error('Failed to load package details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPackage();
    }
  }, [id]);

  // Handle form input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle dimension changes
  const handleDimensionChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions!,
        [field]: field === 'length' || field === 'width' || field === 'height' || field === 'weight' 
          ? parseFloat(value) || 0 
          : value,
      },
    }));
  };

  // Save package updates
  const handleSave = async () => {
    try {
      const res = await fetch(`/api/warehouse/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to update package');
      }

      const updatedPackage = await res.json();
      setPackage(updatedPackage);
      setFormData(updatedPackage);
      setEditing(false);
      toast.success('Package updated successfully');
    } catch (error) {
      console.error('Error updating package:', error);
      toast.error('Failed to update package');
    }
  };

  // Update package status
  const handleStatusUpdate = async () => {
    if (!statusUpdate.status) return;

    try {
      const res = await fetch(`/api/warehouse/packages/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusUpdate),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      const updatedPackage = await res.json();
      setPackage(updatedPackage);
      setStatusUpdate({ status: updatedPackage.status, notes: '', location: '' });
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Delete package
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;

    try {
      const res = await fetch(`/api/warehouse/packages/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete package');
      }

      toast.success('Package deleted successfully');
      router.push('/warehouse/packages');
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

  if (!pkg) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Package not found</h2>
          <p className="text-gray-600 mb-6">The requested package could not be found.</p>
          <Link
            href="/warehouse/packages"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FaArrowLeft className="mr-2" /> Back to Packages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/warehouse/packages"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <FaArrowLeft className="mr-2" /> Back to Packages
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Package Details</h1>
          <div className="flex space-x-2">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FaEdit className="mr-2" /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <FaTrash className="mr-2" /> Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <FaSave className="mr-2" /> Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData(pkg);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FaTimes className="mr-2" /> Cancel
                </button>
              </>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500">Tracking #: {pkg.trackingNumber}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Package Information
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="received">Received</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        pkg.status === 'received' ? 'bg-green-100 text-green-800' :
                        pkg.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                        pkg.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pkg.status.replace('_', ' ')}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Tracking Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <input
                        type="text"
                        name="trackingNumber"
                        value={formData.trackingNumber || ''}
                        onChange={handleInputChange}
                        className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                      />
                    ) : (
                      pkg.trackingNumber
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Received At</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(pkg.receivedAt).toLocaleString()}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <textarea
                        name="notes"
                        rows={3}
                        value={formData.notes || ''}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                      />
                    ) : (
                      pkg.notes || 'No notes'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Sender Information */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Sender Information
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <input
                        type="text"
                        name="sender.name"
                        value={formData.sender?.name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          sender: {
                            name: e.target.value,
                            email: prev.sender?.email,
                            phone: prev.sender?.phone,
                            address: prev.sender?.address,
                          }
                        }))}
                        className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                      />
                    ) : (
                      pkg.sender?.name || 'Unknown'

                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <input
                        type="email"
                        name="sender.email"
                        value={formData.sender?.email || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          sender: {
                            name: prev.sender?.name ?? pkg.sender?.name ?? '',
                            email: e.target.value,
                            phone: prev.sender?.phone,
                            address: prev.sender?.address,
                          }
                        }))}
                        className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"

                      />
                    ) : (
                      pkg.sender?.email || 'Not provided'
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <input
                        type="tel"
                        name="sender.phone"
                        value={formData.sender?.phone || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          sender: {
                            name: prev.sender?.name ?? pkg.sender?.name ?? '',
                            email: prev.sender?.email,
                            phone: e.target.value,
                            address: prev.sender?.address,
                          }
                        }))}
                        className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"

                      />
                    ) : (
                      pkg.sender?.phone || 'Not provided'
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <textarea
                        name="sender.address"
                        rows={2}
                        value={formData.sender?.address || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          sender: {
                            name: prev.sender?.name ?? pkg.sender?.name ?? '',
                            email: prev.sender?.email,
                            phone: prev.sender?.phone,
                            address: e.target.value,
                          }
                        }))}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md"

                      />
                    ) : (
                      pkg.sender?.address || 'Not provided'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Recipient Information */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recipient Information
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <input
                        type="text"
                        name="recipient.name"
                        value={formData.recipient?.name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recipient: {
                            name: e.target.value,
                            email: prev.recipient?.email ?? '',
                            shippingId: prev.recipient?.shippingId ?? '',
                            phone: prev.recipient?.phone,
                            address: prev.recipient?.address,
                          }
                        }))}
                        className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                      />
                    ) : (
                      pkg.recipient?.name || 'Unknown'
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <input
                        type="email"
                        name="recipient.email"
                        value={formData.recipient?.email || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recipient: {
                            name: prev.recipient?.name ?? '',
                            email: e.target.value,
                            shippingId: prev.recipient?.shippingId ?? '',
                            phone: prev.recipient?.phone,
                            address: prev.recipient?.address,
                          }
                        }))}
                        className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                      />
                    ) : (
                      pkg.recipient?.email || 'Not provided'
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Shipping ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <input
                        type="text"
                        name="recipient.shippingId"
                        value={formData.recipient?.shippingId || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recipient: {
                            name: prev.recipient?.name ?? '',
                            email: prev.recipient?.email ?? '',
                            shippingId: e.target.value,
                            phone: prev.recipient?.phone,
                            address: prev.recipient?.address,
                          }
                        }))}
                        className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                      />
                    ) : (
                      pkg.recipient?.shippingId || 'Not assigned'
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <input
                        type="tel"
                        name="recipient.phone"
                        value={formData.recipient?.phone || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recipient: {
                            name: prev.recipient?.name ?? '',
                            email: prev.recipient?.email ?? '',
                            shippingId: prev.recipient?.shippingId ?? '',
                            phone: e.target.value,
                            address: prev.recipient?.address,
                          }
                        }))}
                        className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                      />
                    ) : (
                      pkg.recipient?.phone || 'Not provided'
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <textarea
                        name="recipient.address"
                        rows={2}
                        value={formData.recipient?.address || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recipient: {
                            name: prev.recipient?.name ?? '',
                            email: prev.recipient?.email ?? '',
                            shippingId: prev.recipient?.shippingId ?? '',
                            phone: prev.recipient?.phone,
                            address: e.target.value,
                          }
                        }))}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                      />
                    ) : (
                      pkg.recipient?.address || 'Not provided'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Package Dimensions */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Package Dimensions
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Length</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <div className="flex rounded-md shadow-sm">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.dimensions?.length || ''}
                          onChange={(e) => handleDimensionChange('length', e.target.value)}
                          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                          placeholder="0.00"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          {formData.dimensions?.unit || 'cm'}
                        </span>
                      </div>
                    ) : (
                      `${pkg.dimensions.length} ${pkg.dimensions.unit}`
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Width</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <div className="flex rounded-md shadow-sm">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.dimensions?.width || ''}
                          onChange={(e) => handleDimensionChange('width', e.target.value)}
                          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                          placeholder="0.00"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          {formData.dimensions?.unit || 'cm'}
                        </span>
                      </div>
                    ) : (
                      `${pkg.dimensions.width} ${pkg.dimensions.unit}`
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Height</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <div className="flex rounded-md shadow-sm">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.dimensions?.height || ''}
                          onChange={(e) => handleDimensionChange('height', e.target.value)}
                          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                          placeholder="0.00"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          {formData.dimensions?.unit || 'cm'}
                        </span>
                      </div>
                    ) : (
                      `${pkg.dimensions.height} ${pkg.dimensions.unit}`
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Weight</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editing ? (
                      <div className="flex rounded-md shadow-sm">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.dimensions?.weight || ''}
                          onChange={(e) => handleDimensionChange('weight', e.target.value)}
                          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                          placeholder="0.00"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          {formData.dimensions?.weightUnit || 'kg'}
                        </span>
                      </div>
                    ) : (
                      `${pkg.dimensions.weight} ${pkg.dimensions.weightUnit}`
                    )}
                  </dd>
                </div>
                {editing && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Unit</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <select
                        value={formData.dimensions?.unit || 'cm'}
                        onChange={(e) => handleDimensionChange('unit', e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="cm">Centimeters (cm)</option>
                        <option value="in">Inches (in)</option>
                      </select>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Status Update */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Update Status
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Select status</option>
                  <option value="received">Received</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="exception">Exception</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={statusUpdate.location}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, location: e.target.value })}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., New York Warehouse"
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional information..."
                />
              </div>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={!statusUpdate.status}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  statusUpdate.status
                    ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Update Status
              </button>
            </div>
          </div>

          {/* Package History */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Package History
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <div className="flow-root">
                <ul className="-mb-8">
                  {pkg.history?.length > 0 ? (
                    pkg.history.map((event, index) => (
                      <li key={index}>
                        <div className="relative pb-8">
                          {index !== pkg.history.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span
                                className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                  event.status === 'delivered'
                                    ? 'bg-green-500'
                                    : event.status === 'exception'
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'
                                }`}
                              >
                                {event.status === 'delivered' ? (
                                  <FaCheck className="h-5 w-5 text-white" />
                                ) : event.status === 'exception' ? (
                                  <FaExclamationTriangle className="h-5 w-5 text-white" />
                                ) : (
                                  <FaBox className="h-5 w-5 text-white" />
                                )}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500 capitalize">
                                  {event.status.replace('_', ' ')}
                                </p>
                                {event.notes && (
                                  <p className="text-sm text-gray-500">{event.notes}</p>
                                )}
                                {event.location && (
                                  <p className="text-xs text-gray-400">{event.location}</p>
                                )}
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={event.timestamp}>
                                  {new Date(event.timestamp).toLocaleString()}
                                </time>
                                <p className="text-xs text-gray-400">{event.updatedBy}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No history available
                    </div>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}