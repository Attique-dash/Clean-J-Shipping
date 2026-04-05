"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { 
  CreditCard, 
  FileText, 
  Package,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Clock,
  ArrowRight,
  Trash2,
  Receipt,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import EnhancedCurrencySelector from "@/components/EnhancedCurrencySelector";
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
  billNumber: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  itemTotal: number;
  shippingFee: number;
  customsFee: number;
  additionalFees?: Array<{label: string, amount: number}>;
  totalAmount: number;
  paidAt?: string;
  paidAmount?: number;
  createdAt: string;
  sentAt?: string;
  packages: BillPackage[];
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

export default function BillsPage() {
  const { data: session } = useSession();
  const { selectedCurrency, setSelectedCurrency, formatCurrency } = useCurrency();
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [cart, setCart] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bills' | 'history'>('bills');
  
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
        // Map payments to payment history format
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
  
  const addToCart = (billNumber: string) => {
    if (!cart.includes(billNumber)) {
      setCart([...cart, billNumber]);
      toast.success('Bill added to cart');
    } else {
      toast.info('Bill already in cart');
    }
  };
  
  const removeFromCart = (billNumber: string) => {
    setCart(cart.filter(b => b !== billNumber));
    toast.success('Bill removed from cart');
  };
  
  const getCartTotal = () => {
    return bills
      .filter(b => cart.includes(b.billNumber))
      .reduce((sum, b) => sum + b.totalAmount, 0);
  };
  
  const getCartBills = () => bills.filter(b => cart.includes(b.billNumber));
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Payment
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Processing
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };
  
  if (loading) return <Loading message="Loading your bills..." />;
  
  const pendingBills = bills.filter(b => b.status === 'sent' || b.status === 'pending');
  const paidBills = bills.filter(b => b.status === 'paid');
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] rounded-2xl shadow-lg p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Payment Center</h1>
              <p className="text-blue-100">Manage your bills and payments</p>
            </div>
            <div className="flex items-center gap-3">
              <EnhancedCurrencySelector 
                selectedCurrency={selectedCurrency}
                onCurrencyChange={setSelectedCurrency}
              />
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Bills</p>
                <p className="text-2xl font-bold text-gray-900">{pendingBills.length}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Due</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(pendingBills.reduce((sum, b) => sum + b.totalAmount, 0), 'USD')}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Paid Bills</p>
                <p className="text-2xl font-bold text-green-600">{paidBills.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bills' 
                  ? 'border-[#0f4d8a] text-[#0f4d8a]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              My Bills
              {cart.length > 0 && (
                <span className="ml-2 bg-[#0f4d8a] text-white text-xs px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history' 
                  ? 'border-[#0f4d8a] text-[#0f4d8a]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Payment History
            </button>
          </div>
        </div>
        
        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bills List */}
            <div className="lg:col-span-2 space-y-4">
              {pendingBills.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Bills</h3>
                  <p className="text-gray-500">You have no pending bills to pay.</p>
                </div>
              ) : (
                pendingBills.map(bill => (
                  <div key={bill._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-5 h-5 text-[#0f4d8a]" />
                          <span className="font-semibold text-gray-900">{bill.billNumber}</span>
                          {getStatusBadge(bill.status)}
                        </div>
                        <p className="text-sm text-gray-500">
                          {bill.packages.length} package(s) • Created {new Date(bill.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(bill.totalAmount, 'USD')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Packages */}
                    <div className="space-y-2 mb-4">
                      {bill.packages.map((pkg, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">{pkg.trackingNumber}</span>
                            <span className="text-sm text-gray-500">({pkg.shipper})</span>
                          </div>
                          <span className="text-sm text-gray-600">{formatCurrency(pkg.total, 'USD')}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <button
                        onClick={() => addToCart(bill.billNumber)}
                        disabled={cart.includes(bill.billNumber)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          cart.includes(bill.billNumber)
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cart.includes(bill.billNumber) ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            In Cart
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            Add to Cart
                          </>
                        )}
                      </button>
                      
                      <Link
                        href={`/customer/pay/${bill.billNumber}`}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0f4d8a] text-white rounded-lg font-medium hover:bg-[#1e6bb8] transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Pay Now
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Cart Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cart.length})
                </h3>
                
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {getCartBills().map(bill => (
                        <div key={bill._id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-sm">{bill.billNumber}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(bill.totalAmount, 'USD')}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(bill.billNumber)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatCurrency(getCartTotal(), 'USD')}</span>
                      </div>
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-[#0f4d8a]">{formatCurrency(getCartTotal(), 'USD')}</span>
                      </div>
                    </div>
                    
                    <Link
                      href={`/customer/checkout?bills=${cart.join(',')}`}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#0f4d8a] text-white rounded-lg font-medium hover:bg-[#1e6bb8] transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Checkout
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Payment History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {paymentHistory.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Payment History</h3>
                <p className="text-gray-500">You have not made any payments yet.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentHistory.map(payment => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{payment.billNumber}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(payment.paidAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 capitalize">{payment.paymentMethod}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/customer/pay/${payment.billNumber}`}
                          className="text-[#0f4d8a] hover:text-[#1e6bb8] font-medium text-sm"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
