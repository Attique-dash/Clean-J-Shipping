"use client";

import { useEffect, useState } from "react";
import { Archive, Package, MessageSquare, Search, X, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

type ArchivedPackage = {
  tracking_number: string;
  description?: string;
  status: string;
  last_updated?: string;
};

type ArchivedBill = {
  tracking_number: string;
  description?: string;
  invoice_number?: string;
  invoice_date?: string;
  currency?: string;
  amount_due: number;
  payment_status: string;
  last_updated?: string;
};

type ArchivedMessage = {
  subject: string | null;
  body: string;
  sender: string;
  created_at?: string;
};

export default function CustomerArchivesPage() {
  const [activeTab, setActiveTab] = useState<"packages" | "messages">("packages");
  const [packages, setPackages] = useState<ArchivedPackage[]>([]);
  const [_bills, setBills] = useState<ArchivedBill[]>([]);
  const [messages, setMessages] = useState<ArchivedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/archives", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load archives");
      setPackages(Array.isArray(data?.packages) ? data.packages : []);
      setBills(Array.isArray(data?.bills) ? data.bills : []);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredPackages = packages.filter((p: ArchivedPackage) =>
    !searchQuery ||
    p.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMessages = messages.filter((m) =>
    !searchQuery ||
    (m.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getStatusInfo(status: string) {
    switch (status.toLowerCase()) {
      case "delivered":
        return {
          label: "Delivered",
          icon: CheckCircle,
          bgColor: "bg-green-100 text-green-800 border-green-200",
          iconColor: "text-green-600",
        };
      case "deleted":
        return {
          label: "Deleted",
          icon: XCircle,
          bgColor: "bg-red-100 text-red-800 border-red-200",
          iconColor: "text-red-600",
        };
      default:
        return {
          label: status,
          icon: Clock,
          bgColor: "bg-gray-100 text-gray-800 border-gray-200",
          iconColor: "text-gray-600",
        };
    }
  }

  function _getPaymentStatusInfo(status: string) {
    switch (status.toLowerCase()) {
      case "paid":
        return {
          label: "Paid",
          icon: CheckCircle,
          bgColor: "bg-green-100 text-green-800 border-green-200",
        };
      case "submitted":
        return {
          label: "Submitted",
          icon: Clock,
          bgColor: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "rejected":
        return {
          label: "Rejected",
          icon: XCircle,
          bgColor: "bg-red-100 text-red-800 border-red-200",
        };
      default:
        return {
          label: "Pending",
          icon: Clock,
          bgColor: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  }

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
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Archive className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold leading-tight md:text-3xl">Archived Records</h1>
                  <p className="text-blue-100 mt-1 flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    View your historical packages and messages
                    <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                      Data Loaded
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Archives Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Historical Records
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Tabs */}
              <div className="bg-gray-50 rounded-xl p-1">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("packages")}
                    className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      activeTab === "packages"
                        ? "bg-white shadow-md text-[#0f4d8a]"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Packages ({packages.length})</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("messages")}
                    className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      activeTab === "messages"
                        ? "bg-white shadow-md text-[#0f4d8a]"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Messages ({messages.length})</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Content */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin" />
                  <span className="ml-3 text-gray-600">Loading archived records...</span>
                </div>
              ) : error ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              ) : activeTab === "packages" ? (
                <div className="space-y-4">
                  {filteredPackages.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No archived packages</h3>
                      <p className="text-sm text-gray-500">Delivered or canceled packages will appear here</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                              Tracking Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                              Last Updated
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {filteredPackages.map((pkg: ArchivedPackage, idx: number) => {
                            const statusInfo = getStatusInfo(pkg.status);
                            const StatusIcon = statusInfo.icon;
                            return (
                              <tr key={idx} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="font-mono text-sm font-semibold text-gray-900">
                                    {pkg.tracking_number}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-700">
                                    {pkg.description || "No description"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${statusInfo.bgColor}`}>
                                    <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.iconColor}`} />
                                    {statusInfo.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {pkg.last_updated
                                    ? new Date(pkg.last_updated).toLocaleDateString()
                                    : "N/A"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No archived messages</h3>
                      <p className="text-sm text-gray-500">Past messages will appear here</p>
                    </div>
                  ) : (
                    filteredMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 rounded-xl p-6 border border-gray-200 transition-all duration-200 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              msg.sender === "customer"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-orange-100 text-orange-600"
                            }`}>
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {msg.subject || "Support Team"}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {msg.sender === "customer" ? "You" : "Support Team"} •{" "}
                                {msg.created_at
                                  ? new Date(msg.created_at).toLocaleString()
                                  : "Unknown date"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 ml-12">{msg.body}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}