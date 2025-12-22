"use client";

import { useState, useEffect } from "react";
import { Receipt, Lock, CheckCircle, DollarSign, Calendar, MapPin, Plus, Eye, CreditCard, X, Loader2 } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import toast, { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";

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
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [usePayPal, setUsePayPal] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number; packages: number }>>([]);

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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bills", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bills");
      setBills(data.bills || []);
      
      // Load revenue trend data
      if (data.revenueTrend) {
        setRevenueData(data.revenueTrend);
      } else {
        // Generate sample data if not provided
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          months.push({
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: Math.random() * 10000 + 5000,
            packages: Math.floor(Math.random() * 50 + 20),
          });
        }
        setRevenueData(months);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBills();
  }, []);

  const totalBills = bills.length;
  const totalAmount = bills.reduce((sum, b) => sum + b.dueAmount, 0);
  const totalPaid = bills.reduce((sum, b) => sum + b.paidAmount, 0);
  const totalBalance = bills.reduce((sum, b) => sum + b.balance, 0);

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
                    <p className="mt-1 text-2xl font-bold">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JMD</p>
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
                    <p className="mt-1 text-2xl font-bold">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JMD</p>
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
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20">
            <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <button onClick={loadBills} className="mt-4 px-4 py-2 rounded-lg bg-[#0f4d8a] text-white">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bills.map((bill) => (
              <div key={bill.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">#{bill.trackingNumber}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{bill.branch}</span>
                    </div>
                  </div>
                  {bill.status === "paid" ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <Lock className="h-6 w-6 text-gray-400" />
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">DUE:</span>
                    <span className="font-semibold text-gray-900">${bill.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JMD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">PAID:</span>
                    <span className="font-semibold text-green-600">${bill.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JMD</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-700">BALANCE:</span>
                    <span className="text-[#0f4d8a]">${bill.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JMD</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedBill(bill);
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#0f4d8a] text-white px-4 py-2 text-sm font-semibold hover:bg-[#0e447d] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    ADD
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBill(bill);
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-[#0f4d8a] text-[#0f4d8a] px-4 py-2 text-sm font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    DETAILS
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPaymentModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                  <p className="text-2xl font-bold text-[#0f4d8a]">${selectedBill.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedBill.currency || "JMD"}</p>
                </div>

                {!usePayPal && (
                  <div className="mb-6 flex items-center justify-center gap-4">
                    <div className="text-3xl">💳</div>
                    <div className="text-3xl">💳</div>
                    <div className="text-2xl font-bold">PowerTranz</div>
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
      </div>
    </div>
    </>
  );
}

