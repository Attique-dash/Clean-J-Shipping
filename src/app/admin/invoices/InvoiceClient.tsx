"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Download, Send, Calendar, DollarSign, User, Eye, Search, Filter, Edit } from "lucide-react";
import Link from "next/link";

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export default function InvoiceClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invoices", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load invoices");
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
    } catch (e) {
      console.error("Failed to load invoices:", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-700 border-gray-200";
      case "sent": return "bg-blue-100 text-blue-700 border-blue-200";
      case "paid": return "bg-green-100 text-green-700 border-green-200";
      case "overdue": return "bg-red-100 text-red-700 border-red-200";
      case "cancelled": return "bg-gray-100 text-gray-500 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const totalStats = invoices.reduce((acc, inv) => ({
    total: acc.total + inv.totalAmount,
    paid: acc.paid + (inv.status === 'paid' ? inv.totalAmount : 0),
    pending: acc.pending + (inv.status === 'sent' || inv.status === 'overdue' ? inv.totalAmount : 0),
    overdue: acc.overdue + (inv.status === 'overdue' ? inv.totalAmount : 0)
  }), { total: 0, paid: 0, pending: 0, overdue: 0 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                  Invoice Management
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  Create, manage and track customer invoices
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Link 
                  href="/admin/invoices/generator"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold shadow-md backdrop-blur transition hover:bg-white/25 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Plus className="h-5 w-5" />
                  New Invoice
                </Link>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group relative overflow-hidden rounded-xl bg-white/10 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Total Invoices</p>
                    <p className="mt-1 text-2xl font-bold">{invoices.length}</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl bg-green-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-100">Total Revenue</p>
                    <p className="mt-1 text-2xl font-bold">${totalStats.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl bg-blue-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Pending</p>
                    <p className="mt-1 text-2xl font-bold">${totalStats.pending.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl bg-red-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-red-100">Overdue</p>
                    <p className="mt-1 text-2xl font-bold">${totalStats.overdue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by invoice number, customer name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Recent Invoices</h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f4d8a]"></div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">
                  {searchTerm || statusFilter !== "all" ? "No matching invoices found" : "No invoices yet"}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "Create your first invoice to get started"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredInvoices.map((invoice) => (
                  <div key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-800 text-lg">
                              {invoice.invoiceNumber}
                            </h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{invoice.customerName}</span>
                              <span className="text-slate-400">•</span>
                              <span>{invoice.customerEmail}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Issued: {new Date(invoice.issueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">
                              ${invoice.totalAmount.toFixed(2)}
                            </p>
                            <p className="text-sm text-slate-500">{invoice.currency}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                              <Eye className="w-4 h-4 text-slate-600" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                              <Download className="w-4 h-4 text-slate-600" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                              <Send className="w-4 h-4 text-slate-600" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                              <Edit className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
