"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Search, Filter, Calendar, ChevronDown, CheckCircle, XCircle, Clock, AlertCircle, Download, Eye, User, Building, Receipt } from "lucide-react";

type TransactionType = "sale" | "refund" | "purchase" | "expense";
type TransactionStatus = "completed" | "pending" | "failed" | "reconciled";

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

// Demo data
const demoTransactions: Transaction[] = [
  {
    id: "1",
    transactionId: "TXN-2024-001",
    type: "sale",
    status: "completed",
    amount: 15000,
    description: "Product sale - Bulk order",
    customer: "Ali Ahmed",
    paymentMethod: "Bank Transfer",
    reference: "REF-001",
    date: "2024-11-13",
    reconciled: true,
    category: "Sales",
  },
  {
    id: "2",
    transactionId: "TXN-2024-002",
    type: "refund",
    status: "completed",
    amount: 2500,
    description: "Product return - Damaged item",
    customer: "Sara Khan",
    paymentMethod: "Cash",
    reference: "REF-002",
    date: "2024-11-13",
    reconciled: false,
    category: "Refunds",
  },
  {
    id: "3",
    transactionId: "TXN-2024-003",
    type: "purchase",
    status: "pending",
    amount: 45000,
    description: "Inventory purchase from supplier",
    vendor: "ABC Suppliers Ltd",
    paymentMethod: "Credit",
    reference: "PO-123",
    date: "2024-11-12",
    reconciled: false,
    category: "Purchases",
  },
  {
    id: "4",
    transactionId: "TXN-2024-004",
    type: "expense",
    status: "completed",
    amount: 8000,
    description: "Office rent - November",
    vendor: "Property Management",
    paymentMethod: "Bank Transfer",
    reference: "RENT-NOV",
    date: "2024-11-12",
    reconciled: true,
    category: "Operating Expenses",
  },
  {
    id: "5",
    transactionId: "TXN-2024-005",
    type: "sale",
    status: "failed",
    amount: 12000,
    description: "Online order - Payment failed",
    customer: "Hassan Malik",
    paymentMethod: "Credit Card",
    date: "2024-11-11",
    reconciled: false,
    category: "Sales",
  },
  {
    id: "6",
    transactionId: "TXN-2024-006",
    type: "sale",
    status: "reconciled",
    amount: 28000,
    description: "Corporate order - Office supplies",
    customer: "XYZ Corporation",
    paymentMethod: "Bank Transfer",
    reference: "INV-456",
    date: "2024-11-10",
    reconciled: true,
    category: "Sales",
  },
  {
    id: "7",
    transactionId: "TXN-2024-007",
    type: "expense",
    status: "completed",
    amount: 3500,
    description: "Utility bills - Electricity",
    vendor: "K-Electric",
    paymentMethod: "Online Banking",
    reference: "BILL-789",
    date: "2024-11-10",
    reconciled: false,
    category: "Utilities",
  },
  {
    id: "8",
    transactionId: "TXN-2024-008",
    type: "purchase",
    status: "completed",
    amount: 67000,
    description: "Equipment purchase - New machinery",
    vendor: "Industrial Equipment Co",
    paymentMethod: "Cheque",
    reference: "CHQ-321",
    date: "2024-11-09",
    reconciled: true,
    category: "Capital Expenditure",
  },
];

export default function TransactionsPage() {
  const [transactions] = useState<Transaction[]>(demoTransactions);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

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
        return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle };
      case "pending":
        return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: Clock };
      case "failed":
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: XCircle };
      case "reconciled":
        return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: CheckCircle };
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

  const stats = {
    totalRevenue: transactions.filter(t => t.type === "sale" && t.status === "completed").reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: transactions.filter(t => (t.type === "expense" || t.type === "purchase") && t.status === "completed").reduce((sum, t) => sum + t.amount, 0),
    totalRefunds: transactions.filter(t => t.type === "refund" && t.status === "completed").reduce((sum, t) => sum + t.amount, 0),
    pending: transactions.filter(t => t.status === "pending").length,
    unreconciled: transactions.filter(t => !t.reconciled).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
            Transactions Management
          </h1>
          <p className="text-slate-600">View, reconcile, and manage all financial transactions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-slate-600 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600 mt-1">PKR {stats.totalRevenue.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-slate-600 font-medium">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600 mt-1">PKR {stats.totalExpenses.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E67919] to-orange-600 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-slate-600 font-medium">Total Refunds</p>
            <p className="text-2xl font-bold text-[#E67919] mt-1">PKR {stats.totalRefunds.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-slate-600 font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0f4d8a] to-blue-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-slate-600 font-medium">Unreconciled</p>
            <p className="text-2xl font-bold text-[#0f4d8a] mt-1">{stats.unreconciled}</p>
          </div>
        </div>

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
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Transaction History</h2>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredTransactions.length === 0 ? (
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
                            {txn.type === 'sale' ? '+' : '-'} PKR {txn.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{txn.category}</p>
                        </div>
                        <button
                          onClick={() => setSelectedTransaction(txn)}
                          className="w-10 h-10 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-5 h-5 text-slate-600" />
                        </button>
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
                      {selectedTransaction.type === 'sale' ? '+' : '-'} PKR {selectedTransaction.amount.toLocaleString()}
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
      </div>
    </div>
  );
}