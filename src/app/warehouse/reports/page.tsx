"use client";

import { useState } from "react";
import { BarChart3, Download, Calendar, TrendingUp, Loader2 } from "lucide-react";

type ReportData = {
  reportType: string;
  period: { from?: string; to?: string };
  [key: string]: unknown;
};

export default function WarehouseReportsPage() {
  const [reportType, setReportType] = useState("summary");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  async function generateReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const r = await fetch(`/api/warehouse/reports?${params.toString()}`);
      const data = await r.json();
      
      if (r.ok) {
        setReportData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!reportData) return;
    
    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouse-report-${reportType}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] text-white mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#E67919] rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Warehouse Reports</h1>
              <p className="text-blue-100 mt-1">Generate detailed reports and analytics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Report Configuration */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#E67919]" />
            Report Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent bg-white"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="summary">Summary Report</option>
                <option value="daily">Daily Activity Report</option>
                <option value="staff">Staff Performance Report</option>
                <option value="inventory">Inventory Report</option>
                <option value="customer">Customer Activity</option>
                <option value="shipper">Shipper Performance</option>
                <option value="export">Detailed Export</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date From
              </label>
              <input
                type="date"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date To
              </label>
              <input
                type="date"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#0f4d8a] hover:bg-[#0a3d6e] text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Results */}
        {reportData && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E67919] to-[#d66e15] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
              </h2>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            </div>

            <div className="p-6">
              {/* Summary Report */}
              {reportType === "summary" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-medium mb-1">Total Packages</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {(reportData as { totalPackages?: number }).totalPackages || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium mb-1">Total Weight</p>
                      <p className="text-3xl font-bold text-green-900">
                        {((reportData as { totalWeight?: number }).totalWeight || 0).toFixed(2)} kg
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600 font-medium mb-1">Average Weight</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {((reportData as { averageWeight?: number }).averageWeight || 0).toFixed(2)} kg
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Status Distribution</h3>
                    <div className="space-y-2">
                      {Object.entries((reportData as { byStatus?: Record<string, number> }).byStatus || {}).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{status}</span>
                          <span className="text-lg font-bold text-[#0f4d8a]">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Report */}
              {reportType === "daily" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Packages</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {((reportData as { data?: { date: string; packages: number; weight: number }[] }).data || []).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium">{row.date}</td>
                          <td className="px-6 py-4 text-right">{row.packages}</td>
                          <td className="px-6 py-4 text-right">{(row.weight || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Customer Report */}
              {reportType === "customer" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Customer Code</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total Packages</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Weight (kg)</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Delivered</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">In Transit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {((reportData as { data?: { userCode: string; totalPackages: number; totalWeight: number; delivered: number; inTransit: number }[] }).data || []).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <code className="font-mono font-bold text-[#0f4d8a]">{row.userCode}</code>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold">{row.totalPackages}</td>
                          <td className="px-6 py-4 text-right">{(row.totalWeight || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">{row.delivered}</td>
                          <td className="px-6 py-4 text-right">{row.inTransit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Daily Activity Report */}
              {reportType === "daily" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-medium mb-1">Packages Received</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {(reportData as { packagesReceived?: number }).packagesReceived || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium mb-1">Packages Processed</p>
                      <p className="text-3xl font-bold text-green-900">
                        {(reportData as { packagesProcessed?: number }).packagesProcessed || 0}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-600 font-medium mb-1">Packages Shipped</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {(reportData as { packagesShipped?: number }).packagesShipped || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600 font-medium mb-1">Total Weight</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {((reportData as { totalWeight?: number }).totalWeight || 0).toFixed(2)} kg
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Received</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Processed</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Shipped</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Weight (kg)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {((reportData as { data?: { date: string; received: number; processed: number; shipped: number; weight: number }[] }).data || []).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{row.date}</td>
                            <td className="px-6 py-4 text-right">{row.received || 0}</td>
                            <td className="px-6 py-4 text-right">{row.processed || 0}</td>
                            <td className="px-6 py-4 text-right">{row.shipped || 0}</td>
                            <td className="px-6 py-4 text-right">{(row.weight || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Staff Performance Report */}
              {reportType === "staff" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Staff Member</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Packages Handled</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Received</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Processed</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Shipped</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Avg Time (hrs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {((reportData as { data?: { staffName: string; packagesHandled: number; received: number; processed: number; shipped: number; avgTime: number }[] }).data || []).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium">{row.staffName || "Unknown"}</td>
                          <td className="px-6 py-4 text-right font-semibold">{row.packagesHandled || 0}</td>
                          <td className="px-6 py-4 text-right">{row.received || 0}</td>
                          <td className="px-6 py-4 text-right">{row.processed || 0}</td>
                          <td className="px-6 py-4 text-right">{row.shipped || 0}</td>
                          <td className="px-6 py-4 text-right">{(row.avgTime || 0).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Inventory Report */}
              {reportType === "inventory" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-medium mb-1">Boxes Used</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {(reportData as { boxesUsed?: number }).boxesUsed || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium mb-1">Bubble Wrap (m²)</p>
                      <p className="text-3xl font-bold text-green-900">
                        {((reportData as { bubbleWrap?: number }).bubbleWrap || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-600 font-medium mb-1">Tape (rolls)</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {(reportData as { tape?: number }).tape || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600 font-medium mb-1">Labels Used</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {(reportData as { labelsUsed?: number }).labelsUsed || 0}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Material</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Quantity Used</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Unit</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {((reportData as { data?: { material: string; quantity: number; unit: string; cost: number }[] }).data || []).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{row.material}</td>
                            <td className="px-6 py-4 text-right">{row.quantity || 0}</td>
                            <td className="px-6 py-4 text-right">{row.unit || "-"}</td>
                            <td className="px-6 py-4 text-right">${(row.cost || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Shipper Report */}
              {reportType === "shipper" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Shipper</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total Packages</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total Weight</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Avg Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {((reportData as { data?: { shipper: string; totalPackages: number; totalWeight: number; averageWeight: number }[] }).data || []).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium">{row.shipper}</td>
                          <td className="px-6 py-4 text-right">{row.totalPackages}</td>
                          <td className="px-6 py-4 text-right">{(row.totalWeight || 0).toFixed(2)} kg</td>
                          <td className="px-6 py-4 text-right">{(row.averageWeight || 0).toFixed(2)} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}