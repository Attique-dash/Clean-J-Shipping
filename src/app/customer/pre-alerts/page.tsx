// src/app/customer/pre-alerts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Bell, Package, Loader2, CheckCircle, XCircle, Clock, Plane, MapPin, Calendar, FileText, Send, Plus, Edit, Download, X, Upload } from "lucide-react";
import { toast } from "react-toastify";

type PreAlert = {
  _id: string;
  trackingNumber: string;
  carrier?: string;
  origin?: string;
  expectedDate?: string;
  notes?: string;
  status?: "submitted" | "approved" | "rejected";
  decidedAt?: string;
  createdAt?: string;
  description?: string;
  pricePaid?: number;
  overseasCourier?: string;
  attachmentFile?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    url?: string;
  };
};

type Alert = {
  type: 'package' | 'bill' | 'message';
  id: string;
  message: string;
  createdAt?: string;
  trackingNumber?: string;
  invoiceNumber?: string;
  status?: string;
  read?: boolean;
};

export default function PreAlertsPage() {
  const [items, setItems] = useState<PreAlert[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
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
    carrier: '',
    origin: '',
    expectedDate: '',
    description: '',
    pricePaid: '',
    overseasCourier: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/pre-alerts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      const list = Array.isArray(data?.pre_alerts) ? data.pre_alerts : [];
      setItems(list);
      
      // Combine alerts from packages, bills, and messages
      const allAlerts: Alert[] = [
        ...(data?.alerts?.packages || []),
        ...(data?.alerts?.bills || []),
        ...(data?.alerts?.messages || [])
      ].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setAlerts(allAlerts);
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
      formDataObj.append('carrier', formData.carrier);
      formDataObj.append('origin', formData.origin);
      formDataObj.append('expected_date', formData.expectedDate);
      formDataObj.append('description', formData.description);
      formDataObj.append('price_paid', formData.pricePaid);
      formDataObj.append('overseas_courier', formData.overseasCourier);
      formDataObj.append('notes', formData.notes);
      if (selectedFile) {
        formDataObj.append('file', selectedFile);
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
      formDataObj.append('carrier', formData.carrier);
      formDataObj.append('origin', formData.origin);
      formDataObj.append('expected_date', formData.expectedDate);
      formDataObj.append('description', formData.description);
      formDataObj.append('price_paid', formData.pricePaid);
      formDataObj.append('overseas_courier', formData.overseasCourier);
      formDataObj.append('notes', formData.notes);
      if (selectedFile) {
        formDataObj.append('file', selectedFile);
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
  const handleDownloadFile = (attachmentFile: PreAlert['attachmentFile']) => {
    if (!attachmentFile || !attachmentFile.url) return;
    window.open(attachmentFile.url, '_blank');
  };

  // Open edit modal
  const openEditModal = (item: PreAlert) => {
    setEditingItem(item);
    setFormData({
      trackingNumber: item.trackingNumber,
      carrier: item.carrier || '',
      origin: item.origin || '',
      expectedDate: item.expectedDate ? new Date(item.expectedDate).toISOString().split('T')[0] : '',
      description: item.description || '',
      pricePaid: item.pricePaid ? String(item.pricePaid) : '',
      overseasCourier: item.overseasCourier || '',
      notes: item.notes || '',
    });
    setSelectedFile(null);
    setEditModalOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      trackingNumber: '',
      carrier: '',
      origin: '',
      expectedDate: '',
      description: '',
      pricePaid: '',
      overseasCourier: '',
      notes: '',
    });
    setSelectedFile(null);
    setEditingItem(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  function getStatusInfo(status?: PreAlert["status"]) {
    switch (status) {
      case "approved":
        return {
          label: "Approved",
          icon: CheckCircle,
          bgColor: "bg-green-100 text-green-800 border-green-200",
          iconColor: "text-green-600",
        };
      case "rejected":
        return {
          label: "Rejected",
          icon: XCircle,
          bgColor: "bg-red-100 text-red-800 border-red-200",
          iconColor: "text-red-600",
        };
      default:
        return {
          label: "Submitted",
          icon: Clock,
          bgColor: "bg-yellow-100 text-yellow-800 border-yellow-200",
          iconColor: "text-yellow-600",
        };
    }
  }

  const stats = {
    total: items.length,
    approved: items.filter(i => i.status === "approved").length,
    pending: items.filter(i => i.status === "submitted" || !i.status).length,
    rejected: items.filter(i => i.status === "rejected").length,
  };

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
          {/* Header Section */}
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Bell className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-widest text-blue-100">Customer Portal</p>
                    <h1 className="text-3xl font-bold leading-tight md:text-4xl">Pre-Alerts</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notify us about incoming shipments
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                        Data Loaded
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#E67919] to-[#d46a0f] text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Add Pre-Alert
                </button>
              </div>
            </div>
          </header>

          {/* Stats Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Pre-Alert Statistics
              </h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Pre-Alerts */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] shadow-lg">
                      <Package className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Total Pre-Alerts</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>

                {/* Approved */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                      <CheckCircle className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{stats.approved}</p>
                  </div>
                </div>

                {/* Pending */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg">
                      <Clock className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{stats.pending}</p>
                  </div>
                </div>

                {/* Rejected */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                      <XCircle className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{stats.rejected}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Alerts List Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Pre-Alerts List
              </h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin" />
                  <span className="ml-3 text-gray-600">Loading pre-alerts...</span>
                </div>
              ) : items.length === 0 && alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No pre-alerts yet</h3>
                  <p className="text-sm text-gray-500 mb-6">Pre-alerts will appear here when packages are added, bills are created, or messages are sent.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Alerts Section */}
                  {alerts.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Bell className="h-5 w-5 text-[#E67919]" />
                        Recent Activity Alerts
                      </h3>
                      <div className="space-y-3">
                        {alerts.slice(0, 10).map((alert) => (
                          <div key={alert.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl p-4 border border-gray-200 transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  alert.type === 'package' ? 'bg-blue-100 text-blue-600' :
                                  alert.type === 'bill' ? 'bg-orange-100 text-orange-600' :
                                  'bg-green-100 text-green-600'
                                }`}>
                                  {alert.type === 'package' ? <Package className="h-4 w-4" /> :
                                   alert.type === 'bill' ? <FileText className="h-4 w-4" /> :
                                   <Send className="h-4 w-4" />}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                                  {alert.trackingNumber && (
                                    <p className="text-xs text-gray-500 mt-1">Tracking: {alert.trackingNumber}</p>
                                  )}
                                  {alert.invoiceNumber && (
                                    <p className="text-xs text-gray-500 mt-1">Invoice: {alert.invoiceNumber}</p>
                                  )}
                                  {alert.createdAt && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(alert.createdAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {alert.type === 'message' && !alert.read && (
                                <span className="flex-shrink-0 w-2 h-2 bg-[#E67919] rounded-full"></span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Pre-Alerts Section */}
                  {items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-[#0f4d8a]" />
                        Pre-Alerts List
                      </h3>
                      <div className="space-y-4">
                        {items.map((item) => {
                          const statusInfo = getStatusInfo(item.status);
                          const StatusIcon = statusInfo.icon;

                    return (
                      <div 
                        key={item._id} 
                        className="bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg"
                      >
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-white/20 rounded-lg">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  Tracking: {item.trackingNumber}
                                </p>
                                <p className="text-xs text-blue-100">
                                  Created: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border ${statusInfo.bgColor}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                                  title="Edit pre-alert"
                                >
                                  <Edit className="h-4 w-4 text-white" />
                                </button>
                                {item.attachmentFile && (
                                  <button
                                    onClick={() => handleDownloadFile(item.attachmentFile)}
                                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                                    title="Download attachment"
                                  >
                                    <Download className="h-4 w-4 text-white" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-6">
                          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {/* Carrier */}
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                                <Plane className="h-5 w-5 text-[#0f4d8a]" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Carrier</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {item.carrier || <span className="text-gray-400">Not specified</span>}
                                </p>
                              </div>
                            </div>

                            {/* Origin */}
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 p-2 bg-orange-50 rounded-lg">
                                <MapPin className="h-5 w-5 text-[#E67919]" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Origin</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {item.origin || <span className="text-gray-400">Not specified</span>}
                                </p>
                              </div>
                            </div>

                            {/* Expected Date */}
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 p-2 bg-cyan-50 rounded-lg">
                                <Calendar className="h-5 w-5 text-[#0891b2]" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Expected Arrival</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {item.expectedDate 
                                    ? new Date(item.expectedDate).toLocaleDateString()
                                    : <span className="text-gray-400">Not set</span>
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Decision Date */}
                            {item.decidedAt && (
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 p-2 bg-purple-50 rounded-lg">
                                  <Clock className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Decided On</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {new Date(item.decidedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Notes Section */}
                          {item.notes && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg">
                                  <FileText className="h-5 w-5 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-500 mb-2">Additional Notes</p>
                                  <p className="text-sm text-gray-700 bg-gradient-to-r from-slate-50 to-blue-50 p-3 rounded-lg">
                                    {item.notes}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  
                  {items.length === 0 && alerts.length === 0 && (
                    <div className="text-center py-12">
                      <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts yet</h3>
                      <p className="text-sm text-gray-500 mb-6">Alerts will appear here when packages are added, bills are created, or messages are sent.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Pre-Alert Modal */}
      {(addModalOpen || editModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editModalOpen ? 'Edit Pre-Alert' : 'Add New Pre-Alert'}
              </h2>
              <button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number *</label>
                  <input
                    type="text"
                    value={formData.trackingNumber}
                    onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                    disabled={editModalOpen}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter tracking number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carrier *</label>
                  <input
                    type="text"
                    value={formData.carrier}
                    onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Amazon, FedEx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin *</label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., USA, China"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date *</label>
                  <input
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overseas Courier</label>
                  <input
                    type="text"
                    value={formData.overseasCourier}
                    onChange={(e) => setFormData({ ...formData, overseasCourier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., DHL, UPS"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the items in the shipment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional notes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Invoice/Receipt)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {selectedFile && (
                    <span className="text-sm text-gray-600 truncate max-w-[200px]">{selectedFile.name}</span>
                  )}
                </div>
                {editingItem?.attachmentFile && !selectedFile && (
                  <p className="text-sm text-gray-500 mt-1">
                    Current file: {editingItem.attachmentFile.originalName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editModalOpen ? handleEditPreAlert : handleAddPreAlert}
                disabled={submitting || !formData.trackingNumber || !formData.carrier || !formData.origin || !formData.expectedDate}
                className="px-4 py-2 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#1e6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (editModalOpen ? 'Update Pre-Alert' : 'Create Pre-Alert')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}