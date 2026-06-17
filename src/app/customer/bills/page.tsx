"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { 
  CreditCard, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Clock,
  Lock,
  LockOpen,
  ShoppingCart,
  Filter,
  X,
  Calendar,
  DollarSign,
  Package,
  User,
  MapPin,
  Receipt,
  Printer,
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import Loading from "@/components/Loading";
import Link from "next/link";

interface BillPackage {
  packageId: string;
  trackingNumber: string;
  shipper: string;
  weight: number;
  itemValue: number;
  shippingFee: number;
  customsFee: number;
  total: number;
  itemDescription?: string;
}

interface Bill {
  _id: string;
  billNumber?: string;
  tracking_number: string;
  description?: string;
  invoice_number?: string;
  invoice_date?: string;
  currency?: string;
  amount_due: number;
  payment_status: 'submitted' | 'reviewed' | 'rejected' | 'none' | 'paid' | 'overdue' | 'partially_paid';
  due_payment?: number;
  paid_payment?: number;
  balance?: number;
  last_updated?: string;
  payment_id?: string;
  payment_method?: string;
  // Additional fields from admin bills
  status?: string;
  itemTotal?: number;
  shippingFee?: number;
  customsFee?: number;
  totalAmount?: number;
  packages?: BillPackage[];
  paidAt?: string;
  paidAmount?: number;
  createdAt?: string;
  adminNotes?: string;
}

interface PaymentHistory {
  _id: string;
  billNumber: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
  paymentMethod: string;
  transactionId?: string;
}

const PAGE_SIZE = 12;

export default function BillsPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [cart, setCart] = useState<Bill[]>([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Fetch all bills
  useEffect(() => {
    if (session?.user?.id) {
      fetchBills();
      fetchPaymentHistory();
    }
  }, [session]);
  
  const fetchBills = async () => {
    try {
      const res = await fetch('/api/customer/bills', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setBills(data.bills || []);
      } else {
        toast.error(data.error || 'Failed to load bills');
      }
    } catch (error) {
      toast.error('Error loading bills');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPaymentHistory = async () => {
    try {
      const res = await fetch('/api/customer/payments', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const history = (data.payments || []).map((payment: any) => ({
          _id: payment._id,
          billNumber: payment.reference || payment.trackingNumber || 'Unknown',
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paidAt: payment.createdAt || payment.paidAt,
          paymentMethod: payment.method || payment.paymentMethod || 'card',
          transactionId: payment.gatewayId || payment.transactionId
        }));
        setPaymentHistory(history);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRelativeDate = (dateString: string): string => {
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  };

  const isPaid = (bill: Bill) => {
    return bill.payment_status === 'paid' || bill.status === 'paid';
  };

  const addToCart = (bill: Bill) => {
    if (!cart.find(b => b._id === bill._id)) {
      setCart([...cart, bill]);
      toast.success('Added to cart');
    } else {
      toast.info('Already in cart');
    }
  };

  const removeFromCart = (billId: string) => {
    setCart(cart.filter(b => b._id !== billId));
  };

  const openDetailModal = (bill: Bill) => {
    setSelectedBill(bill);
    setDetailModalOpen(true);
  };

  // Filter bills
  const filteredBills = bills.filter(bill => {
    if (statusFilter && bill.payment_status !== statusFilter) return false;
    return true;
  });

  const pendingBills = filteredBills.filter(b => !isPaid(b));
  const paidBills = filteredBills.filter(b => isPaid(b));
  const displayBills = showHistory ? paidBills : pendingBills;

  const totalPages = Math.max(1, Math.ceil(displayBills.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedBills = displayBills.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalAmount = displayBills.reduce((sum, bill) => sum + (bill.amount_due || 0), 0);

  if (loading) return <Loading message="Loading your bills..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {displayBills.length} Bills {formatCurrency(totalAmount, 'USD')}
            </h1>
            <p className="text-gray-500 mt-1">Manage your bills and payments</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <button
              onClick={() => setFilterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 shadow-sm text-sm font-medium"
            >
              <ShoppingCart className="h-4 w-4" />
              CART ({cart.length})
            </button>
            {/* Filter Button */}
            <button
              onClick={() => setFilterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 shadow-sm text-sm font-medium"
            >
              <Filter className="h-4 w-4" />
              FILTER
            </button>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => { setShowHistory(false); setPage(1); }}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              !showHistory 
                ? 'bg-[#0f4d8a] text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Pending ({pendingBills.length})
          </button>
          <button
            onClick={() => { setShowHistory(true); setPage(1); }}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              showHistory 
                ? 'bg-[#0f4d8a] text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Paid ({paidBills.length})
          </button>
        </div>

        {/* Bills Cards Grid */}
        {paginatedBills.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No bills found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedBills.map((bill) => {
              const billNumber = bill.billNumber || bill.invoice_number || bill.tracking_number;
              const dueAmount = bill.due_payment || bill.amount_due || 0;
              const paidAmount = bill.paid_payment || (isPaid(bill) ? dueAmount : 0);
              const balance = bill.balance || (isPaid(bill) ? 0 : dueAmount);
              const billDate = bill.invoice_date || bill.last_updated || bill.createdAt;

              return (
                <div
                  key={bill._id || billNumber}
                  className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="p-5">
                    {/* Header with bill number and lock icon */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-[#0f4d8a]">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-base text-gray-900">
                          #{billNumber}
                        </span>
                      </div>
                      {/* Lock Icon */}
                      {isPaid(bill) ? (
                        <div className="relative">
                          <Lock className="h-6 w-6 text-green-600" />
                          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            PAID
                          </span>
                        </div>
                      ) : (
                        <LockOpen className="h-6 w-6 text-orange-500" />
                      )}
                    </div>

                    {/* Date and relative time */}
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <span className="text-gray-600 font-medium">
                        {formatDate(billDate)}
                      </span>
                      <span className="text-gray-400 text-xs">
                        ({billDate ? getRelativeDate(billDate) : 'N/A'})
                      </span>
                    </div>

                    {/* Amounts */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">DUE:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(dueAmount, bill.currency || 'USD')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">PAID:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(paidAmount, bill.currency || 'USD')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">BALANCE:</span>
                        <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(balance, bill.currency || 'USD')}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openDetailModal(bill)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#1e6bb8] transition-colors text-sm font-medium"
                      >
                        <FileText className="h-4 w-4" />
                        DETAILS
                      </button>
                      {!isPaid(bill) && (
                        <button
                          onClick={() => addToCart(bill)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === pageNum
                    ? 'bg-[#0f4d8a] text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Detail Modal */}
        {detailModalOpen && selectedBill && (
          <BillDetailModal
            bill={selectedBill}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedBill(null);
            }}
          />
        )}

        {/* Filter Modal */}
        {filterModalOpen && (
          <FilterModal
            onClose={() => setFilterModalOpen(false)}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            cart={cart}
            removeFromCart={removeFromCart}
          />
        )}
      </div>
    </div>
  );
}

// Bill Detail Modal Component
function BillDetailModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { formatCurrency } = useCurrency();
  
  const billNumber = bill.billNumber || bill.invoice_number || bill.tracking_number;
  const dueAmount = bill.due_payment || bill.amount_due || 0;
  const paidAmount = bill.paid_payment || (bill.payment_status === 'paid' ? dueAmount : 0);
  const balance = bill.balance || (bill.payment_status === 'paid' ? 0 : dueAmount);
  const billDate = bill.invoice_date || bill.last_updated || bill.createdAt;
  const isPaid = bill.payment_status === 'paid' || bill.status === 'paid';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-6 py-4 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {billNumber} / {formatCurrency(dueAmount, bill.currency || 'USD')}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Bill Details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top row: identity + status + totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Identity card */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">{billNumber}</span>
                <Receipt className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Package className="h-4 w-4 text-gray-400" />
                <span>{bill.description || 'Package Bill'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{billDate ? new Date(billDate).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            {/* Status card */}
            <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center">
              {isPaid ? (
                <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg w-full justify-center">
                  <Lock className="h-5 w-5" />
                  <span className="font-semibold">PAID</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-orange-400 text-white px-4 py-3 rounded-lg w-full justify-center">
                  <LockOpen className="h-5 w-5" />
                  <span className="font-semibold">UNPAID</span>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sub-Total:</span>
                <span className="font-medium">{formatCurrency(dueAmount, bill.currency || 'USD')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Discount:</span>
                <span className="text-green-600 font-medium">$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(dueAmount, bill.currency || 'USD')}</span>
              </div>
            </div>
          </div>

          {/* Three-column info section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bill Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                Bill Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Bill #:</span>
                  <span className="font-medium">{billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">{billDate ? new Date(billDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Description:</span>
                  <span className="font-medium">{bill.description || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Currency:</span>
                  <span className="font-medium">{bill.currency || 'USD'}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                Payment Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Amount:</span>
                  <span className="font-medium">{formatCurrency(dueAmount, bill.currency || 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid Amount:</span>
                  <span className="font-medium">{formatCurrency(paidAmount, bill.currency || 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Balance:</span>
                  <span className={`font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(balance, bill.currency || 'USD')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium capitalize ${
                    bill.payment_status === 'paid' ? 'text-green-600' :
                    bill.payment_status === 'overdue' ? 'text-red-600' :
                    'text-orange-600'
                  }`}>
                    {bill.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Tracking Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                Tracking Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tracking #:</span>
                  <span className="font-medium font-mono text-xs">{bill.tracking_number}</span>
                </div>
                {bill.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Method:</span>
                    <span className="font-medium capitalize">{bill.payment_method}</span>
                  </div>
                )}
                {bill.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid At:</span>
                    <span className="font-medium">{new Date(bill.paidAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Package Details (if available) */}
          {bill.packages && bill.packages.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                Package Details
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Tracking #</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Shipper</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Weight</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Value</th>
                      <th className="px-3 py-2 text-right text-gray-600 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.packages.map((pkg, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium">{pkg.trackingNumber}</td>
                        <td className="px-3 py-2">{pkg.shipper}</td>
                        <td className="px-3 py-2">{pkg.weight} lbs</td>
                        <td className="px-3 py-2">${pkg.itemValue?.toFixed(2) || '0.00'}</td>
                        <td className="px-3 py-2 text-right font-medium">${pkg.total?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Email Invoice
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter Modal Component
function FilterModal({
  onClose,
  statusFilter,
  setStatusFilter,
  cart,
  removeFromCart
}: {
  onClose: () => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  cart: Bill[];
  removeFromCart: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Filter & Cart</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Filter */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Filter by Status</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value=""
                  checked={statusFilter === ""}
                  onChange={() => setStatusFilter("")}
                  className="w-4 h-4 text-[#0f4d8a]"
                />
                <span className="text-sm text-gray-700">All Bills</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="submitted"
                  checked={statusFilter === "submitted"}
                  onChange={() => setStatusFilter("submitted")}
                  className="w-4 h-4 text-[#0f4d8a]"
                />
                <span className="text-sm text-gray-700">Pending</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="paid"
                  checked={statusFilter === "paid"}
                  onChange={() => setStatusFilter("paid")}
                  className="w-4 h-4 text-[#0f4d8a]"
                />
                <span className="text-sm text-gray-700">Paid</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="overdue"
                  checked={statusFilter === "overdue"}
                  onChange={() => setStatusFilter("overdue")}
                  className="w-4 h-4 text-[#0f4d8a]"
                />
                <span className="text-sm text-gray-700">Overdue</span>
              </label>
            </div>
          </div>

          {/* Cart */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Cart ({cart.length})</h3>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-500">No items in cart</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        #{item.billNumber || item.invoice_number || item.tracking_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.currency || 'USD'} {item.amount_due?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#1e6bb8] font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
