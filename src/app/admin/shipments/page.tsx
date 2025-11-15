"use client";

import { useState } from "react";

type ShipmentRow = {
  tracking_number: string;
  status?: string;
  weight?: string;
  notes?: string;
};

export default function AdminShipmentsPage() {
  const [manifestId, setManifestId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("air");
  const [batchDate, setBatchDate] = useState("");
  const [rows, setRows] = useState<ShipmentRow[]>([{ tracking_number: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function addRow() {
    setRows((p) => [...p, { tracking_number: "" }]);
  }

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
      const res = await fetch("/api/admin/shipments/manifests/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update manifest");
      setSuccess(`Manifest ${payload.manifestId} saved successfully!`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save manifest");
    } finally {
      setSubmitting(false);
    }
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "air":
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
          </svg>
        );
      case "sea":
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "land":
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const totalWeight = rows.reduce((sum, r) => sum + (parseFloat(r.weight || "0") || 0), 0);
  const filledShipments = rows.filter((r) => r.tracking_number.trim()).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
              Shipments Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">Create and manage shipment manifests</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-white px-4 py-2 shadow-md border border-gray-200">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[#0f4d8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <div>
                  <p className="text-xs text-gray-500">Total Shipments</p>
                  <p className="text-lg font-bold text-gray-900">{filledShipments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f4d8a] to-[#0f4d8a]/80 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-100">Manifest ID</p>
                  <p className="mt-1 text-lg font-bold">{manifestId || "Not Set"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#E67919] to-[#E67919]/80 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  {getModeIcon(mode)}
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-100">Transport Mode</p>
                  <p className="mt-1 text-lg font-bold capitalize">{mode}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-100">Total Weight</p>
                  <p className="mt-1 text-lg font-bold">{totalWeight.toFixed(2)} kg</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-100">Items Added</p>
                  <p className="mt-1 text-lg font-bold">{filledShipments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
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
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  placeholder="e.g., MAN-2024-001"
                  value={manifestId}
                  onChange={(e) => setManifestId(e.target.value)}
                  required
                />
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
                            <p className="mt-1 text-sm text-gray-500">Click "Add Shipment" to get started</p>
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
                          <input
                            className="w-full min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
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
  );
}