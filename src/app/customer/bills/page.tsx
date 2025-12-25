// src/app/customer/bills/page.tsx
"use client";

import { useEffect, useState } from "react";
import { FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock, ExternalLink, CreditCard, RefreshCw, Loader2, TrendingUp, Download, X, ShoppingCart } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "react-toastify";
import Link from "next/link";

type Bill = {
  _id?: string;
  tracking_number: string;
  description?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  currency?: string;
  amount_due: number;
  payment_status: "submitted" | "reviewed" | "rejected" | "none" | "paid" | "overdue";
  document_url?: string;
  last_updated?: string;
};

export default function CustomerBillsPage() {
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("USD");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cart, setCart] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/bills", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bills");
      const list: Bill[] = Array.isArray(data?.bills) ? data.bills : [];
      setItems(list);
      const ccy = list.find((b: Bill) => b.currency)?.currency || "USD";
      setCurrency(ccy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Load cart from localStorage
    const cartData = localStorage.getItem('customer_cart');
    if (cartData) {
      try {
        const trackingNumbers = JSON.parse(cartData);
        setCart(new Set(trackingNumbers));
      } catch (e) {
        console.error("Failed to load cart:", e);
      }
    }
  }, []);

  const totalDue = items.reduce((s, it) => s + (Number(it.amount_due) || 0), 0);
  const pendingBills = items.filter(b => b.payment_status === 'submitted' || b.payment_status === 'none');
  const reviewedBills = items.filter(b => b.payment_status === 'reviewed');
  const rejectedBills = items.filter(b => b.payment_status === 'rejected');
  
  // Cart functionality
  const cartItems = items.filter(bill => cart.has(bill.tracking_number));
  const cartTotal = cartItems.reduce((sum, bill) => sum + (Number(bill.amount_due) || 0), 0);
  
  const toggleCartItem = (trackingNumber: string) => {
    setCart(prev => {
      const newCart = new Set(prev);
      if (newCart.has(trackingNumber)) {
        newCart.delete(trackingNumber);
      } else {
        newCart.add(trackingNumber);
      }
      // Save to localStorage
      localStorage.setItem('customer_cart', JSON.stringify(Array.from(newCart)));
      return newCart;
    });
  };
  
  const addAllToCart = () => {
    const payableBills = items.filter(b => 
      b.payment_status !== 'paid' && b.amount_due > 0
    );
    const trackingNumbers = payableBills.map(b => b.tracking_number);
    setCart(new Set(trackingNumbers));
    localStorage.setItem('customer_cart', JSON.stringify(trackingNumbers));
    toast.success(`${payableBills.length} items added to cart`);
  };
  
  const clearCart = () => {
    setCart(new Set());
    localStorage.removeItem('customer_cart');
    toast.info("Cart cleared");
  };

  const handlePayNow = (bill: Bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  async function handlePayPalCreateOrder() {
    if (!selectedBill) return "";
    
    try {
      const res = await fetch("/api/customer/payments/create-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedBill.amount_due,
          currency: selectedBill.currency || "JMD",
          description: `Payment for invoice ${selectedBill.invoice_number || selectedBill.tracking_number}`,
          trackingNumber: selectedBill.tracking_number,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create PayPal order");
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
      const captureRes = await fetch("/api/customer/payments/capture-paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID }),
      });

      const captureData = await captureRes.json();
      if (!captureRes.ok) {
        throw new Error(captureData?.error || "Failed to capture PayPal payment");
      }

      // Process payment
      const res = await fetch("/api/customer/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: selectedBill.tracking_number,
          amount: selectedBill.amount_due,
          currency: selectedBill.currency || "JMD",
          paymentMethod: "paypal",
          paypalOrderId: data.orderID,
        }),
      });

      const paymentData = await res.json();
      if (!res.ok) {
        throw new Error(paymentData?.error || "Failed to process payment");
      }

      setShowPaymentModal(false);
      setSelectedBill(null);
      await load();
      toast.success("Payment processed successfully! A confirmation email has been sent.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  function getStatusInfo(status: Bill["payment_status"]) {
    switch (status) {
      case "paid":
        return {
          label: "Paid",
          icon: CheckCircle,
          bgColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
          iconColor: "text-emerald-600",
        };
      case "reviewed":
        return {
          label: "Reviewed",
          icon: CheckCircle,
          bgColor: "bg-green-100 text-green-800 border-green-200",
          iconColor: "text-green-600",
        };
      case "submitted":
        return {
          label: "Submitted",
          icon: Clock,
          bgColor: "bg-blue-100 text-blue-800 border-blue-200",
          iconColor: "text-blue-600",
        };
      case "rejected":
        return {
          label: "Rejected",
          icon: XCircle,
          bgColor: "bg-red-100 text-red-800 border-red-200",
          iconColor: "text-red-600",
        };
      default:
        return {
          label: "Pending",
          icon: Clock,
          bgColor: "bg-orange-100 text-orange-800 border-orange-200",
          iconColor: "text-orange-600",
        };
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Animated Background Pattern */}
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header Section */}
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-widest text-blue-100">Customer Portal</p>
                    <h1 className="text-3xl font-bold leading-tight md:text-4xl">Bills & Payments</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Manage your invoices and payments
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                        Data Loaded
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {cart.size > 0 && (
                    <Link
                      href="/customer/checkout"
                      className="relative flex items-center space-x-2 px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span>Checkout ({cart.size})</span>
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {cart.size}
                      </span>
                    </Link>
                  )}
                  <button
                    onClick={() => load()}
                    className="flex items-center space-x-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                  >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Stats Cards Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Overview Statistics
              </h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Due */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#E67919] to-[#f59e42] shadow-lg">
                      <DollarSign className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Balance Due</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">
                      {totalDue.toLocaleString(undefined, { style: 'currency', currency })}
                    </p>
                  </div>
                </div>

                {/* Pending Bills */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0891b2] to-[#06b6d4] shadow-lg">
                      <Clock className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Pending Bills</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{pendingBills.length}</p>
                  </div>
                </div>

                {/* Reviewed Bills */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                      <CheckCircle className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Reviewed Bills</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{reviewedBills.length}</p>
                  </div>
                </div>

                {/* Rejected Bills */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                      <XCircle className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Rejected Bills</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{rejectedBills.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Cart Summary Bar */}
          {cart.size > 0 && (
            <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] rounded-2xl shadow-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6" />
                  <div>
                    <p className="font-semibold">{cart.size} item{cart.size !== 1 ? 's' : ''} in cart</p>
                    <p className="text-sm text-orange-100">
                      Total: {cartTotal.toLocaleString(undefined, { style: 'currency', currency })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearCart}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Cart
                  </button>
                  <Link
                    href="/customer/checkout"
                    className="px-6 py-2 bg-white text-[#E67919] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Bills Grid Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice List
              </h2>
            </div>
            <div className="p-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.length === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No bills found</h3>
                    <p className="text-sm text-gray-500">Your bills and invoices will appear here</p>
                  </div>
                ) : (
                  items.map((bill) => {
                    const statusInfo = getStatusInfo(bill.payment_status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <div
                        key={`${bill.tracking_number}-${bill.invoice_number || 'doc'}`}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                      >
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              {/* Checkbox for cart */}
                              {bill.payment_status !== 'paid' && bill.amount_due > 0 && (
                                <input
                                  type="checkbox"
                                  checked={cart.has(bill.tracking_number)}
                                  onChange={() => toggleCartItem(bill.tracking_number)}
                                  className="h-5 w-5 rounded border-gray-300 text-[#E67919] focus:ring-[#E67919] cursor-pointer"
                                />
                              )}
                              <div className="p-2 bg-white/20 rounded-lg">
                                <FileText className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-white">
                                  Invoice #{bill.invoice_number || 'N/A'}
                                </p>
                                <p className="text-xs text-blue-100">
                                  {bill.invoice_date 
                                    ? new Date(bill.invoice_date).toLocaleDateString()
                                    : 'Date not set'}
                                </p>
                              </div>
                            </div>
                            <div className={`p-2 rounded-lg ${statusInfo.bgColor.split(' ')[0]}`}>
                              <StatusIcon className={`h-5 w-5 ${statusInfo.iconColor}`} />
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-6 space-y-4">
                          {/* Amount */}
                          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Amount Due</span>
                            <span className="text-2xl font-bold text-[#E67919]">
                              {(bill.amount_due || 0).toLocaleString(undefined, { 
                                style: 'currency', 
                                currency: bill.currency || currency 
                              })}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Status</span>
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${statusInfo.bgColor}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          {/* Tracking */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Tracking</span>
                            <span className="text-sm font-mono text-gray-900">{bill.tracking_number}</span>
                          </div>

                          {/* Description */}
                          {bill.description && (
                            <div className="pt-2">
                              <span className="text-xs font-medium text-gray-500 block mb-1">Description</span>
                              <p className="text-sm text-gray-700">{bill.description}</p>
                            </div>
                          )}

                          {/* Due Date */}
                          {bill.due_date && (
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-sm font-medium text-gray-600 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Due Date
                              </span>
                              <span className={`text-sm font-semibold ${
                                new Date(bill.due_date) < new Date() 
                                  ? 'text-red-600' 
                                  : new Date(bill.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                  ? 'text-orange-600'
                                  : 'text-gray-900'
                              }`}>
                                {new Date(bill.due_date).toLocaleDateString()}
                                {new Date(bill.due_date) < new Date() && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Last Updated */}
                          {bill.last_updated && (
                            <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                              <Clock className="h-3 w-3 mr-1" />
                              Updated: {new Date(bill.last_updated).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-t border-gray-100">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between space-x-2">
                              {bill.document_url ? (
                                <>
                                  <a
                                    href={bill.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border-2 border-[#0891b2] text-[#0891b2] rounded-lg hover:bg-cyan-50 transition-all text-sm font-medium"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View
                                  </a>
                                  <a
                                    href={bill.document_url}
                                    download
                                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 transition-all text-sm font-medium"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    PDF
                                  </a>
                                </>
                              ) : (
                                <div className="flex-1 inline-flex items-center justify-center px-4 py-2 border-2 border-gray-300 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  No Document
                                </div>
                              )}
                            </div>
                            {bill.payment_status !== 'paid' && bill.amount_due > 0 && (
                              <button
                                onClick={() => handlePayNow(bill)}
                                className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                              >
                                <CreditCard className="h-5 w-5 mr-2" />
                                Pay Now
                              </button>
                            )}
                            {bill.payment_status === 'paid' && (
                              <div className="w-full inline-flex items-center justify-center px-4 py-3 bg-emerald-100 text-emerald-700 rounded-lg font-semibold">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Paid
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Make Payment CTA */}
          {items.length > 0 && (
            <div className="bg-gradient-to-r from-[#0f4d8a] via-[#1e6bb8] to-[#E67919] rounded-2xl p-8 text-white shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="mb-6 md:mb-0">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">Ready to pay your bills?</h3>
                  </div>
                  <p className="text-blue-100 mb-4">
                    Pay multiple bills at once and save time with our streamlined checkout process.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={addAllToCart}
                      className="px-6 py-3 bg-white text-[#0f4d8a] rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200"
                    >
                      Add All to Cart
                    </button>
                    <Link
                      href="/customer/checkout"
                      className="px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-lg font-semibold hover:bg-white/30 transition-all duration-200"
                    >
                      View Cart
                    </Link>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <ShoppingCart className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Complete Payment</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Invoice Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice #:</span>
                    <span className="font-medium">{selectedBill.invoice_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracking #:</span>
                    <span className="font-medium">{selectedBill.tracking_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-lg text-[#E67919]">
                      {(selectedBill.amount_due || 0).toLocaleString(undefined, { 
                        style: 'currency', 
                        currency: selectedBill.currency || currency 
                      })}
                    </span>
                  </div>
                </div>
              </div>
              
              <PayPalScriptProvider
                options={{
                  "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                  currency: selectedBill.currency || "JMD",
                }}
              >
                <PayPalButtons
                  style={{
                    layout: "vertical",
                    color: "gold",
                    shape: "rectangular",
                    label: "paypal",
                  }}
                  disabled={processing}
                  forceReRender={[selectedBill, processing]}
                  createOrder={handlePayPalCreateOrder}
                  onApprove={handlePayPalApprove}
                />
              </PayPalScriptProvider>
              
              {processing && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 text-[#0f4d8a] animate-spin mr-2" />
                  <span className="text-gray-600">Processing payment...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}