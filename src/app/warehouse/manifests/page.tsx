"use client";

import { useState, useEffect } from "react";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, FileText, CheckCircle, AlertCircle, Loader2, Printer, Plus, RefreshCw, FileDown } from "lucide-react";
import { toast } from "react-toastify";
import Loading from "@/components/Loading";

type Manifest = {
  _id: string;
  manifestId: string;
  description?: string;
  manifestNumber?: number;
  weight?: number;
  itemCount?: number;
  flightDate?: string;
  entryDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function WarehouseManifestsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ manifestId: "", description: "", data: "{}" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [loadingManifests, setLoadingManifests] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Redirect if not authenticated or not warehouse staff
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    loadManifests();
  }, [status]);

  async function loadManifests() {
    setLoadingManifests(true);
    try {
      const res = await fetch("/api/warehouse/manifests", { cache: "no-store", credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setManifests(data.manifests || []);
      } else {
        toast.error(data?.error || "Failed to load manifests");
      }
    } catch (_error) {
      toast.error("Failed to load manifests");
    } finally {
      setLoadingManifests(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    let parsed: unknown = undefined;
    try {
      parsed = form.data ? JSON.parse(form.data) : undefined;
    } catch {
      setMsg("Manifest data must be valid JSON");
      setMsgType("error");
      setLoading(false);
      return;
    }
    const r = await fetch("/api/warehouse/manifests/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ 
        manifestId: form.manifestId.trim(), 
        description: form.description || undefined, 
        data: parsed 
      }),
    });
    const d = await r.json();
    const isSuccess = r.ok;
    setMsgType(isSuccess ? "success" : "error");
    setMsg(isSuccess ? "Manifest saved successfully" : (typeof d?.error === "string" ? d.error : "Failed to save manifest"));
    if (isSuccess) {
      toast.success("Manifest saved successfully");
      setForm({ manifestId: "", description: "", data: "{}" });
      setShowForm(false);
      loadManifests();
    }
    setLoading(false);
  }

  const handlePrint = (manifest: Manifest) => {
    window.print();
    toast.info("Print dialog opened");
  };

  const handleExport = (manifest: Manifest) => {
    const data = {
      manifestId: manifest.manifestId,
      description: manifest.description,
      manifestNumber: manifest.manifestNumber,
      weight: manifest.weight,
      itemCount: manifest.itemCount,
      flightDate: manifest.flightDate,
      entryDate: manifest.entryDate,
      createdAt: manifest.createdAt,
      updatedAt: manifest.updatedAt,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-${manifest.manifestId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Manifest exported successfully");
  };

  if (status === 'loading' || loadingManifests) {
    return <Loading message="Loading manifests..." />;
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
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-100">Shipment Management</p>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">Shipping Manifests</h1>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadManifests}
                  disabled={loadingManifests}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-900/30 transition hover:bg-white/25 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingManifests ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0f4d8a] shadow-lg shadow-blue-900/20 transition hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" />
                  {showForm ? "Cancel" : "New Manifest"}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Create/Update Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {form.manifestId ? "Update Manifest" : "Create New Manifest"}
              </h2>
            </div>

          {/* Form Section */}
          <div className="p-8 space-y-6">
            {/* Input Fields Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Manifest ID <span className="text-[#E67919]">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:border-[#0f4d8a] focus:ring-2 focus:ring-[#0f4d8a] focus:ring-opacity-20 transition-all outline-none"
                  placeholder="e.g., MNF-2024-001"
                  value={form.manifestId}
                  onChange={(e) => setForm({ ...form, manifestId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:border-[#0f4d8a] focus:ring-2 focus:ring-[#0f4d8a] focus:ring-opacity-20 transition-all outline-none"
                  placeholder="Brief description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            {/* JSON Data Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Manifest Data (JSON Format)
              </label>
              <textarea
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-800 focus:border-[#0f4d8a] focus:ring-2 focus:ring-[#0f4d8a] focus:ring-opacity-20 transition-all outline-none resize-none"
                placeholder='{"packages": ["TRK001", "TRK002"], "shipDate": "2024-11-21"}'
                rows={6}
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Enter valid JSON data for the manifest</p>
            </div>

            {/* Message Alert */}
            {msg && (
              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                msgType === "success" 
                  ? "bg-green-50 border-2 border-green-200" 
                  : "bg-red-50 border-2 border-red-200"
              }`}>
                {msgType === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <span className={`text-sm font-medium ${
                  msgType === "success" ? "text-green-800" : "text-red-800"
                }`}>
                  {msg}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm({ manifestId: "", description: "", data: "{}" });
                  setMsg(null);
                }}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={loading || !form.manifestId.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Save Manifest</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Manifests List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              All Manifests
            </h2>
          </div>
          <div className="p-6">
            {loadingManifests ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
              </div>
            ) : manifests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No manifests found</h3>
                <p className="text-sm text-gray-500 mb-6">Create your first manifest to get started</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  <Plus className="h-5 w-5" />
                  Create Manifest
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Manifest ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {manifests.map((manifest) => (
                      <tr key={manifest._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{manifest.manifestId}</div>
                          {manifest.manifestNumber && (
                            <div className="text-xs text-gray-500">#{manifest.manifestNumber}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{manifest.description || "-"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{manifest.itemCount || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{manifest.weight ? `${manifest.weight} kg` : "-"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {manifest.entryDate 
                              ? new Date(manifest.entryDate).toLocaleDateString()
                              : manifest.createdAt
                              ? new Date(manifest.createdAt).toLocaleDateString()
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handlePrint(manifest)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 hover:text-[#0f4d8a]"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Print
                            </button>
                            <button
                              onClick={() => handleExport(manifest)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 hover:text-[#0f4d8a]"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              Export
                            </button>
                            <button
                              onClick={() => {
                                setForm({
                                  manifestId: manifest.manifestId,
                                  description: manifest.description || "",
                                  data: "{}",
                                });
                                setShowForm(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 hover:text-[#0f4d8a]"
                            >
                              Edit
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
      </div>
    </div>
  );
}