"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface PreAlertData {
  _id: string;
  trackingNumber: string;
  userCode: string;
  carrier: string | null;
  origin: string | null;
  expectedDate: string | null;
  notes: string | null;
  status: string;
  createdAt: string | null;
  decidedAt: string | null;
}

export default function PreAlertsPage() {
  const [data, setData] = useState<PreAlertData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/pre-alerts', { 
          cache: "no-store",
          credentials: 'include',
        });
        const json = await res.json();
        if (res.ok) {
          const responseData = Array.isArray(json?.pre_alerts) ? json.pre_alerts : [];
          setData(responseData);
        }
      } catch (err) {
        console.error("Error loading pre-alerts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Status color mapping
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("delivered") || s.includes("completed")) return "bg-green-100 text-green-800 border-green-200";
    if (s.includes("transit") || s.includes("progress")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (s.includes("pending") || s.includes("awaiting")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (s.includes("delayed") || s.includes("issue")) return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
              <span className="text-lg text-gray-600">Loading pre-alerts...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Section */}
        {/* Invoice-Style Header */}
<header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
  <div className="absolute inset-0 bg-white/10" />

  <div className="relative flex flex-col gap-6">
    {/* Top Row */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v4H3V3zm0 6h18v4H3V9zm0 6h18v4H3v-4z" />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Pre-Alerts Dashboard
          </h1>
      </div>
    </div>

    {/* Right Button */}
    <Link
      href="/admin"
      className="flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold shadow-lg shadow-blue-900/30 transition hover:bg-white/25 hover:shadow-xl hover:scale-105 active:scale-95 backdrop-blur"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Dashboard
    </Link>
    </div>

    {/* Stats Cards inside header */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total */}
      <div className="group relative overflow-hidden rounded-xl bg-white/10 p-5 shadow-md backdrop-blur">
        <div className="relative flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-100">Total</p>
            <p className="mt-1 text-2xl font-bold">{data.length}</p>
          </div>
        </div>
      </div>

      {/* In Transit */}
      <div className="group relative overflow-hidden rounded-xl bg-blue-500/20 p-5 shadow-md backdrop-blur">
        <div className="relative flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-100">In Transit</p>
            <p className="mt-1 text-2xl font-bold">{data.filter(p => p.status?.toLowerCase().includes("transit")).length}</p>
          </div>
        </div>
      </div>

      {/* Delivered */}
      <div className="group relative overflow-hidden rounded-xl bg-green-500/20 p-5 shadow-md backdrop-blur">
        <div className="relative flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-green-100">Delivered</p>
            <p className="mt-1 text-2xl font-bold">{data.filter(p => p.status?.toLowerCase().includes("delivered")).length}</p>
          </div>
        </div>
      </div>

      {/* Pending */}
      <div className="group relative overflow-hidden rounded-xl bg-yellow-500/20 p-5 shadow-md backdrop-blur">
        <div className="relative flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-yellow-100">Pending</p>
            <p className="mt-1 text-2xl font-bold">{data.filter(p => p.status?.toLowerCase().includes("pending")).length}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</header>


        {/* Main Table Card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Card Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-[#0f4d8a]/5 to-[#E67919]/5 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] p-2">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Incoming Shipments</h2>
                <p className="text-sm text-gray-600">All active pre-alert notifications</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Customer Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tracking Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Origin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Expected Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-gray-100 p-4">
                          <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">No pre-alerts available</p>
                          <p className="mt-1 text-sm text-gray-500">There are no incoming shipments at this time</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {data.map((p: PreAlertData, i: number) => (
                  <tr 
                    key={p._id || i} 
                    className="transition-colors hover:bg-gradient-to-r hover:from-[#0f4d8a]/5 hover:to-[#E67919]/5"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#E67919]/10 to-[#E67919]/20">
                          <span className="text-xs font-bold text-[#E67919]">{p.userCode?.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {p.userCode || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0f4d8a]/10 to-[#E67919]/10">
                          <svg className="h-5 w-5 text-[#0f4d8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {p.trackingNumber}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-[#0f4d8a]/10 px-2.5 py-1 text-xs font-medium text-[#0f4d8a]">
                        {p.carrier || "-"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {p.origin || "-"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : "-"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex gap-2">
                        {p.status === "submitted" && (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/admin/pre-alerts', {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: 'include',
                                    body: JSON.stringify({ id: p._id, action: "approve" }),
                                  });
                                  if (res.ok) {
                                    window.location.reload();
                                  }
                                } catch {
                                  alert("Failed to approve pre-alert");
                                }
                              }}
                              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/admin/pre-alerts', {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: 'include',
                                    body: JSON.stringify({ id: p._id, action: "reject" }),
                                  });
                                  if (res.ok) {
                                    window.location.reload();
                                  }
                                } catch {
                                  alert("Failed to reject pre-alert");
                                }
                              }}
                              className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm(`Resend pre-alert for tracking ${p.trackingNumber}?`)) {
                              try {
                                const res = await fetch('/api/admin/pre-alerts', {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: 'include',
                                  body: JSON.stringify({ id: p._id, action: "resend" }),
                                });
                                if (res.ok) {
                                  alert("Pre-alert resent successfully!");
                                  window.location.reload();
                                } else {
                                  const data = await res.json();
                                  alert(data?.error || "Failed to resend pre-alert");
                                }
                              } catch {
                                alert("Failed to resend pre-alert");
                              }
                            }
                          }}
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                          title="Resend Pre-Alert"
                        >
                          Resend
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {data.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium text-gray-900">{data.length}</span> pre-alert{data.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}