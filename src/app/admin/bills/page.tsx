"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Receipt, Lock, CheckCircle, DollarSign, Calendar, MapPin, Plus, Eye, CreditCard, X, Loader2, Clock, Trash2 } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import toast, { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";
import { useCurrency } from "@/contexts/CurrencyContext";
import EnhancedCurrencySelector from "@/components/EnhancedCurrencySelector";
import Loading from "@/components/Loading";

const RevenueChart = dynamic(
  () => import('@/components/charts/RevenueChart').then(mod => mod.RevenueChart),
  { ssr: false }
);

type Bill = {
  id: string;
  billNumber: string;
  trackingNumber: string;
  date: string;
  branch: string;
  dueAmount: number;
  paidAmount: number;
  balance: number;
  currency: string;
  status: "unpaid" | "paid" | "partial";
  source?: string;
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [usePayPal, setUsePayPal] = useState(false);
  const [_paypalOrderId, setPaypalOrderId] = useState<string | null>(null); // Used for PayPal order tracking and validation
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number; packages: number }>>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; bill: Bill | null }>({ open: false, bill: null });
  const { selectedCurrency, setSelectedCurrency, convertAmount, formatCurrency } = useCurrency();
  const loadingRef = useRef(false); // Prevent multiple simultaneous requests

  // Helper function to convert and format amounts
  const convertAndFormatAmount = async (amount: number, fromCurrency: string) => {
    if (fromCurrency === selectedCurrency) {
      return formatCurrency(amount, selectedCurrency);
    }
    try {
      const convertedAmount = await convertAmount(amount, fromCurrency || "USD");
      return formatCurrency(convertedAmount, selectedCurrency);
    } catch (_error) {
      return formatCurrency(amount, selectedCurrency);
    }
  };

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    firstName: "",
    lastName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    email: "",
    phone: "",
  });

  async function loadBills() {
    if (loadingRef.current) return; // Prevent multiple simultaneous requests
    loadingRef.current = true;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bills", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bills");
      setBills(data.bills || []);
      
      // Load real revenue trend data from database
      if (data.revenueTrend && Array.isArray(data.revenueTrend)) {
        setRevenueData(data.revenueTrend);
      } else {
        // Generate revenue data from actual bills if no trend data provided
        const monthlyRevenue = new Map<string, { revenue: number; packages: number }>();
        
        // Process bills to calculate monthly revenue
        data.bills?.forEach((bill: Bill) => {
          const date = new Date(bill.date);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          if (!monthlyRevenue.has(monthKey)) {
            monthlyRevenue.set(monthKey, { revenue: 0, packages: 0 });
          }
          
          const current = monthlyRevenue.get(monthKey)!;
          current.revenue += bill.paidAmount || 0;
          current.packages += 1;
        });
        
        // Convert to array and sort by date
        const sortedRevenue = Array.from(monthlyRevenue.entries())
          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
          .slice(-6) // Last 6 months
          .map(([month, data]) => ({
            month,
            revenue: data.revenue,
            packages: data.packages
          }));
        
        setRevenueData(sortedRevenue.length > 0 ? sortedRevenue : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bills");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  useEffect(() => {
    loadBills();
  }, []);

  const totalBills = bills.length;
  const totalAmount = useMemo(() => bills.reduce((sum, b) => sum + b.dueAmount, 0), [bills]);
  const totalBalance = useMemo(() => bills.reduce((sum, b) => sum + b.balance, 0), [bills]);

  // Convert totals to selected currency
  const [displayTotalAmount, setDisplayTotalAmount] = useState<string>("");
  const [displayTotalBalance, setDisplayTotalBalance] = useState<string>("");

  const updateDisplayAmounts = useCallback(async () => {
    if (loadingRef.current) return; // Prevent multiple simultaneous conversions
    loadingRef.current = true;
    
    try {
      const convertedTotal = await convertAndFormatAmount(totalAmount, "JMD");
      const convertedBalance = await convertAndFormatAmount(totalBalance, "JMD");
      setDisplayTotalAmount(convertedTotal);
      setDisplayTotalBalance(convertedBalance);
    } catch (error) {
      console.error('Currency conversion error:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [totalAmount, totalBalance, convertAndFormatAmount]);

  useEffect(() => {
    updateDisplayAmounts();
  }, [updateDisplayAmounts]);

  // State for converted bill amounts
  const [convertedBills, setConvertedBills] = useState<Array<{id: string, dueAmount: string, paidAmount: string, balance: string}>>([]);

  const updateBillAmounts = useCallback(async () => {
    if (loadingRef.current || bills.length === 0) return; // Prevent multiple simultaneous conversions
    loadingRef.current = true;
    
    try {
      const converted = await Promise.all(
        bills.map(async (bill) => {
          const convertedDue = await convertAndFormatAmount(bill.dueAmount, bill.currency || "JMD");
          const convertedPaid = await convertAndFormatAmount(bill.paidAmount, bill.currency || "JMD");
          const convertedBalance = await convertAndFormatAmount(bill.balance, bill.currency || "JMD");
          return {
            id: bill.id,
            dueAmount: convertedDue,
            paidAmount: convertedPaid,
            balance: convertedBalance,
          };
        })
      );
      setConvertedBills(converted);
    } catch (error) {
      console.error('Bill currency conversion error:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [bills, convertAndFormatAmount]);

  useEffect(() => {
    updateBillAmounts();
  }, [updateBillAmounts]);

  async function handleDeleteBill(billId: string) {
    if (!confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
      return;
    }
    
    try {
      setProcessing(true);
      
      // Extract actual ObjectId from prefixed billId
      let actualBillId = billId;
      let billType = 'invoice';
      
      if (billId.startsWith('invoice-')) {
        actualBillId = billId.replace('invoice-', '');
        billType = 'invoice';
      } else if (billId.startsWith('generated-invoice-')) {
        actualBillId = billId.replace('generated-invoice-', '');
        billType = 'generated';
      } else if (billId.startsWith('pos-')) {
        actualBillId = billId.replace('pos-', '');
        billType = 'pos';
      }

      const res = await fetch(`/api/admin/bills?id=${actualBillId}&type=${billType}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete bill');
      }
      
      setDeleteConfirm({ open: false, bill: null });
      await loadBills();
      toast.success("Bill deleted successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete bill');
    } finally {
      setProcessing(false);
    }
  }

  function openDeleteConfirm(bill: Bill) {
    setDeleteConfirm({ open: true, bill });
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    if (usePayPal) {
      // PayPal payment will be handled by PayPalButtons
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/bills/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: selectedBill.balance,
          paymentMethod: "card",
          cardDetails: paymentForm,
          usePayPal: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Payment failed");

      setShowPaymentModal(false);
      setSelectedBill(null);
      setUsePayPal(false);
      setPaymentForm({
        firstName: "",
        lastName: "",
        cardNumber: "",
        expiry: "",
        cvv: "",
        email: "",
        phone: "",
      });
      await loadBills();
      toast.success("Payment processed successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  async function handlePayPalCreateOrder() {
    if (!selectedBill) throw new Error("No bill selected");

    try {
      const res = await fetch("/api/admin/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedBill.balance,
          currency: selectedBill.currency || "USD",
          description: `Payment for bill ${selectedBill.billNumber}`,
          customerCode: selectedBill.trackingNumber,
          receiptNo: selectedBill.billNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create PayPal order");
      }

      setPaypalOrderId(data.orderId);
      return data.orderId;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PayPal order creation failed");
      throw error;
    }
  }

  async function handleTestPayment() {
    if (!selectedBill) return;

    try {
      setProcessing(true);
      
      // Simulate a test PayPal payment
      const testOrderId = `TEST_${Date.now()}`;
      
      // Process the test payment as if it was successful
      const paymentRes = await fetch("/api/admin/bills/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: selectedBill.balance,
          paymentMethod: "paypal",
          usePayPal: false, // Don't create actual PayPal order for test
          paypalOrderId: testOrderId,
          isTestPayment: true,
        }),
      });

      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) {
        throw new Error(paymentData?.error || "Failed to process test payment");
      }

      setShowPaymentModal(false);
      setSelectedBill(null);
      setUsePayPal(false);
      setPaypalOrderId(null);
      await loadBills();
      toast.success("Test payment completed successfully! Transaction stored in PayPal history.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test payment failed");
    } finally {
      setProcessing(false);
    }
  }

  async function handlePayPalApprove(data: { orderID: string }) {
    if (!selectedBill) return;

    try {
      setProcessing(true);

      // Capture the PayPal order
      const captureRes = await fetch("/api/admin/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID }),
      });

      const captureData = await captureRes.json();
      if (!captureRes.ok) {
        throw new Error(captureData?.error || "Failed to capture PayPal payment");
      }

      // Process bill payment
      const res = await fetch("/api/admin/bills/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: selectedBill.balance,
          paymentMethod: "paypal",
          usePayPal: true,
          paypalOrderId: data.orderID,
        }),
      });

      const paymentData = await res.json();
      if (!res.ok) {
        throw new Error(paymentData?.error || "Failed to process payment");
      }

      setShowPaymentModal(false);
      setSelectedBill(null);
      setUsePayPal(false);
      setPaypalOrderId(null);
      await loadBills();
      toast.success("PayPal payment processed successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                  Billing Dashboard
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  Manage bills and payments
                </p>
              </div>
              <div className="flex items-center gap-3">
                <EnhancedCurrencySelector
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={setSelectedCurrency}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="group relative overflow-hidden rounded-xl bg-white/10 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Total Bills</p>
                    <p className="mt-1 text-2xl font-bold">{totalBills}</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl bg-green-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-100">Total Amount</p>
                    <p className="mt-1 text-2xl font-bold">{displayTotalAmount}</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl bg-orange-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-100">Total Balance</p>
                    <p className="mt-1 text-2xl font-bold">{displayTotalBalance}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Revenue Trend Chart */}
        {revenueData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Revenue Trends</h3>
                  <p className="mt-1 text-sm text-gray-600">Monthly revenue performance</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="h-80">
                <RevenueChart data={revenueData} />
              </div>
            </div>
          </div>
        )}

        {/* Bills Grid */}
        {loading ? (
            <Loading message="Loading bills..." />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <button onClick={loadBills} className="mt-4 px-4 py-2 rounded-lg bg-[#0f4d8a] text-white">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bills.map((bill) => (
              <div key={bill.id} className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[320px] flex flex-col">
                {/* Gradient Header */}
                <div className={`h-3 bg-gradient-to-r ${
                  bill.status === "paid" 
                    ? "from-green-400 to-green-600" 
                    : bill.status === "partial"
                    ? "from-yellow-400 to-yellow-600"
                    : "from-red-400 to-red-600"
                }`} />
                
                <div className="p-6 flex-1 flex flex-col">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      bill.status === "paid" 
                        ? "bg-green-100 text-green-700" 
                        : bill.status === "partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {bill.status === "paid" ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          PAID
                        </>
                      ) : bill.status === "partial" ? (
                        <>
                          <Clock className="h-3 w-3" />
                          PARTIAL
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          UNPAID
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {bill.source}
                    </div>
                  </div>

                  {/* Bill Info */}
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#0f4d8a] transition-colors">
                        #{bill.trackingNumber}
                      </h3>
                      <p className="text-sm font-medium text-gray-600 mt-1">
                        {bill.billNumber}
                      </p>
                    </div>

                    {/* Date and Branch */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{bill.branch}</span>
                      </div>
                    </div>

                    {/* Amount Display */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-3 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Due</span>
                        <span className="text-sm font-bold text-gray-900">
                          {convertedBills.find(cb => cb.id === bill.id)?.dueAmount || `$${bill.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${bill.currency}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Paid</span>
                        <span className={`text-sm font-bold ${bill.paidAmount > 0 ? "text-green-600" : "text-gray-400"}`}>
                          {convertedBills.find(cb => cb.id === bill.id)?.paidAmount || `$${bill.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${bill.currency}`}
                        </span>
                      </div>
                      <div className="border-t border-gray-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 font-bold uppercase tracking-wide">Balance</span>
                          <span className={`text-xl font-bold ${bill.balance > 0 ? "text-[#0f4d8a]" : "text-green-600"}`}>
                            {convertedBills.find(cb => cb.id === bill.id)?.balance || `$${bill.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${bill.currency}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setSelectedBill(bill);
                        setShowPaymentModal(true);
                      }}
                      disabled={bill.balance === 0}
                      className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        bill.balance === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-[#0f4d8a] to-[#0e447d] text-white hover:from-[#0e447d] hover:to-[#0d3d70] hover:shadow-lg active:scale-95"
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      PAY
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBill(bill);
                        setShowDetailsModal(true);
                      }}
                      className="flex items-center justify-center gap-1 rounded-lg border border-[#0f4d8a] text-[#0f4d8a] px-3 py-2 text-xs font-semibold hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95"
                    >
                      <Eye className="h-3 w-3" />
                      VIEW
                    </button>
                    {bill.status === "paid" && (
                      <button
                        onClick={() => openDeleteConfirm(bill)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-red-500 text-red-500 px-3 py-2 text-xs font-semibold hover:bg-red-50 hover:border-red-600 hover:text-red-600 transition-all active:scale-95"
                      >
                        <Trash2 className="h-3 w-3" />
                        DELETE
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPaymentModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">{usePayPal ? "Pay with PayPal" : "Pay With Credit/Debit Card"}</h3>
                <button onClick={() => {
                  setShowPaymentModal(false);
                  setUsePayPal(false);
                }} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Due</p>
                  <p className="text-2xl font-bold text-[#0f4d8a]">
                    {convertedBills.find(cb => cb.id === selectedBill.id)?.balance || `$${selectedBill.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedBill.currency || "JMD"}`}
                  </p>
                </div>

                {!usePayPal && (
                  <div className="mb-6 flex items-center justify-center gap-4">
                    <div className="text-3xl">💳</div>
                    <div className="text-2xl font-bold">Testing</div>
                  </div>
                )}

                {/* Payment Method Toggle */}
                <div className="mb-6 flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUsePayPal(false)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      !usePayPal
                        ? "bg-white text-[#0f4d8a] shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    💳 Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePayPal(true)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      usePayPal
                        ? "bg-white text-[#0f4d8a] shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    🅿️ PayPal
                  </button>
                </div>

                {usePayPal ? (
                  <div className="space-y-4">
                    <PayPalScriptProvider
                      options={{
                        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                        currency: selectedBill.currency || "USD",
                        intent: "capture",
                      }}
                    >
                      <PayPalButtons
                        createOrder={handlePayPalCreateOrder}
                        onApprove={handlePayPalApprove}
                        onError={(err) => {
                          console.error("PayPal error:", err);
                          toast.error("PayPal payment failed. Please try again.");
                        }}
                        onCancel={() => {
                          toast.error("PayPal payment cancelled");
                        }}
                        style={{
                          layout: "vertical",
                          color: "blue",
                          shape: "rect",
                          label: "paypal",
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>
                ) : (
                  <form onSubmit={handlePayment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={paymentForm.firstName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, firstName: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        value={paymentForm.lastName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, lastName: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={paymentForm.cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                        setPaymentForm({ ...paymentForm, cardNumber: formatted });
                      }}
                      placeholder="1234 5678 9012 3456"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={paymentForm.expiry}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formatted = value.length >= 2 ? `${value.slice(0, 2)}/${value.slice(2, 4)}` : value;
                          setPaymentForm({ ...paymentForm, expiry: formatted });
                        }}
                        placeholder="MM/YY"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        value={paymentForm.cvv}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, '') })}
                        placeholder="123"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={paymentForm.email}
                      onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={paymentForm.phone}
                      onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] text-white px-6 py-3 font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        MAKE PAYMENT
                      </>
                    )}
                  </button>
                </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bill Details Modal */}
        {showDetailsModal && selectedBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Bill Details</h3>
                <button onClick={() => setShowDetailsModal(false)} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Bill Number</p>
                    <p className="font-semibold">{selectedBill.billNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tracking Number</p>
                    <p className="font-semibold">#{selectedBill.trackingNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">{new Date(selectedBill.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Branch</p>
                    <p className="font-semibold">{selectedBill.branch}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Amount:</span>
                      <span className="font-semibold">
                        {convertedBills.find(cb => cb.id === selectedBill.id)?.dueAmount || `$${selectedBill.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedBill.currency}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid Amount:</span>
                      <span className="font-semibold text-green-600">
                        {convertedBills.find(cb => cb.id === selectedBill.id)?.paidAmount || `$${selectedBill.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedBill.currency}`}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Balance:</span>
                      <span className={selectedBill.balance > 0 ? "text-[#0f4d8a]" : "text-green-600"}>
                        {convertedBills.find(cb => cb.id === selectedBill.id)?.balance || `$${selectedBill.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedBill.currency}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedBill.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedBill.status === 'partial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedBill.status === 'paid' ? 'Paid' : selectedBill.status === 'partial' ? 'Partially Paid' : 'Unpaid'}
                  </span>
                </div>

                {selectedBill.balance > 0 && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowPaymentModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] text-white px-6 py-3 font-semibold hover:shadow-lg transition-all"
                  >
                    <CreditCard className="h-5 w-5" />
                    Process Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.open && deleteConfirm.bill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setDeleteConfirm({ open: false, bill: null })}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Delete Bill
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium mb-2">
                    Are you sure you want to delete this paid bill?
                  </p>
                  <div className="space-y-1 text-sm text-red-700">
                    <p><strong>Bill Number:</strong> {deleteConfirm.bill.billNumber}</p>
                    <p><strong>Tracking:</strong> #{deleteConfirm.bill.trackingNumber}</p>
                    <p><strong>Amount:</strong> {convertedBills.find(cb => cb.id === deleteConfirm?.bill?.id)?.balance || `$${deleteConfirm?.bill?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${deleteConfirm?.bill?.currency}`}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  This action cannot be undone. The bill will be permanently removed from the system.
                </p>
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setDeleteConfirm({ open: false, bill: null })}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteBill(deleteConfirm.bill!.id)}
                    disabled={processing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Bill
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

