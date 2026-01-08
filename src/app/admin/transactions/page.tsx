"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Search, Filter, Calendar, ChevronDown, CheckCircle, XCircle, Clock, AlertCircle, Download, Eye, User, Building, Receipt, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import EnhancedCurrencySelector from "@/components/EnhancedCurrencySelector";

type TransactionType = "sale" | "refund" | "purchase" | "expense";
type TransactionStatus = "completed" | "pending" | "failed" | "reconciled" | "captured" | "authorized" | "refunded";

type Transaction = {
  id: string;
  transactionId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  description: string;
  customer?: string;
  vendor?: string;
  paymentMethod: string;
  reference?: string;
  date: string;
  reconciled: boolean;
  category: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; transaction: Transaction | null }>({ open: false, transaction: null });
  const { selectedCurrency, setSelectedCurrency, convertAmount, formatCurrency } = useCurrency();

  // Helper function to convert and format amounts
  const convertAndFormatAmount = async (amount: number, fromCurrency: string) => {
    if (fromCurrency === selectedCurrency) {
      return formatCurrency(amount, selectedCurrency);
    }
    try {
      const convertedAmount = await convertAmount(amount, fromCurrency || "USD");
      return formatCurrency(convertedAmount, selectedCurrency);
    } catch (error) {
      return formatCurrency(amount, selectedCurrency);
    }
  };

  // State for converted transaction amounts
  const [convertedTransactions, setConvertedTransactions] = useState<Array<{id: string, amount: string}>>([]);

  useEffect(() => {
    const updateTransactionAmounts = async () => {
      const converted = await Promise.all(
        transactions.map(async (transaction) => {
          const convertedAmount = await convertAndFormatAmount(transaction.amount, "USD");
          return {
            id: transaction.id,
            amount: convertedAmount,
          };
        })
      );
      setConvertedTransactions(converted);
    };
    updateTransactionAmounts();
  }, [transactions, selectedCurrency]);

  async function loadTransactions() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("method", typeFilter);
      
      const res = await fetch(`/api/admin/transactions?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load transactions");
      
      const mapped: Transaction[] = (data.transactions || []).map((t: unknown) => {
        const transaction = t as { id?: string; reference?: string; gateway_id?: string; method?: string; status?: string; amount?: number; tracking_number?: string; user_code?: string; payment_gateway?: string; paymentGateway?: string; created_at?: string };
        // Determine payment method display
        let methodDisplay = transaction.method || "unknown";
        const paymentGateway = transaction.payment_gateway || transaction.paymentGateway;
        if (paymentGateway === "paypal") {
          methodDisplay = "PayPal";
        } else if (paymentGateway === "Testing") {
          methodDisplay = "Testing";
        }

        return {
          id: transaction.id || '',
          transactionId: transaction.reference || transaction.gateway_id || transaction.id || '',
          type: transaction.method === "refund" ? "refund" : "sale" as TransactionType,
          status: transaction.status as TransactionStatus,
          amount: transaction.amount || 0,
          description: `Payment - ${transaction.tracking_number || transaction.user_code || "Transaction"}`,
          customer: transaction.user_code || undefined,
          paymentMethod: methodDisplay,
          reference: transaction.reference || transaction.gateway_id || undefined,
          date: transaction.created_at || new Date().toISOString(),
          reconciled: transaction.status === "captured" || transaction.status === "completed",
          category: transaction.method === "refund" ? "Refunds" : paymentGateway === "paypal" ? "PayPal Payments" : "Sales",
        };
      });
      
      setTransactions(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, typeFilter]);

  async function deleteTransaction(transactionId: string) {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/transactions?id=${transactionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete transaction');
      }
      
      setDeleteConfirm({ open: false, transaction: null });
      await loadTransactions();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  }

  function openDeleteConfirm(transaction: Transaction) {
    setDeleteConfirm({ open: true, transaction });
  }

  const getTypeStyle = (type: TransactionType) => {
    switch (type) {
      case "sale":
        return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: TrendingUp };
      case "refund":
        return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: TrendingDown };
      case "purchase":
        return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: CreditCard };
      case "expense":
        return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: Receipt };
    }
  };

  const getStatusStyle = (status: TransactionStatus) => {
    switch (status) {
      case "completed":
      case "captured":
        return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle };
      case "pending":
      case "authorized":
        return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: Clock };
      case "failed":
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: XCircle };
      case "reconciled":
        return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: CheckCircle };
      case "refunded":
        return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: XCircle };
      default:
        return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: AlertCircle };
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Convert stats to selected currency
  const [displayStats, setDisplayStats] = useState<{totalRevenue: string, totalExpenses: string, totalRefunds: string}>({
    totalRevenue: "",
    totalExpenses: "",
    totalRefunds: "",
  });

  useEffect(() => {
    const updateDisplayStats = async () => {
      const totalRevenue = transactions.filter(t => t.type === "sale" && (t.status === "completed" || t.status === "captured")).reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions.filter(t => (t.type === "expense" || t.type === "purchase") && (t.status === "completed" || t.status === "captured")).reduce((sum, t) => sum + t.amount, 0);
      const totalRefunds = transactions.filter(t => (t.type === "refund" || t.status === "refunded") && (t.status === "completed" || t.status === "captured" || t.status === "refunded")).reduce((sum, t) => sum + t.amount, 0);

      const convertedRevenue = await convertAndFormatAmount(totalRevenue, "USD");
      const convertedExpenses = await convertAndFormatAmount(totalExpenses, "USD");
      const convertedRefunds = await convertAndFormatAmount(totalRefunds, "USD");

      setDisplayStats({
        totalRevenue: convertedRevenue,
        totalExpenses: convertedExpenses,
        totalRefunds: convertedRefunds,
      });
    };
    updateDisplayStats();
  }, [transactions, selectedCurrency]);

  const _stats = {
    totalRevenue: transactions.filter(t => t.type === "sale" && (t.status === "completed" || t.status === "captured")).reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: transactions.filter(t => (t.type === "expense" || t.type === "purchase") && (t.status === "completed" || t.status === "captured")).reduce((sum, t) => sum + t.amount, 0),
    totalRefunds: transactions.filter(t => (t.type === "refund" || t.status === "refunded") && (t.status === "completed" || t.status === "captured" || t.status === "refunded")).reduce((sum, t) => sum + t.amount, 0),
    pending: transactions.filter(t => t.status === "pending" || t.status === "authorized").length,
    unreconciled: transactions.filter(t => !t.reconciled).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />

          <div className="relative flex flex-col gap-6">
            
            {/* Top Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                  Transactions Management
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  View, reconcile, and manage all financial transactions
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <EnhancedCurrencySelector
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={setSelectedCurrency}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                />
                <button 
                  onClick={loadTransactions}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold shadow-md backdrop-blur transition hover:bg-white/25 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Stats Cards inside header */}
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">

              {/* Total Revenue */}
              <div className="group relative overflow-hidden rounded-xl bg-green-500/20 p-4 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-3">
                  <div className="rounded-lg bg-white/20 p-2.5 flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-green-100 truncate">Total Revenue</p>
                    <p className="mt-0.5 text-lg font-bold truncate">{displayStats.totalRevenue}</p>
                  </div>
                </div>
              </div>

              {/* Total Expenses */}
              <div className="group relative overflow-hidden rounded-xl bg-red-500/20 p-4 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-3">
                  <div className="rounded-lg bg-white/20 p-2.5 flex-shrink-0">
                    <TrendingDown className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-red-100 truncate">Total Expenses</p>
                    <p className="mt-0.5 text-lg font-bold truncate">{displayStats.totalExpenses}</p>
                  </div>
                </div>
              </div>

              {/* Total Refunds */}
              <div className="group relative overflow-hidden rounded-xl bg-orange-500/20 p-4 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-3">
                  <div className="rounded-lg bg-white/20 p-2.5 flex-shrink-0">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-orange-100 truncate">Total Refunds</p>
                    <p className="mt-0.5 text-lg font-bold truncate">{displayStats.totalRefunds}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by transaction ID, description, customer, or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TransactionType | "all")}
                  className="pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent appearance-none bg-white min-w-[140px]"
                >
                  <option value="all">All Types</option>
                  <option value="sale">Sales</option>
                  <option value="refund">Refunds</option>
                  <option value="purchase">Purchases</option>
                  <option value="expense">Expenses</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | "all")}
                  className="pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent appearance-none bg-white min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="reconciled">Reconciled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-800">{filteredTransactions.length}</span> of <span className="font-semibold text-slate-800">{transactions.length}</span> transactions
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const params = new URLSearchParams();
                    if (searchQuery) params.append("q", searchQuery);
                    if (statusFilter !== "all") params.append("status", statusFilter);
                    if (typeFilter !== "all") params.append("method", typeFilter);
                    params.append("format", "csv");
                    
                    const res = await fetch(`/api/admin/transactions/export?${params.toString()}`, {
                      credentials: 'include',
                    });
                    if (!res.ok) throw new Error('CSV export failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to export CSV');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={async () => {
                  try {
                    const params = new URLSearchParams();
                    if (searchQuery) params.append("q", searchQuery);
                    if (statusFilter !== "all") params.append("status", statusFilter);
                    if (typeFilter !== "all") params.append("method", typeFilter);
                    params.append("format", "pdf");
                    
                    const res = await fetch(`/api/admin/transactions/export?${params.toString()}`, {
                      credentials: 'include',
                    });
                    if (!res.ok) throw new Error('PDF export failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `transactions-${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to export PDF');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Transaction History</h2>
          </div>

          <div className="divide-y divide-slate-200">
            {loading ? (
              <div className="p-12">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                <p className="text-red-500 font-medium">{error}</p>
                <button 
                  onClick={loadTransactions}
                  className="mt-4 px-4 py-2 rounded-lg bg-[#0f4d8a] text-white hover:bg-[#0e447d] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No transactions found</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredTransactions.map((txn) => {
                const typeStyle = getTypeStyle(txn.type);
                const statusStyle = getStatusStyle(txn.status);
                const TypeIcon = typeStyle.icon;
                const StatusIcon = statusStyle.icon;

                return (
                  <div key={txn.id} className="hover:bg-slate-50 transition-colors p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-lg ${typeStyle.bg} border ${typeStyle.border} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className={`w-6 h-6 ${typeStyle.text}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-800">{txn.transactionId}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                              {txn.type.toUpperCase()}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} flex items-center gap-1`}>
                              <StatusIcon className="w-3 h-3" />
                              {txn.status.toUpperCase()}
                            </span>
                            {txn.reconciled && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                RECONCILED
                              </span>
                            )}
                          </div>

                          <p className="text-slate-700 mb-2">{txn.description}</p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                            {txn.customer && (
                              <span className="flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                {txn.customer}
                              </span>
                            )}
                            {txn.vendor && (
                              <span className="flex items-center gap-1.5">
                                <Building className="w-4 h-4" />
                                {txn.vendor}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4" />
                              {txn.paymentMethod}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {new Date(txn.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${txn.type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.type === 'sale' ? '+' : '-'} {convertedTransactions.find(ct => ct.id === txn.id)?.amount || `PKR ${txn.amount.toLocaleString()}`}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{txn.category}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedTransaction(txn)}
                            className="w-10 h-10 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          >
                            <Eye className="w-5 h-5 text-slate-600" />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(txn)}
                            className="w-10 h-10 rounded-lg border border-red-300 hover:bg-red-50 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedTransaction(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Transaction Details</h3>
                <button onClick={() => setSelectedTransaction(null)} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Transaction ID</p>
                    <p className="text-lg font-semibold text-slate-800">{selectedTransaction.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Amount</p>
                    <p className={`text-2xl font-bold ${selectedTransaction.type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedTransaction.type === 'sale' ? '+' : '-'} {convertedTransactions.find(ct => ct.id === selectedTransaction.id)?.amount || `PKR ${selectedTransaction.amount.toLocaleString()}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Type</p>
                    <p className="text-slate-800 capitalize">{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Status</p>
                    <p className="text-slate-800 capitalize">{selectedTransaction.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Date</p>
                    <p className="text-slate-800">{new Date(selectedTransaction.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Payment Method</p>
                    <p className="text-slate-800">{selectedTransaction.paymentMethod}</p>
                  </div>
                  {selectedTransaction.customer && (
                    <div>
                      <p className="text-sm text-slate-600 font-medium mb-1">Customer</p>
                      <p className="text-slate-800">{selectedTransaction.customer}</p>
                    </div>
                  )}
                  {selectedTransaction.vendor && (
                    <div>
                      <p className="text-sm text-slate-600 font-medium mb-1">Vendor</p>
                      <p className="text-slate-800">{selectedTransaction.vendor}</p>
                    </div>
                  )}
                  {selectedTransaction.reference && (
                    <div>
                      <p className="text-sm text-slate-600 font-medium mb-1">Reference</p>
                      <p className="text-slate-800">{selectedTransaction.reference}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Category</p>
                    <p className="text-slate-800">{selectedTransaction.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Reconciliation Status</p>
                    <p className={`font-medium ${selectedTransaction.reconciled ? 'text-green-600' : 'text-yellow-600'}`}>
                      {selectedTransaction.reconciled ? 'Reconciled' : 'Not Reconciled'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium mb-2">Description</p>
                  <p className="text-slate-800 bg-slate-50 p-4 rounded-lg">{selectedTransaction.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.open && deleteConfirm.transaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setDeleteConfirm({ open: false, transaction: null })}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Delete Transaction
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium mb-2">
                    Are you sure you want to delete this transaction?
                  </p>
                  <div className="space-y-1 text-sm text-red-700">
                    <p><strong>Transaction ID:</strong> {deleteConfirm.transaction.transactionId}</p>
                    <p><strong>Amount:</strong> {deleteConfirm?.transaction?.type === 'sale' ? '+' : '-'} {convertedTransactions.find(ct => ct.id === deleteConfirm?.transaction?.id)?.amount || `PKR ${deleteConfirm?.transaction?.amount?.toLocaleString()}`}</p>
                    <p><strong>Description:</strong> {deleteConfirm.transaction.description}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  This action cannot be undone. The transaction will be permanently removed from the system.
                </p>
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setDeleteConfirm({ open: false, transaction: null })}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteTransaction(deleteConfirm.transaction!.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Transaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}