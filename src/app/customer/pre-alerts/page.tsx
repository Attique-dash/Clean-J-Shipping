// src/app/customer/pre-alerts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Bell, Package, Loader2, Plus, Edit, Download, X, FileText } from "lucide-react";
import { toast } from "react-toastify";

type PreAlert = {
  _id: string;
  trackingNumber: string;
  merchant?: string;
  description?: string;
  pricePaid?: number;
  overseasCourier?: string;
  expectedDate?: string;
  status?: "submitted" | "approved" | "rejected";
  createdAt?: string;
  attachmentFiles?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    url?: string;
  }>;
};

export default function PreAlertsPage() {
  const [items, setItems] = useState<PreAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PreAlert | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    trackingNumber: '',
    description: '',
    pricePaid: '',
    merchant: '',
    overseasCourier: '',
    expectedDate: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/pre-alerts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      const list = Array.isArray(data?.pre_alerts) ? data.pre_alerts : [];
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Handle add pre-alert
  const handleAddPreAlert = async () => {
    setSubmitting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('tracking_number', formData.trackingNumber);
      formDataObj.append('description', formData.description);
      formDataObj.append('price_paid', formData.pricePaid);
      formDataObj.append('merchant', formData.merchant);
      formDataObj.append('overseas_courier', formData.overseasCourier);
      formDataObj.append('expected_date', formData.expectedDate);
      
      if (selectedFiles.length > 0) {
        formDataObj.append('file', selectedFiles[0]);
      }

      const res = await fetch('/api/customer/pre-alerts', {
        method: 'POST',
        body: formDataObj,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create pre-alert');

      toast.success('Pre-alert created successfully');
      setAddModalOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create pre-alert');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit pre-alert
  const handleEditPreAlert = async () => {
    if (!editingItem) return;
    setSubmitting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('description', formData.description);
      formDataObj.append('price_paid', formData.pricePaid);
      formDataObj.append('merchant', formData.merchant);
      formDataObj.append('overseas_courier', formData.overseasCourier);
      formDataObj.append('expected_date', formData.expectedDate);
      
      if (selectedFiles.length > 0) {
        formDataObj.append('file', selectedFiles[0]);
      }

      const res = await fetch(`/api/customer/pre-alerts/${editingItem._id}`, {
        method: 'PATCH',
        body: formDataObj,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update pre-alert');

      toast.success('Pre-alert updated successfully');
      setEditModalOpen(false);
      setEditingItem(null);
      resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update pre-alert');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete pre-alert
  const handleDeletePreAlert = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pre-alert?')) return;

    try {
      const res = await fetch(`/api/customer/pre-alerts/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete pre-alert');

      toast.success('Pre-alert deleted successfully');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete pre-alert');
    }
  };

  // Handle download file
  const handleDownloadFile = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  // Open edit modal
  const openEditModal = (item: PreAlert) => {
    setEditingItem(item);
    setFormData({
      trackingNumber: item.trackingNumber,
      description: item.description || '',
      pricePaid: item.pricePaid ? String(item.pricePaid) : '',
      merchant: item.merchant || '',
      overseasCourier: item.overseasCourier || '',
      expectedDate: item.expectedDate ? new Date(item.expectedDate).toISOString().split('T')[0] : '',
    });
    setSelectedFiles([]);
    setEditModalOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      trackingNumber: '',
      description: '',
      pricePaid: '',
      merchant: '',
      overseasCourier: '',
      expectedDate: '',
    });
    setSelectedFiles([]);
    setEditingItem(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pre-Alerts
            </h1>
            <p className="text-gray-500 mt-1">Notify us about incoming shipments</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f4d8a] text-white rounded-xl hover:bg-[#1e6bb8] transition-all font-medium shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Add Alert
          </button>
        </div>

        {/* Pre-Alerts List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                <span className="ml-3 text-gray-600">Loading pre-alerts...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No pre-alerts yet</h3>
                <p className="text-sm text-gray-500 mb-6">Click "Add Alert" to notify us about incoming shipments.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div 
                    key={item._id} 
                    className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-[#0f4d8a]">
                          <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                            <Package className="h-5 w-5" />
                          </div>
                          <span className="font-bold text-base text-gray-900 truncate max-w-[140px]" title={item.trackingNumber}>
                            {item.trackingNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Edit pre-alert"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeletePreAlert(item._id)}
                            className="p-2 bg-gray-100 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete pre-alert"
                          >
                            <X className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Merchant:</span>
                          <span className="text-gray-900 font-medium">{item.merchant || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Courier:</span>
                          <span className="text-gray-900 font-medium">{item.overseasCourier || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Price:</span>
                          <span className="text-gray-900 font-medium">${item.pricePaid ? item.pricePaid.toFixed(2) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Expected:</span>
                          <span className="text-gray-900 font-medium">{item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* Attachments Section */}
                      {item.attachmentFiles && item.attachmentFiles.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {item.attachmentFiles.map((file, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleDownloadFile(file.url)}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="truncate max-w-[150px]">{file.originalName}</span>
                                <Download className="h-4 w-4" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Pre-Alert Modal */}
      {(addModalOpen || editModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editModalOpen ? 'Edit Alert' : 'Add Alert'}
              </h2>
              <button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Paid</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricePaid}
                  onChange={(e) => setFormData({ ...formData, pricePaid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Amazon, eBay"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overseas Courier</label>
                <select
                  value={formData.overseasCourier}
                  onChange={(e) => setFormData({ ...formData, overseasCourier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select courier</option>
                  <option value="DHL">DHL</option>
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                  <option value="USPS">USPS</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival Date *</label>
                <input
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking # *</label>
                <input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  disabled={editModalOpen}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter tracking number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Choose file (Invoice/Receipt)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, idx) => (
                      <p key={idx} className="text-sm text-gray-600">{file.name}</p>
                    ))}
                  </div>
                )}
                {editingItem?.attachmentFiles && editingItem.attachmentFiles.length > 0 && selectedFiles.length === 0 && (
                  <div className="mt-2 space-y-1">
                    {editingItem.attachmentFiles.map((file, idx) => (
                      <p key={idx} className="text-sm text-gray-500">Current file: {file.originalName}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={editModalOpen ? handleEditPreAlert : handleAddPreAlert}
                  disabled={submitting || !formData.trackingNumber || !formData.expectedDate}
                  className="px-4 py-2 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#1e6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'SAVE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}