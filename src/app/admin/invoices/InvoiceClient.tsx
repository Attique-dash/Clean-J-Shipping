"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Download, DollarSign, Search, Filter, Trash2, FileDown, TrendingUp, Clock, CheckCircle, Eye, X, HelpCircle } from "lucide-react";
import Link from "next/link";
import { ExportService } from "@/lib/export-service";
import Loading from "@/components/Loading";
import { useCurrency } from "@/contexts/CurrencyContext";
import EnhancedCurrencySelector from "@/components/EnhancedCurrencySelector";

type Invoice = {
  _id: string;
  invoiceNumber: string;
  invoiceType: "billing" | "commercial" | "system"; // NEW: Invoice type
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
  status:
    | "draft"
    | "paid"
    | "unpaid"
    | "overdue"
    | "partially_paid"
    | "cancelled";
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
    date: string;
    method: string;
    reference?: string;
  }>;
  // Commercial invoice fields
  tracking_number?: string;
  item_description?: string;
  item_category?: string;
  files?: Array<{
    originalName?: string;
    filename?: string;
    path?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export default function InvoiceClient() {
  const { selectedCurrency, setSelectedCurrency, convertAmount, formatCurrency } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // NEW: Invoice type filter
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [showInvoiceTypeInfo, setShowInvoiceTypeInfo] = useState(false);
  const [displayAmounts, setDisplayAmounts] = useState<Record<string, string>>({});

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

  // Convert and format amounts based on selected currency
  useEffect(() => {
    const convertAmounts = async () => {
      const amounts: Record<string, string> = {};
      
      try {
        // Convert total stats
        amounts.totalAmount = formatCurrency(await convertAmount(totalStats.totalAmount, "USD"), selectedCurrency);
        amounts.paidAmount = formatCurrency(await convertAmount(totalStats.paidAmount, "USD"), selectedCurrency);
        amounts.unpaidAmount = formatCurrency(await convertAmount(totalStats.unpaidAmount, "USD"), selectedCurrency);
        amounts.overdueAmount = formatCurrency(await convertAmount(totalStats.overdueAmount, "USD"), selectedCurrency);
        
        // Convert invoice amounts (all stored in USD)
        for (const invoice of invoices) {
          const key = `invoice_${invoice._id}`;
          amounts[`${key}_total`] = formatCurrency(await convertAmount(invoice.total || 0, "USD"), selectedCurrency);
          amounts[`${key}_paid`] = formatCurrency(await convertAmount(invoice.amountPaid || 0, "USD"), selectedCurrency);
          amounts[`${key}_balance`] = formatCurrency(await convertAmount(invoice.balanceDue || 0, "USD"), selectedCurrency);
        }
      } catch (error) {
        console.error("Currency conversion error:", error);
      }
      
      setDisplayAmounts(amounts);
    };
    
    if (invoices.length > 0) {
      convertAmounts();
    }
  }, [invoices, selectedCurrency, convertAmount, formatCurrency]);

  const formatAmount = (amount: number, currency: string = "USD") => {
    return formatCurrency(amount, selectedCurrency);
  };

  // NEW: Helper functions for invoice types
  const getInvoiceTypeColor = (type: string) => {
    switch (type) {
      case 'billing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'commercial': return 'bg-green-100 text-green-700 border-green-300';
      case 'system': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getInvoiceTypeIcon = (type: string) => {
    switch (type) {
      case 'billing': return '💰';
      case 'commercial': return '📋';
      case 'system': return '⚙️';
      default: return '📄';
    }
  };

  const getInvoiceTypeLabel = (type: string) => {
    switch (type) {
      case 'billing': return 'Billing';
      case 'commercial': return 'Commercial';
      case 'system': return 'System';
      default: return 'Unknown';
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      invoice.invoiceNumber.toLowerCase().includes(q) ||
      invoice.customer?.name.toLowerCase().includes(q) ||
      invoice.customer?.email.toLowerCase().includes(q) ||
      (invoice.package?.trackingNumber || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesType = typeFilter === "all" || invoice.invoiceType === typeFilter;

    const issue = invoice.issueDate ? new Date(invoice.issueDate) : null;
    const due = invoice.dueDate ? new Date(invoice.dueDate) : null;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDate = (() => {
      if (!start && !end) return true;
      if (!issue && !due) return false;
      const ref = issue || due;
      if (!ref) return false;
      if (start && ref < start) return false;
      if (end) {
        const endInclusive = new Date(end);
        endInclusive.setHours(23, 59, 59, 999);
        if (ref > endInclusive) return false;
      }
      return true;
    })();

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-700 border-gray-300";
      case "paid": return "bg-green-100 text-green-700 border-green-300";
      case "partially_paid": return "bg-amber-100 text-amber-700 border-amber-300";
      case "unpaid": return "bg-blue-100 text-blue-700 border-blue-300";
      case "overdue": return "bg-red-100 text-red-700 border-red-300";
      case "cancelled": return "bg-gray-100 text-gray-500 border-gray-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="w-4 h-4" />;
      case "unpaid": return <Clock className="w-4 h-4" />;
      case "partially_paid": return <DollarSign className="w-4 h-4" />;
      case "overdue": return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const totalStats = invoices.reduce(
    (acc, inv) => {
      const total = Number(inv.total) || 0;
      const paid = Math.min(Number(inv.amountPaid) || 0, total);
      const outstanding = Math.max(0, total - paid);

      acc.totalAmount += total;
      acc.paidAmount += paid;

      if (inv.status === "overdue") {
        acc.overdueAmount += outstanding;
      }
      if (inv.status === "unpaid" || inv.status === "partially_paid") {
        acc.unpaidAmount += outstanding;
      }

      return acc;
    },
    { totalAmount: 0, paidAmount: 0, unpaidAmount: 0, overdueAmount: 0 }
  );

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

        await ExportService.toInvoicePDF(invoiceForPDF, `invoice_${invoice.invoiceNumber}`);
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
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Invoice Management
                  </h1>
                  <p className="mt-1 text-blue-100">Create, track and manage customer invoices</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <EnhancedCurrencySelector
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={setSelectedCurrency}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                />
                <Link
                  href="/admin/invoices/generator"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E67919] to-[#ff8c2e] px-6 py-3.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  Create Invoice
                </Link>
              </div>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 transition-all hover:bg-white/15 hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-blue-200">Total Invoices</p>
                    <p className="mt-2 text-2xl font-bold">{invoices.length}</p>
                    <p className="mt-1 text-xs text-blue-300">All time</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-2 flex-shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-md border border-indigo-400/30 p-6 transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-indigo-100">Total Amount</p>
                    <p className="mt-2 text-xl font-bold">{displayAmounts.totalAmount || formatAmount(totalStats.totalAmount)}</p>
                    <p className="mt-1 text-xs text-indigo-200">{selectedCurrency}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-400/30 p-2 flex-shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md border border-green-400/30 p-6 transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/20 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-green-100">Paid Amount</p>
                    <p className="mt-2 text-xl font-bold">{displayAmounts.paidAmount || formatAmount(totalStats.paidAmount)}</p>
                    <p className="mt-1 text-xs text-green-200">Collected</p>
                  </div>
                  <div className="rounded-xl bg-green-400/30 p-2 flex-shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md border border-blue-400/30 p-6 transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-blue-100">Unpaid Amount</p>
                    <p className="mt-2 text-xl font-bold">{displayAmounts.unpaidAmount || formatAmount(totalStats.unpaidAmount)}</p>
                    <p className="mt-1 text-xs text-blue-200">Outstanding</p>
                  </div>
                  <div className="rounded-xl bg-blue-400/30 p-2 flex-shrink-0">
                    <TrendingUp className="h-5 w-5" />
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
                    placeholder="Search by invoice number, customer name, email, or tracking number..."
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
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all"
                >
                  <option value="all">All Types</option>
                  <option value="billing">💰 Billing</option>
                  <option value="commercial">📋 Commercial</option>
                  <option value="system">⚙️ System</option>
                </select>
                <button
                  onClick={() => setShowInvoiceTypeInfo(!showInvoiceTypeInfo)}
                  className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                  title="Invoice Type Information"
                >
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                </button>
              </div>
            </div>

            {/* Invoice Type Information */}
            {showInvoiceTypeInfo && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Invoice Types Explained
                </h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>💰 Billing:</strong> Standard invoices created for customer charges (shipping fees, customs duties, storage fees, etc.). These are the most common invoices and are generated automatically when packages are added or bills are created.</p>
                  <p><strong>📋 Commercial:</strong> Commercial invoices used for international shipments. These include detailed item descriptions, HS codes, and customs information. Created when packages require customs clearance or international shipping documentation.</p>
                  <p><strong>⚙️ System:</strong> System-generated invoices for internal processes, adjustments, or automated billing. These are typically created by the system for administrative purposes.</p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all"
                />
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
              <Loading message="Loading invoices..." />
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
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr className="text-xs font-semibold text-gray-600">
                    <th className="px-4 py-3">Invoice Number</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Paid Amount</th>
                    <th className="px-4 py-3">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${getInvoiceTypeColor(invoice.invoiceType || 'billing')}`}>
                          <span>{getInvoiceTypeIcon(invoice.invoiceType || 'billing')}</span>
                          {getInvoiceTypeLabel(invoice.invoiceType || 'billing')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{invoice.customer?.name || 'N/A'}</span>
                          <span className="text-xs text-gray-500">{invoice.customer?.email || ''}</span>
                          {invoice.package?.trackingNumber && (
                            <span className="mt-1 inline-flex w-fit items-center rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs text-blue-700">
                              {invoice.package.trackingNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-semibold">{displayAmounts[`invoice_${invoice._id}_total`] || formatAmount(invoice.total || 0, "USD")}</td>
                      <td className="px-4 py-3 text-green-700">{displayAmounts[`invoice_${invoice._id}_paid`] || formatAmount(invoice.amountPaid || 0, "USD")}</td>
                      <td className="px-4 py-3 text-orange-700">{displayAmounts[`invoice_${invoice._id}_balance`] || formatAmount(invoice.balanceDue || 0, "USD")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status === 'partially_paid'
                            ? 'Partially Paid'
                            : invoice.status === 'unpaid'
                              ? 'Unpaid'
                              : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingInvoice(invoice)}
                            className="p-2.5 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 transition-all group"
                            title="View Invoice Details"
                          >
                            <Eye className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                          </button>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-[#0f4d8a] to-[#E67919] p-6 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Invoice Details</h2>
              <button
                onClick={() => setViewingInvoice(null)}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Invoice Number</p>
                  <p className="font-semibold text-lg">{viewingInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(viewingInvoice.status)}`}>
                    {getStatusIcon(viewingInvoice.status)}
                    {viewingInvoice.status === 'partially_paid' ? 'Partially Paid' : viewingInvoice.status.charAt(0).toUpperCase() + viewingInvoice.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Issue Date</p>
                  <p className="font-medium">{new Date(viewingInvoice.issueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Due Date</p>
                  <p className="font-medium">{new Date(viewingInvoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Customer Information */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Name</p>
                    <p className="font-medium">{viewingInvoice.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Email</p>
                    <p className="font-medium">{viewingInvoice.customer?.email || 'N/A'}</p>
                  </div>
                  {viewingInvoice.customer?.phone && (
                    <div>
                      <p className="text-gray-500 mb-1">Phone</p>
                      <p className="font-medium">{viewingInvoice.customer.phone}</p>
                    </div>
                  )}
                  {viewingInvoice.package?.trackingNumber && (
                    <div>
                      <p className="text-gray-500 mb-1">Tracking Number</p>
                      <p className="font-medium font-mono">{viewingInvoice.package.trackingNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Items with Breakdown */}
              {viewingInvoice.items && viewingInvoice.items.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Invoice Items & Charges</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Quantity</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Unit Price</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Tax ({viewingInvoice.items[0]?.taxRate || 0}%)</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {viewingInvoice.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{item.description}</div>
                              {/* Categorize charge type if description contains keywords */}
                              {(item.description.toLowerCase().includes('shipping') || 
                                item.description.toLowerCase().includes('freight') ||
                                item.description.toLowerCase().includes('transport')) && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">Shipping</span>
                              )}
                              {(item.description.toLowerCase().includes('customs') || 
                                item.description.toLowerCase().includes('duty')) && (
                                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1 inline-block">Customs Duty</span>
                              )}
                              {(item.description.toLowerCase().includes('storage') || 
                                item.description.toLowerCase().includes('warehouse')) && (
                                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block">Storage</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatAmount(item.unitPrice, "USD")}</td>
                            <td className="px-4 py-3 text-right">{formatAmount(item.amount, "USD")}</td>
                            <td className="px-4 py-3 text-right">{formatAmount(item.taxAmount, "USD")}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatAmount(item.total, "USD")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="border-t pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatAmount(viewingInvoice.subtotal || 0, "USD")}</span>
                  </div>
                  {viewingInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">-{formatAmount(viewingInvoice.discountAmount, "USD")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax Total ({viewingInvoice.items?.[0]?.taxRate || 0}%):</span>
                    <span className="font-medium">{formatAmount(viewingInvoice.taxTotal || 0, "USD")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold text-lg text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-[#0f4d8a]">{formatAmount(viewingInvoice.total || 0, "USD")}</span>
                  </div>
                  <div className="flex justify-between text-green-700 pt-2">
                    <span>Amount Paid:</span>
                    <span className="font-medium">{formatAmount(viewingInvoice.amountPaid || 0, "USD")}</span>
                  </div>
                  <div className="flex justify-between text-orange-700 pt-2 border-t">
                    <span className="font-semibold">Balance Due:</span>
                    <span className="font-bold">{formatAmount(viewingInvoice.balanceDue || 0, "USD")}</span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {viewingInvoice.paymentHistory && viewingInvoice.paymentHistory.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Payment History</h3>
                  <div className="space-y-2">
                    {viewingInvoice.paymentHistory.map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium">{formatAmount(payment.amount, "USD")}</p>
                          <p className="text-gray-500 text-xs">{payment.method} • {new Date(payment.date).toLocaleDateString()}</p>
                        </div>
                        {payment.reference && (
                          <p className="text-gray-400 text-xs font-mono">{payment.reference}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingInvoice.notes && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">{viewingInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl flex justify-end gap-3 border-t">
              <button
                onClick={() => downloadInvoice(viewingInvoice, 'pdf')}
                className="px-4 py-2 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#0e447d] transition-colors"
              >
                Download PDF
              </button>
              <button
                onClick={() => setViewingInvoice(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}