"use client";

import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, RefreshCw, Eye, User, Clock, Loader2 } from "lucide-react";

interface LogEntry {
  _id?: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string | Date;
  userType?: string;
  status?: string;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  async function loadLogs(page = 1) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "50");
      if (resourceFilter !== "all") params.append("resource", resourceFilter);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (searchQuery) params.append("resourceId", searchQuery);

      const res = await fetch(`/api/admin/logs?${params.toString()}`, { cache: "no-store" });
      
      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData?.error || "Failed to load logs");
      }
      
      const data: LogsResponse = await res.json();

      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(pagination.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceFilter, actionFilter]);

  function formatDate(date: string | Date | undefined): string {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  function getActionColor(action: string | undefined): string {
    if (!action) return "bg-gray-100 text-gray-700";
    const actionLower = action.toLowerCase();
    if (actionLower.includes("create") || actionLower.includes("add")) return "bg-green-100 text-green-700";
    if (actionLower.includes("update") || actionLower.includes("edit")) return "bg-blue-100 text-blue-700";
    if (actionLower.includes("delete") || actionLower.includes("remove")) return "bg-red-100 text-red-700";
    if (actionLower.includes("login") || actionLower.includes("auth")) return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-700";
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.resourceId?.toLowerCase().includes(query) ||
      log.entityId?.toLowerCase().includes(query) ||
      log.userEmail?.toLowerCase().includes(query) ||
      log.action?.toLowerCase().includes(query) ||
      log.resource?.toLowerCase().includes(query) ||
      log.entityType?.toLowerCase().includes(query)
    );
  });

  const uniqueResources = Array.from(new Set(logs.map((log) => log.resource || log.entityType).filter(Boolean)));
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action).filter(Boolean)));

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                Audit Logs
              </h1>
              <p className="mt-1 text-sm text-blue-100">
                Track all user actions and system events for security and troubleshooting
              </p>
            </div>
            <button
              onClick={() => loadLogs(pagination.page)}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-6 py-3 text-white hover:bg-white/25 transition-all"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Resources</option>
              {uniqueResources.map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Logs Table */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {log.userEmail || log.userId || "System"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resource || log.entityType || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {log.resourceId || log.entityId || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadLogs(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-4 text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => loadLogs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedLog(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#0f4d8a] to-[#0e447d] text-white p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Log Details</h2>
                <button onClick={() => setSelectedLog(null)} className="text-white hover:text-gray-200">
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Timestamp</label>
                    <p className="mt-1 text-gray-900">{formatDate(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">User</label>
                    <p className="mt-1 text-gray-900">{selectedLog.userEmail || selectedLog.userId || "System"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Action</label>
                    <p className="mt-1 text-gray-900">{selectedLog.action || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resource</label>
                    <p className="mt-1 text-gray-900">{selectedLog.resource || selectedLog.entityType || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resource ID</label>
                    <p className="mt-1 text-gray-900 font-mono">{selectedLog.resourceId || selectedLog.entityId || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">IP Address</label>
                    <p className="mt-1 text-gray-900">{selectedLog.ipAddress || "N/A"}</p>
                  </div>
                </div>
                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Changes</label>
                    <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">User Agent</label>
                    <p className="mt-1 text-sm text-gray-600">{selectedLog.userAgent}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

