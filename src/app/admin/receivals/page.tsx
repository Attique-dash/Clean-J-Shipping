"use client";

import { useState } from "react";
import { Package, Truck, MapPin, Calendar, Search, Filter, ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, Box, ArrowRight, User } from "lucide-react";

type ReceivalStatus = "pending" | "in_transit" | "received" | "delayed";

type Receival = {
  id: string;
  receivalNumber: string;
  fromWarehouse: string;
  toBranch: string;
  items: { name: string; quantity: number; sku: string }[];
  totalItems: number;
  status: ReceivalStatus;
  shippedDate: string;
  expectedDate: string;
  receivedDate?: string;
  receivedBy?: string;
  trackingNumber?: string;
};

// Demo data
const demoReceivalsData: Receival[] = [
  {
    id: "1",
    receivalNumber: "RCV-2024-001",
    fromWarehouse: "Main Warehouse - Karachi",
    toBranch: "Lahore Branch",
    items: [
      { name: "Product A", quantity: 50, sku: "SKU-001" },
      { name: "Product B", quantity: 30, sku: "SKU-002" },
    ],
    totalItems: 80,
    status: "received",
    shippedDate: "2024-11-10",
    expectedDate: "2024-11-12",
    receivedDate: "2024-11-12",
    receivedBy: "Ahmed Khan",
    trackingNumber: "TRK-123456",
  },
  {
    id: "2",
    receivalNumber: "RCV-2024-002",
    fromWarehouse: "Main Warehouse - Karachi",
    toBranch: "Islamabad Branch",
    items: [
      { name: "Product C", quantity: 100, sku: "SKU-003" },
      { name: "Product D", quantity: 75, sku: "SKU-004" },
      { name: "Product E", quantity: 25, sku: "SKU-005" },
    ],
    totalItems: 200,
    status: "in_transit",
    shippedDate: "2024-11-11",
    expectedDate: "2024-11-14",
    trackingNumber: "TRK-123457",
  },
  {
    id: "3",
    receivalNumber: "RCV-2024-003",
    fromWarehouse: "Secondary Warehouse - Lahore",
    toBranch: "Faisalabad Branch",
    items: [
      { name: "Product F", quantity: 40, sku: "SKU-006" },
    ],
    totalItems: 40,
    status: "delayed",
    shippedDate: "2024-11-08",
    expectedDate: "2024-11-11",
    trackingNumber: "TRK-123458",
  },
  {
    id: "4",
    receivalNumber: "RCV-2024-004",
    fromWarehouse: "Main Warehouse - Karachi",
    toBranch: "Multan Branch",
    items: [
      { name: "Product G", quantity: 60, sku: "SKU-007" },
      { name: "Product H", quantity: 40, sku: "SKU-008" },
    ],
    totalItems: 100,
    status: "pending",
    shippedDate: "2024-11-13",
    expectedDate: "2024-11-15",
    trackingNumber: "TRK-123459",
  },
];

export default function ReceivalsPage() {
  const [receivals] = useState<Receival[]>(demoReceivalsData);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReceivalStatus | "all">("all");

  const getStatusColor = (status: ReceivalStatus) => {
    switch (status) {
      case "received":
        return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle };
      case "in_transit":
        return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: Truck };
      case "pending":
        return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: Clock };
      case "delayed":
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertCircle };
    }
  };

  const filteredReceivalsData = receivals.filter((r) => {
    const matchesSearch = r.receivalNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fromWarehouse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.toBranch.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: receivals.length,
    received: receivals.filter((r) => r.status === "received").length,
    inTransit: receivals.filter((r) => r.status === "in_transit").length,
    pending: receivals.filter((r) => r.status === "pending").length,
    delayed: receivals.filter((r) => r.status === "delayed").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
            Receivals Management
          </h1>
          <p className="text-slate-600">Track and manage inventory receivals from warehouses to branches</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-[#0f4d8a]" />
            </div>
            <p className="text-sm text-slate-600 font-medium">Total Receivals</p>
            <p className="text-3xl font-bold text-[#0f4d8a] mt-1">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-slate-600 font-medium">Received</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats.received}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Truck className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-slate-600 font-medium">In Transit</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inTransit}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-sm text-slate-600 font-medium">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-sm text-slate-600 font-medium">Delayed</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{stats.delayed}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by receival number, warehouse, or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReceivalStatus | "all")}
                className="pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent appearance-none bg-white min-w-[180px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="received">Received</option>
                <option value="delayed">Delayed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Receivals List */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Receival Tracking</h2>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredReceivalsData.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No receivals found</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter</p>
              </div>
            ) : (
              filteredReceivalsData.map((receival) => {
                const statusStyle = getStatusColor(receival.status);
                const StatusIcon = statusStyle.icon;
                const isExpanded = expandedId === receival.id;

                return (
                  <div key={receival.id} className="hover:bg-slate-50 transition-colors">
                    <div
                      className="p-5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : receival.id)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`w-12 h-12 rounded-lg ${statusStyle.bg} border ${statusStyle.border} flex items-center justify-center flex-shrink-0`}>
                            <StatusIcon className={`w-6 h-6 ${statusStyle.text}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-800 text-lg">{receival.receivalNumber}</h3>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                                {receival.status.replace("_", " ").toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-600 mb-2">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-[#0f4d8a]" />
                                {receival.fromWarehouse}
                              </span>
                              <ArrowRight className="hidden sm:block w-4 h-4 text-slate-400" />
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-[#E67919]" />
                                {receival.toBranch}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <Box className="w-4 h-4" />
                                {receival.totalItems} items
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                Expected: {new Date(receival.expectedDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
                          {/* Timeline */}
                          <div className="bg-slate-50 rounded-lg p-4">
                            <h4 className="font-semibold text-slate-800 mb-3">Shipment Timeline</h4>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#0f4d8a] flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-800">Shipped</p>
                                  <p className="text-sm text-slate-600">{new Date(receival.shippedDate).toLocaleDateString()}</p>
                                </div>
                              </div>
                              
                              {receival.status === "in_transit" && (
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                    <Truck className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800">In Transit</p>
                                    <p className="text-sm text-slate-600">Currently en route</p>
                                  </div>
                                </div>
                              )}
                              
                              {receival.receivedDate && (
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800">Received</p>
                                    <p className="text-sm text-slate-600">{new Date(receival.receivedDate).toLocaleDateString()}</p>
                                    {receival.receivedBy && (
                                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                                        <User className="w-3 h-3" />
                                        {receival.receivedBy}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Items List */}
                          <div>
                            <h4 className="font-semibold text-slate-800 mb-3">Items ({receival.items.length})</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {receival.items.map((item, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-white to-slate-50 rounded-lg p-4 border border-slate-200">
                                  <p className="font-medium text-slate-800">{item.name}</p>
                                  <p className="text-sm text-slate-600 mt-1">SKU: {item.sku}</p>
                                  <p className="text-lg font-bold text-[#E67919] mt-2">Qty: {item.quantity}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tracking Info */}
                          {receival.trackingNumber && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <p className="text-sm font-medium text-slate-700">Tracking Number</p>
                              <p className="text-lg font-mono font-bold text-[#0f4d8a] mt-1">{receival.trackingNumber}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}