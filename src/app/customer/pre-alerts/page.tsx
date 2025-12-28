// src/app/customer/pre-alerts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Bell, Package, Plus, X, Loader2, CheckCircle, XCircle, Clock, Plane, MapPin, Calendar, FileText, Send } from "lucide-react";

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
};

export default function PreAlertsPage() {
  const [items, setItems] = useState<PreAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    tracking_number: "", 
    carrier: "", 
    origin: "", 
    expected_date: "", 
    notes: "" 
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/pre-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_number: form.tracking_number,
          carrier: form.carrier,
          origin: form.origin,
          expected_date: form.expected_date,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create pre-alert");
      setForm({ tracking_number: "", carrier: "", origin: "", expected_date: "", notes: "" });
      await load();
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  
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
                  type="button"
                  onClick={() => setShowForm((s) => !s)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Create Pre-Alert
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

          {/* Create Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6" onClick={() => setShowForm(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-gradient-to-r from-[#0891b2] to-[#06b6d4] text-white p-4 sm:p-6 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create New Pre-Alert
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>

                <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Tracking Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tracking Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                          placeholder="Enter tracking number" 
                          value={form.tracking_number} 
                          onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Carrier */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Carrier <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Plane className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                          placeholder="e.g., DHL, FedEx, UPS" 
                          value={form.carrier} 
                          onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Origin */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Origin <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                          placeholder="Country or city of origin" 
                          value={form.origin} 
                          onChange={(e) => setForm({ ...form, origin: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Expected Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expected Arrival Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          type="date"
                          className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                          value={form.expected_date} 
                          onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <textarea 
                        className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm resize-none"
                        placeholder="Any special instructions or notes about this shipment..."
                        rows={3}
                        value={form.notes} 
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-start space-x-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-bold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Submit Pre-Alert</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No pre-alerts yet</h3>
                  <p className="text-sm text-gray-500 mb-6">Create your first pre-alert to notify us about incoming shipments</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    Create First Pre-Alert
                  </button>
                </div>
              ) : (
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
                            <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border ${statusInfo.bgColor}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </span>
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}