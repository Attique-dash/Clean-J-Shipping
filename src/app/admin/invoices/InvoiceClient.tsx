"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Download, Calendar, DollarSign, User, Eye, Search, Filter, Trash2, FileDown, TrendingUp, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { ExportService } from "@/lib/export-service";

type Invoice = {
  _id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    address?: string;
    phone?: string;
  };
  package?: {
    trackingNumber: string;
    userCode: string;
  };
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
    taxAmount: number;
    total: number;
  }>;
  notes?: string;
  paymentHistory?: Array<{
    amount: number;
    date: Date;
    method: string;
    reference?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export default function InvoiceClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invoices", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load invoices");
      setInvoices(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error("Failed to load invoices:", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-700 border-gray-300";
      case "sent": return "bg-blue-100 text-blue-700 border-blue-300";
      case "paid": return "bg-green-100 text-green-700 border-green-300";
      case "overdue": return "bg-red-100 text-red-700 border-red-300";
      case "cancelled": return "bg-gray-100 text-gray-500 border-gray-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="w-4 h-4" />;
      case "sent": return <Clock className="w-4 h-4" />;
      case "overdue": return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const totalStats = invoices.reduce((acc, inv) => ({
    total: acc.total + (inv.total || 0),
    paid: acc.paid + (inv.status === 'paid' ? (inv.total || 0) : 0),
    pending: acc.pending + (inv.status === 'sent' || inv.status === 'overdue' ? (inv.balanceDue || 0) : 0),
    overdue: acc.overdue + (inv.status === 'overdue' ? (inv.balanceDue || 0) : 0)
  }), { total: 0, paid: 0, pending: 0, overdue: 0 });

  async function deleteInvoice(invoiceId: string) {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    
    setDeletingId(invoiceId);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || 'Failed to delete invoice');
      }
      
      await loadInvoices();
    } catch (error) {
      console.error('Delete invoice error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  }

  async function downloadInvoice(invoice: Invoice, format: 'pdf' | 'excel' = 'pdf') {
    try {
      if (format === 'pdf') {
        // Simple professional invoice data for PDF
        const invoiceForPDF = {
          invoiceNumber: invoice.invoiceNumber || 'DRAFT',
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          status: invoice.status || 'draft',
          customer: {
            name: invoice.customer?.name || 'N/A',
            email: invoice.customer?.email || 'N/A',
            address: invoice.customer?.address || '',
            phone: invoice.customer?.phone || ''
          },
          items: (invoice.items || []).map(item => ({
            description: item.description || 'Service',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            taxRate: Number(item.taxRate) || 0,
            amount: Number(item.amount) || 0,
            taxAmount: Number(item.taxAmount) || 0,
            total: Number(item.total) || 0
          })),
          subtotal: Number(invoice.subtotal) || 0,
          taxTotal: Number(invoice.taxTotal) || 0,
          discountAmount: Number(invoice.discountAmount) || 0,
          total: Number(invoice.total) || 0,
          amountPaid: Number(invoice.amountPaid) || 0,
          balanceDue: Number(invoice.balanceDue) || 0,
          notes: invoice.notes || '',
          paymentHistory: (invoice.paymentHistory || []).map(payment => ({
            amount: Number(payment.amount) || 0,
            date: payment.date,
            method: payment.method || 'Unknown',
            reference: payment.reference || ''
          }))
        };
        
        ExportService.toInvoicePDF(invoiceForPDF, `invoice_${invoice.invoiceNumber}`);
      } else {
        // Excel export
        const invoiceData = {
          'Invoice Number': invoice.invoiceNumber,
          'Customer Name': invoice.customer?.name || 'N/A',
          'Customer Email': invoice.customer?.email || 'N/A',
          'Customer Phone': invoice.customer?.phone || 'N/A',
          'Customer Address': invoice.customer?.address || 'N/A',
          'Issue Date': new Date(invoice.issueDate).toLocaleDateString(),
          'Due Date': new Date(invoice.dueDate).toLocaleDateString(),
          'Status': invoice.status.toUpperCase(),
          'Currency': invoice.currency,
          'Subtotal': `$${(invoice.subtotal || 0).toFixed(2)}`,
          'Tax Total': `$${(invoice.taxTotal || 0).toFixed(2)}`,
          'Discount': `$${(invoice.discountAmount || 0).toFixed(2)}`,
          'Total Amount': `$${(invoice.total || 0).toFixed(2)}`,
          'Amount Paid': `$${(invoice.amountPaid || 0).toFixed(2)}`,
          'Balance Due': `$${(invoice.balanceDue || 0).toFixed(2)}`,
          'Package Tracking': invoice.package?.trackingNumber || 'N/A',
          'Notes': invoice.notes || 'N/A'
        };

        const itemsData = invoice.items?.map((item, index) => ({
          'Item #': index + 1,
          'Description': item.description,
          'Quantity': item.quantity,
          'Unit Price': `$${item.unitPrice.toFixed(2)}`,
          'Amount': `$${item.amount.toFixed(2)}`,
          'Tax Rate': `${item.taxRate}%`,
          'Tax Amount': `$${item.taxAmount.toFixed(2)}`,
          'Line Total': `$${item.total.toFixed(2)}`
        })) || [];

        ExportService.toExcelMultiSheet([
          { name: 'Invoice Summary', data: [invoiceData] },
          { name: 'Invoice Items', data: itemsData }
        ], `invoice_${invoice.invoiceNumber}_complete`);
      }
    } catch (error) {
      console.error('Download invoice error:', error);
      const errorMessage = error instanceof Error ? error.message : `Failed to download invoice as ${format.toUpperCase()}`;
      alert(`❌ Error: ${errorMessage}\n\nPlease check the console for more details.`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header Section */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f4d8a] via-[#1e5a9c] to-[#0d3d70] p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-200 font-semibold">Financial Management</p>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Invoice Management
                  </h1>
                  <p className="mt-1 text-blue-100">Create, track and manage customer invoices</p>
                </div>
              </div>
              
              <Link 
                href="/admin/invoices/generator"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E67919] to-[#ff8c2e] px-6 py-3.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="h-5 w-5" />
                Create Invoice
              </Link>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 transition-all hover:bg-white/15 hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-200">Total Invoices</p>
                    <p className="mt-2 text-3xl font-bold">{invoices.length}</p>
                    <p className="mt-1 text-xs text-blue-300">All time</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-3">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md border border-green-400/30 p-6 transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/20 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-100">Total Revenue</p>
                    <p className="mt-2 text-3xl font-bold">${totalStats.paid.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-green-200">Collected</p>
                  </div>
                  <div className="rounded-xl bg-green-400/30 p-3">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md border border-blue-400/30 p-6 transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100">Pending</p>
                    <p className="mt-2 text-3xl font-bold">${totalStats.pending.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-blue-200">Outstanding</p>
                  </div>
                  <div className="rounded-xl bg-blue-400/30 p-3">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 backdrop-blur-md border border-red-400/30 p-6 transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-400/20 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-100">Overdue</p>
                    <p className="mt-2 text-3xl font-bold">${totalStats.overdue.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-red-200">Requires action</p>
                  </div>
                  <div className="rounded-xl bg-red-400/30 p-3">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Filters Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter Invoices
            </h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by invoice number, customer name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all"
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
        </div>

        {/* Enhanced Invoices List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Invoices
              </h2>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-xl">
                <span className="text-white text-sm font-semibold">{filteredInvoices.length} Results</span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0f4d8a] border-t-transparent"></div>
                  <p className="text-gray-500 font-medium">Loading invoices...</p>
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {searchTerm || statusFilter !== "all" ? "No matching invoices found" : "No invoices yet"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your filters to see more results" 
                    : "Create your first invoice to start managing payments"
                  }
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Link
                    href="/admin/invoices/generator"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#E67919] text-white font-semibold hover:shadow-lg transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Invoice
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => (
                  <div key={invoice._id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all group">
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg">
                              {invoice.invoiceNumber.slice(-4)}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">
                                {invoice.invoiceNumber}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                                  {getStatusIcon(invoice.status)}
                                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                </span>
                                {invoice.balanceDue > 0 && invoice.status !== 'cancelled' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                    <DollarSign className="w-3 h-3" />
                                    ${invoice.balanceDue.toFixed(2)} due
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{invoice.customer?.name || 'N/A'}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">{invoice.customer?.email || 'N/A'}</span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Issued: <span className="font-medium text-gray-700">{new Date(invoice.issueDate).toLocaleDateString()}</span></span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Due: <span className="font-medium text-gray-700">{new Date(invoice.dueDate).toLocaleDateString()}</span></span>
                              </div>
                              {invoice.package?.trackingNumber && (
                                <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
                                  <span className="font-mono text-blue-700">{invoice.package.trackingNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
                              ${(invoice.total || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{invoice.currency}</p>
                            {invoice.amountPaid > 0 && (
                              <div className="mt-2 flex flex-col gap-1">
                                <p className="text-xs text-green-600 font-medium">Paid: ${invoice.amountPaid.toFixed(2)}</p>
                                {invoice.balanceDue > 0 && (
                                  <p className="text-xs text-orange-600 font-medium">Due: ${invoice.balanceDue.toFixed(2)}</p>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => downloadInvoice(invoice, 'pdf')}
                              className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all group"
                              title="Download as PDF"
                            >
                              <Download className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                              onClick={() => downloadInvoice(invoice, 'excel')}
                              className="p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all group"
                              title="Download as Excel"
                            >
                              <FileDown className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                              onClick={() => deleteInvoice(invoice._id)}
                              disabled={deletingId === invoice._id}
                              className="p-2.5 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 transition-all group disabled:opacity-50"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
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