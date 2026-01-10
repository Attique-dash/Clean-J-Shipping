"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { 
  Search, 
  Plus, 
  Package, 
  Package2, 
  Weight, 
  Trash, 
  RefreshCw, 
  Filter, 
  ChevronRight, 
  Loader2,
  Eye,
  X,
  Plane,
  Ship,
  Truck,
  FileText
} from 'lucide-react';
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";
import Loading from "@/components/Loading";

type ShipmentRow = {
  tracking_number: string;
  status?: string;
  weight?: string;
  notes?: string;
};

interface ShipmentManifest {
  _id: string;
  manifestId: string;
  title?: string;
  mode: 'air' | 'sea' | 'land';
  batchDate?: string;
  shipments: Array<{
    trackingNumber: string;
    status?: string;
    weight?: number;
    notes?: string;
  }>;
  totalItems: number;
  totalWeight: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export default function AdminShipmentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [manifests, setManifests] = useState<ShipmentManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state for creating new manifest
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [manifestId, setManifestId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("air");
  const [batchDate, setBatchDate] = useState("");
  const [rows, setRows] = useState<ShipmentRow[]>([{ tracking_number: "" }]);

  // Generate unique Manifest ID
  const generateManifestId = () => {
    const prefix = "MAN";
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    return `${prefix}-${date}-${random}`;
  };

  // Generate unique Tracking Number
  const generateTrackingNumber = () => {
    const prefix = "TRK";
    const random = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    return `${prefix}${random}`;
  };

  // Auto-generate IDs when form is opened
  useEffect(() => {
    if (showCreateForm) {
      if (!manifestId) {
        setManifestId(generateManifestId());
      }
      // Generate tracking number for initial row if empty
      if (rows.length === 1 && !rows[0].tracking_number) {
        setRows([{ tracking_number: generateTrackingNumber() }]);
      }
    }
  }, [showCreateForm, manifestId, rows]);

  // Auto-generate tracking number for new rows
  const addRow = () => {
    const newTrackingNumber = generateTrackingNumber();
    setRows((p) => [...p, { tracking_number: newTrackingNumber }]);
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [manifestToDelete, setManifestToDelete] = useState<ShipmentManifest | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // View manifest modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [manifestToView, setManifestToView] = useState<ShipmentManifest | null>(null);

  // Redirect if not authenticated or not admin staff
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load manifests (initial load and refresh)
  useEffect(() => {
    const fetchManifests = async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        if (modeFilter) params.set('mode', modeFilter);
        if (statusFilter) params.set('status', statusFilter);
        
        const res = await fetch(`/api/admin/shipments/manifests/update?${params.toString()}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          console.log('API Response:', data); // Debug log
          setManifests(data.manifests || []);
        } else {
          throw new Error(data.error || 'Failed to load manifests');
        }
      } catch (error) {
        console.error('Error loading manifests:', error);
        toast.error('Failed to load manifests');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    if (status === 'authenticated') {
      fetchManifests();
    }
  }, [status, loading, refreshing, searchTerm, modeFilter, statusFilter]);

  
  const handleRefresh = () => {
    setRefreshing(true);
  };

  // Filter manifests based on search term
  const filteredManifests = manifests.filter(manifest => {
    const matchesSearch = !searchTerm || 
      manifest.manifestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (manifest.title && manifest.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesMode = !modeFilter || manifest.mode === modeFilter;
    const matchesStatus = !statusFilter || manifest.status === statusFilter;
    
    return matchesSearch && matchesMode && matchesStatus;
  });

  // Handle manifest view
  const handleViewManifest = async (manifest: ShipmentManifest) => {
    console.log('Viewing manifest:', manifest); // Debug log
    setManifestToView(manifest);
    setViewModalOpen(true);
  };

  // Handle manifest delete
  const handleDeleteManifest = async (manifest: ShipmentManifest) => {
    setManifestToDelete(manifest);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!manifestToDelete) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/shipments/manifests/update?manifestId=${manifestToDelete.manifestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        setManifests(manifests.filter(m => m._id !== manifestToDelete._id));
        toast.success('Manifest deleted successfully');
        setDeleteModalOpen(false);
        setManifestToDelete(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete manifest');
      }
    } catch {
      toast.error('Error deleting manifest');
    } finally {
      setDeleting(false);
    }
  };

  // Manual tracking number generation (for user to click)
  const generateNewTrackingNumber = (rowIndex: number) => {
    const newTrackingNumber = generateTrackingNumber();
    setRows((p) =>
      p.map((x, i) =>
        i === rowIndex ? { ...x, tracking_number: newTrackingNumber } : x
      )
    );
  };

  // Generate new manifest ID
  const generateNewManifestId = () => {
    setManifestId(generateManifestId());
  };

  function removeRow(idx: number) {
    setRows((p) => p.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        manifestId: manifestId.trim(),
        description: title || undefined,
        data: {
          title: title || undefined,
          mode,
          batch_date: batchDate || undefined,
          shipments: rows
            .filter((r) => r.tracking_number.trim())
            .map((r) => ({
              tracking_number: r.tracking_number.trim(),
              status: (r.status || "").trim() || undefined,
              weight: r.weight ? Number(r.weight) : undefined,
              notes: (r.notes || "").trim() || undefined,
            })),
        },
      };
      console.log('Submitting payload:', JSON.stringify(payload, null, 2)); // Debug log
      const res = await fetch("/api/admin/shipments/manifests/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('API response:', data); // Debug log
      if (!res.ok) throw new Error(data?.error || "Failed to update manifest");
      setSuccess(`Manifest ${payload.manifestId} saved successfully!`);
      // Reset form
      setManifestId("");
      setTitle("");
      setMode("air");
      setBatchDate("");
      setRows([{ tracking_number: "" }]);
      setShowCreateForm(false);
      // Refresh manifests list
      handleRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save manifest");
    } finally {
      setSubmitting(false);
    }
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "air":
        return <Plane className="h-5 w-5" />;
      case "sea":
        return <Ship className="h-5 w-5" />;
      case "land":
        return <Truck className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const filledShipments = rows.filter((r) => r.tracking_number.trim()).length;

  if (status === 'loading' || loading) {
    return <Loading message="Loading shipments..." />;
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
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">Shipments</h1>
                  <p className="text-blue-100 mt-1">Total manifests: <span className="font-semibold">{manifests.length}</span></p>
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
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E67919] to-[#d46a0f] px-4 py-3 sm:px-6 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-sm sm:text-base"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Create Manifest</span>
                  <ChevronRight className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${showCreateForm ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Create Manifest Form - Modal Popup */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-[#E67919] to-[#d46a0f] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Create New Manifest
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setManifestId("");
                  setTitle("");
                  setMode("air");
                  setBatchDate("");
                  setRows([{ tracking_number: "" }]);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={onSubmit} className="space-y-6">
          {/* Manifest Details Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] p-2">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Manifest Details</h2>
                <p className="text-xs text-gray-500">Configure the shipment manifest information</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Manifest ID *
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    placeholder="e.g., MAN-2024-001"
                    value={manifestId}
                    onChange={(e) => setManifestId(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={generateNewManifestId}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
                    title="Generate new Manifest ID"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Gen
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Title
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  placeholder="Manifest title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Transport Mode
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="air">✈️ Air Freight</option>
                  <option value="sea">🚢 Sea Freight</option>
                  <option value="land">🚛 Land Freight</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Batch Date
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Shipments Table Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-[#0f4d8a]/5 to-[#E67919]/5 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] p-2">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Shipment Items</h2>
                    <p className="text-xs text-gray-500">Add tracking numbers and details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#0f4d8a]/90 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Shipment
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Tracking Number
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        Weight (kg)
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Notes
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="rounded-full bg-gray-100 p-4">
                            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">No shipments added</p>
                            <p className="mt-1 text-sm text-gray-500">Click &quot;Add Shipment&quot; to get started</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr
                        key={idx}
                        className="transition-colors hover:bg-gradient-to-r hover:from-[#0f4d8a]/5 hover:to-[#E67919]/5"
                      >
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <input
                              className="flex-1 min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                              placeholder="Enter tracking number"
                              value={r.tracking_number}
                              onChange={(e) =>
                                setRows((p) =>
                                  p.map((x, i) =>
                                    i === idx ? { ...x, tracking_number: e.target.value } : x
                                  )
                                )
                              }
                              required
                            />
                            <button
                              type="button"
                              onClick={() => generateNewTrackingNumber(idx)}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white hover:bg-green-600 transition-colors"
                              title="Generate new Tracking Number"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Gen
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full min-w-[150px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                            placeholder="e.g., In Transit"
                            value={r.status || ""}
                            onChange={(e) =>
                              setRows((p) =>
                                p.map((x, i) => (i === idx ? { ...x, status: e.target.value } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={r.weight || ""}
                            onChange={(e) =>
                              setRows((p) =>
                                p.map((x, i) => (i === idx ? { ...x, weight: e.target.value } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                            placeholder="Additional notes"
                            value={r.notes || ""}
                            onChange={(e) =>
                              setRows((p) =>
                                p.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-600 hover:text-white"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {rows.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
                <p className="text-sm text-gray-600">
                  Total items: <span className="font-medium text-gray-900">{rows.length}</span> • 
                  Filled: <span className="font-medium text-gray-900">{filledShipments}</span>
                </p>
              </div>
            )}
          </div>

          {/* Alerts */}
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Another Shipment
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#0f4d8a]/90 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Manifest...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Manifest
                </>
              )}
            </button>
          </div>
        </form>
            </div>
          </div>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter Manifests
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
                  placeholder="Search by manifest ID or title"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Transport Mode Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-blue-500" />
                </div>
                <select
                  className="block w-full h-12 pl-10 pr-8 text-sm border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                >
                  <option value="">All Modes</option>
                  <option value="air">Air Freight</option>
                  <option value="sea">Sea Freight</option>
                  <option value="land">Land Freight</option>
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {(modeFilter || statusFilter) && (
              <div className="flex flex-wrap items-center gap-2">
                {modeFilter && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm">
                    <Plane className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Mode: {modeFilter}</span>
                    <button
                      onClick={() => setModeFilter('')}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                )}
                {statusFilter && (
                  <div className="flex items-center gap-2 rounded-lg bg-orange-100 px-3 py-1.5 text-sm">
                    <Filter className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Status: {statusFilter}</span>
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
                    setModeFilter('');
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

        {/* Manifests List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Manifest List
              </h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">{filteredManifests.length} manifest{filteredManifests.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          
          {filteredManifests.length === 0 ? (
            <div className="p-12 text-center">
              <Package2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No manifests found</h3>
              <p className="text-sm text-gray-600 mb-6">
                {searchTerm || modeFilter || statusFilter 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by creating your first manifest'}
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                Create Manifest
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table View */}
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Manifest</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Transport Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredManifests.map((manifest) => (
                    <tr key={manifest._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 font-mono">
                              {manifest.manifestId}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(manifest.createdAt || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getModeIcon(manifest.mode)}
                          <span className="text-sm text-gray-900 capitalize">{manifest.mode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {manifest.totalItems} items
                        </div>
                        <div className="text-xs text-gray-500">
                          {manifest.shipments?.length || 0} shipments
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Weight className="h-3 w-3 mr-1" />
                          {manifest.totalWeight?.toFixed(2) || '0.00'} kg
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          manifest.status === 'active' ? 'bg-green-100 text-green-800' :
                          manifest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {manifest.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => handleViewManifest(manifest)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-white rounded-md hover:bg-blue-50 transition-all shadow-sm"
                              title="View Manifest Details"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteManifest(manifest)}
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
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setManifestToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Manifest"
        message="Are you sure you want to delete this manifest? This action cannot be undone and will permanently remove all manifest data from the system."
        itemName={manifestToDelete?.manifestId}
        loading={deleting}
      />

      {/* View Manifest Modal */}
      {viewModalOpen && manifestToView && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Manifest Details</h3>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Manifest Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Manifest Information
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Manifest ID:</span>
                      <span className="text-sm font-medium text-gray-900 font-mono">{manifestToView.manifestId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Title:</span>
                      <span className="text-sm font-medium text-gray-900">{manifestToView.title || 'No title set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transport Mode:</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{manifestToView.mode || 'Not specified'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Items:</span>
                      <span className="text-sm font-medium text-gray-900">{manifestToView.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Weight:</span>
                      <span className="text-sm font-medium text-gray-900">{manifestToView.totalWeight?.toFixed(2) || '0.00'} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        manifestToView.status === 'active' ? 'bg-green-100 text-green-800' :
                        manifestToView.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {manifestToView.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipments List */}
              {manifestToView.shipments && manifestToView.shipments.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    Shipment Items ({manifestToView.shipments.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tracking Number</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Weight</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {manifestToView.shipments.map((shipment, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 font-mono text-xs">{shipment.trackingNumber}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                shipment.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {shipment.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-2">{shipment.weight?.toFixed(2) || '0.00'} kg</td>
                            <td className="px-4 py-2 text-xs text-gray-600">{shipment.notes || 'No notes'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}