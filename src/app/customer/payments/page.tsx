// src/app/customer/payments/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { CreditCard, DollarSign, FileText, MapPin, CheckCircle, Clock, XCircle, Loader2, ShieldCheck, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCurrency } from "@/contexts/CurrencyContext";

type Payment = {
  _id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  gatewayId?: string;
  reference?: string;
  trackingNumber?: string;
  createdAt?: string;
};

type CustomerBill = {
  amount_due: number;
  currency?: string;
};

export default function CustomerPaymentsPage() {
  return <CustomerPaymentsInner />;
}

function CustomerPaymentsInner() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { selectedCurrency, formatCurrency } = useCurrency();
  
  // Dynamic PayPal configuration based on selected currency
  const paypalOptions = useMemo(() => ({
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    currency: selectedCurrency,
    intent: "capture",
    "funding-allowed": "paypal,card"
  }), [selectedCurrency]);
  
  // Card panel
  const [form, setForm] = useState({ 
    amount: "", 
    currency: selectedCurrency, 
    method: "visa", 
    reference: "", 
    tracking_number: "" 
  });

  // Update form currency when selected currency changes
  useEffect(() => {
    setForm(prev => ({ ...prev, currency: selectedCurrency }));
  }, [selectedCurrency]);
  
  // Billing panel
  const [billing, setBilling] = useState({ 
    fullName: "", 
    address: "", 
    city: "", 
    state: "", 
    zip: "", 
    sameAsShipping: true 
  });
  
  // Bills (to compute due)
  const [bills, setBills] = useState<CustomerBill[]>([]);

  
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/payments", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load payments");
      setItems(Array.isArray(data?.payments) ? data.payments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Load bills to compute outstanding amount
  useEffect(() => {
    fetch("/api/customer/bills", { cache: "no-store" })
      .then(async (r) => {
        const d: { bills?: CustomerBill[]; error?: string } = await r.json();
        if (!r.ok) throw new Error(d?.error || "Failed to load bills");
        const list: CustomerBill[] = Array.isArray(d?.bills) ? d.bills : [];
        setBills(list.map((b) => ({ amount_due: Number(b.amount_due) || 0, currency: b.currency || "JMD" })));
        const total = list.reduce((s: number, b) => s + (Number(b.amount_due) || 0), 0);
        const detectedCurrency = list.find((b) => Boolean(b.currency))?.currency;
        setForm((f) => ({ ...f, amount: total ? String(total) : f.amount, currency: detectedCurrency || f.currency }));
      })
      .catch(() => {});
  }, []);

  const totalDue = useMemo(() => bills.reduce((s, b) => s + (Number(b.amount_due) || 0), 0), [bills]);
  const ccy = useMemo(() => selectedCurrency || bills.find((b) => b.currency)?.currency || form.currency || "JMD", [selectedCurrency, bills, form.currency]);

  const [retryCount, setRetryCount] = useState(0);
  const [lastPaymentData, setLastPaymentData] = useState<Record<string, unknown> | null>(null);

  async function onSubmit(e: React.FormEvent, isRetry = false) {
    e.preventDefault();
    setError(null);

    setSaving(true);
    try {
      const res = await fetch("/api/customer/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount || totalDue || 0),
          currency: ccy,
          method: "paypal",
          reference: form.reference || undefined,
          tracking_number: form.tracking_number || undefined,
          billing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data?.error || "Payment failed";
        throw new Error(errorMsg);
      }

      // Success - reset form
      setRetryCount(0);
      setLastPaymentData(null);
      setForm({ amount: "", currency: ccy, method: "visa", reference: "", tracking_number: "" });
      await load();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Payment failed. Please try again.";
      setError(errorMessage);
      
      if (!isRetry) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRetry() {
    if (!lastPaymentData) return;
    
    setError(null);
    setRetryCount(prev => prev + 1);
    
    // Create a synthetic event for retry
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent;
    
    await onSubmit(syntheticEvent, true);
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case "succeeded":
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "failed":
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  function getStatusIcon(status: string) {
    switch (status.toLowerCase()) {
      case "succeeded":
      case "completed":
        return CheckCircle;
      case "pending":
      case "processing":
        return Clock;
      case "failed":
      case "rejected":
        return XCircle;
      default:
        return AlertCircle;
    }
  }

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col space-y-4">
            {/* Back Button */}
            <Link
              href="/customer/bills"
              className="inline-flex items-center space-x-2 text-[#0f4d8a] hover:text-[#E67919] transition-colors duration-200 group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm font-medium">Back to Bills & Payments</span>
            </Link>
            
            {/* Title Section */}
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-[#E67919] to-[#f59e42] rounded-xl shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f4d8a]">Complete Your Payment</h1>
              <p className="text-sm text-gray-600 mt-1">Secure payment processing with SSL encryption</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message with Retry */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 mb-2">{error}</p>
              {lastPaymentData && retryCount < 3 && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                        Retry Payment (Attempt {retryCount + 1}/3)
                      </>
                    )}
                  </button>
                  <p className="text-xs text-red-600">
                    If the problem persists, please check your payment details or contact support.
                  </p>
                </div>
              )}
              {retryCount >= 3 && (
                <p className="text-xs text-red-600 mt-2">
                  Maximum retry attempts reached. Please refresh the page or contact support if you need assistance.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <FileText className="h-5 w-5 text-[#0f4d8a]" />
              <h3 className="text-lg font-semibold text-[#0f4d8a]">Order Summary</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Outstanding Invoices</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(totalDue, ccy)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Shipping Fees</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(0, ccy)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Taxes & Fees</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(0, ccy)}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">TOTAL AMOUNT DUE</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(Number(form.amount || totalDue || 0), ccy)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Lock className="h-3 w-3" />
              <span>Secured by SSL encryption</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <CreditCard className="h-5 w-5 text-[#E67919]" />
              <h3 className="text-lg font-semibold text-[#0f4d8a]">Payment Details</h3>
            </div>

            <div className="space-y-4">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  value={form.method} 
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  <option value="visa">💳 Visa</option>
                  <option value="mastercard">💳 Mastercard</option>
                  <option value="amex">💳 American Express</option>
                  <option value="bank">🏦 Bank Transfer</option>
                  <option value="wallet">👛 Digital Wallet</option>
                </select>
              </div>

              {/* PayPal Payment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="space-y-4">
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">P</span>
                      </div>
                      <span className="font-medium text-gray-700">PayPal</span>
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Secure</span>
                    </div>
                    <PayPalButtons
                      style={{ layout: "vertical" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [{
                            amount: {
                              currency_code: ccy,
                              value: String(form.amount || totalDue || 0)
                            }
                          }]
                        });
                      }}
                      onApprove={async (data, actions) => {
                        if (actions.order) {
                          const order = await actions.order.capture();
                          console.log("PayPal payment successful:", order);
                          await onSubmit({ preventDefault: () => {} } as React.FormEvent);
                        }
                      }}
                      onError={(err) => {
                        console.error("PayPal payment error:", err);
                        setError("PayPal payment failed. Please try again.");
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                    placeholder="0.00" 
                    value={form.amount} 
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                    value={form.currency} 
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="JMD">JMD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference (Optional)
                </label>
                <input 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  placeholder="Payment reference" 
                  value={form.reference} 
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number (Optional)
                </label>
                <input 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  placeholder="Package tracking number" 
                  value={form.tracking_number} 
                  onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-bold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    <span>Process Payment</span>
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-500 mt-2">
                By proceeding, you agree to our terms and conditions
              </p>
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <MapPin className="h-5 w-5 text-[#0891b2]" />
              <h3 className="text-lg font-semibold text-[#0f4d8a]">Billing Information</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100 transition-all text-sm"
                  placeholder="John Doe" 
                  value={billing.fullName} 
                  onChange={(e) => setBilling({ ...billing, fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100 transition-all text-sm"
                  placeholder="123 Main St" 
                  value={billing.address} 
                  onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100 transition-all text-sm"
                    placeholder="New York" 
                    value={billing.city} 
                    onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100 transition-all text-sm"
                    placeholder="NY" 
                    value={billing.state} 
                    onChange={(e) => setBilling({ ...billing, state: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP/Postal Code
                </label>
                <input 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-100 transition-all text-sm"
                  placeholder="10001" 
                  value={billing.zip} 
                  onChange={(e) => setBilling({ ...billing, zip: e.target.value })}
                />
              </div>

              <label className="flex items-center space-x-3 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg cursor-pointer hover:from-slate-100 hover:to-blue-100 transition-all">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-[#0891b2] rounded focus:ring-2 focus:ring-cyan-100"
                  checked={billing.sameAsShipping} 
                  onChange={(e) => setBilling({ ...billing, sameAsShipping: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">
                  Same as shipping address
                </span>
              </label>
            </div>
          </div>
        </form>

        {/* Payment History */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8]">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Payment History
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0f4d8a] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0f4d8a] uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0f4d8a] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0f4d8a] uppercase tracking-wider">Gateway ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0f4d8a] uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0f4d8a] uppercase tracking-wider">Tracking</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0f4d8a] uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={7}>
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin" />
                        <p className="text-sm text-gray-600">Loading payment history...</p>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={7}>
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <DollarSign className="h-12 w-12 text-gray-300" />
                        <p className="text-sm font-medium text-gray-600">No payment history</p>
                        <p className="text-xs text-gray-400">Your payments will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((p) => {
                    const StatusIcon = getStatusIcon(p.status);
                    return (
                      <tr key={p._id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(p.amount, p.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">
                            {p.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border capitalize ${getStatusColor(p.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {p.gatewayId || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {p.reference || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {p.trackingNumber || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </PayPalScriptProvider>
  );
}