"use client";

import { useState, useEffect } from "react";
import { Plug, Plus, Edit, Trash2, CheckCircle, XCircle, CreditCard, Truck, Globe, Loader2 } from "lucide-react";
import SharedModal from "@/components/admin/SharedModal";
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";

interface Integration {
  _id?: string;
  name: string;
  type: string;
  provider: string;
  isActive: boolean;
  config: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  webhookUrl?: string;
  testMode?: boolean;
  lastSyncAt?: string;
  syncStatus?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; integration: Integration | null }>({ open: false, integration: null });
  const [formData, setFormData] = useState({
    name: "",
    type: "payment_gateway",
    provider: "",
    config: "{}",
    credentials: "{}",
    webhookUrl: "",
    webhookSecret: "",
    testMode: false,
  });

  async function loadIntegrations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integrations", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load integrations");
      setIntegrations(data.integrations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIntegrations();
  }, []);

  function openAdd() {
    setEditing(null);
    setFormData({
      name: "",
      type: "payment_gateway",
      provider: "",
      config: "{}",
      credentials: "{}",
      webhookUrl: "",
      webhookSecret: "",
      testMode: false,
    });
    setShowForm(true);
  }

  function openEdit(integration: Integration) {
    setEditing(integration);
    setFormData({
      name: integration.name,
      type: integration.type,
      provider: integration.provider,
      config: JSON.stringify(integration.config || {}, null, 2),
      credentials: integration.credentials ? JSON.stringify(integration.credentials, null, 2) : "{}",
      webhookUrl: integration.webhookUrl || "",
      webhookSecret: "",
      testMode: integration.testMode || false,
    });
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      let config: Record<string, unknown> = {};
      let credentials: Record<string, unknown> = {};

      try {
        config = JSON.parse(formData.config);
      } catch {
        throw new Error("Invalid JSON in config field");
      }

      try {
        credentials = JSON.parse(formData.credentials);
      } catch {
        throw new Error("Invalid JSON in credentials field");
      }

      const body = {
        name: formData.name,
        type: formData.type,
        provider: formData.provider,
        config,
        credentials,
        webhookUrl: formData.webhookUrl || undefined,
        webhookSecret: formData.webhookSecret || undefined,
        testMode: formData.testMode,
      };

      if (editing) {
        const res = await fetch(`/api/admin/integrations/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to update integration");
      } else {
        const res = await fetch("/api/admin/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to create integration");
      }

      setShowForm(false);
      await loadIntegrations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save integration");
    }
  }

  function openDelete(integration: Integration) {
    setDeleteConfirm({ open: true, integration });
  }

  async function deleteIntegration() {
    if (!deleteConfirm.integration?._id) return;
    try {
      const res = await fetch(`/api/admin/integrations/${deleteConfirm.integration._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete integration");
      setDeleteConfirm({ open: false, integration: null });
      await loadIntegrations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete integration");
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "payment_gateway":
        return CreditCard;
      case "shipping_carrier":
        return Truck;
      default:
        return Globe;
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case "payment_gateway":
        return "from-green-500 to-emerald-600";
      case "shipping_carrier":
        return "from-blue-500 to-cyan-600";
      default:
        return "from-purple-500 to-pink-600";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  const paymentGateways = integrations.filter((i) => i.type === "payment_gateway");
  const shippingCarriers = integrations.filter((i) => i.type === "shipping_carrier");
  const otherIntegrations = integrations.filter((i) => i.type !== "payment_gateway" && i.type !== "shipping_carrier");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                Integrations
              </h1>
              <p className="mt-1 text-sm text-blue-100">
                Manage third-party integrations (payment gateways, shipping carriers)
              </p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-6 py-3 text-white hover:bg-white/25 transition-all"
            >
              <Plus className="h-5 w-5" />
              Add Integration
            </button>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Payment Gateways */}
        {paymentGateways.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-green-600" />
              Payment Gateways
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paymentGateways.map((integration) => {
                const Icon = getTypeIcon(integration.type);
                return (
                  <div
                    key={integration._id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className={`mb-4 flex items-center gap-3 rounded-xl bg-gradient-to-r ${getTypeColor(integration.type)} p-4 text-white`}>
                      <Icon className="h-6 w-6" />
                      <div className="flex-1">
                        <h3 className="font-bold">{integration.name}</h3>
                        <p className="text-xs text-white/80">{integration.provider}</p>
                      </div>
                      {integration.isActive ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={integration.isActive ? "text-green-600 font-medium" : "text-gray-400"}>
                          {integration.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {integration.testMode !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Test Mode:</span>
                          <span className={integration.testMode ? "text-yellow-600 font-medium" : "text-gray-400"}>
                            {integration.testMode ? "Yes" : "No"}
                          </span>
                        </div>
                      )}
                      {integration.syncStatus && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Sync:</span>
                          <span className={integration.syncStatus === "success" ? "text-green-600" : "text-red-600"}>
                            {integration.syncStatus}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openEdit(integration)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 px-4 py-2 hover:bg-blue-100 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(integration)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-600 px-4 py-2 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Shipping Carriers */}
        {shippingCarriers.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-6 w-6 text-blue-600" />
              Shipping Carriers
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shippingCarriers.map((integration) => {
                const Icon = getTypeIcon(integration.type);
                return (
                  <div
                    key={integration._id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className={`mb-4 flex items-center gap-3 rounded-xl bg-gradient-to-r ${getTypeColor(integration.type)} p-4 text-white`}>
                      <Icon className="h-6 w-6" />
                      <div className="flex-1">
                        <h3 className="font-bold">{integration.name}</h3>
                        <p className="text-xs text-white/80">{integration.provider}</p>
                      </div>
                      {integration.isActive ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={integration.isActive ? "text-green-600 font-medium" : "text-gray-400"}>
                          {integration.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {integration.syncStatus && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Sync:</span>
                          <span className={integration.syncStatus === "success" ? "text-green-600" : "text-red-600"}>
                            {integration.syncStatus}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openEdit(integration)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 px-4 py-2 hover:bg-blue-100 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(integration)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-600 px-4 py-2 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Other Integrations */}
        {otherIntegrations.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-6 w-6 text-purple-600" />
              Other Integrations
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {otherIntegrations.map((integration) => {
                const Icon = getTypeIcon(integration.type);
                return (
                  <div
                    key={integration._id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className={`mb-4 flex items-center gap-3 rounded-xl bg-gradient-to-r ${getTypeColor(integration.type)} p-4 text-white`}>
                      <Icon className="h-6 w-6" />
                      <div className="flex-1">
                        <h3 className="font-bold">{integration.name}</h3>
                        <p className="text-xs text-white/80">{integration.provider}</p>
                      </div>
                      {integration.isActive ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openEdit(integration)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 px-4 py-2 hover:bg-blue-100 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(integration)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-600 px-4 py-2 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {integrations.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Plug className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No integrations configured</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first integration</p>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Integration
            </button>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <SharedModal
            open={showForm}
            title={editing ? "Edit Integration" : "Add Integration"}
            onClose={() => setShowForm(false)}
            footer={
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => submitForm(new Event('submit') as unknown as React.FormEvent)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editing ? "Update" : "Add"} Integration
                </button>
              </div>
            }
          >
            <form onSubmit={submitForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="payment_gateway">Payment Gateway</option>
                  <option value="shipping_carrier">Shipping Carrier</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g., PayPal, FedEx"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
                <textarea
                  value={formData.config}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-sm"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credentials (JSON)</label>
                <textarea
                  value={formData.credentials}
                  onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-sm"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
                <input
                  type="password"
                  value={formData.webhookSecret}
                  onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Secret key for webhook verification"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="testMode"
                  checked={formData.testMode}
                  onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="testMode" className="text-sm font-medium text-gray-700">
                  Test Mode
                </label>
              </div>
            </form>
          </SharedModal>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          open={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, integration: null })}
          onConfirm={deleteIntegration}
          title="Delete Integration"
          message={`Are you sure you want to delete "${deleteConfirm.integration?.name}"? This action cannot be undone.`}
        />
      </div>
    </div>
  );
}

