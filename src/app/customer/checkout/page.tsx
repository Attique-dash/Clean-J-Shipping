// src/app/customer/checkout/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShoppingCart, 
  ArrowLeft, 
  XCircle, 
  Loader2,
  FileText,
  DollarSign,
  X
} from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "react-toastify";
import Link from "next/link";
import { useCurrency } from "@/contexts/CurrencyContext";

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

function CheckoutPageContent() {
  const [_router, _searchParams, formatCurrency] = [useRouter(), useSearchParams(), useCurrency().formatCurrency];
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [_paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [cartTrackingNumbers, setCartTrackingNumbers] = useState<string[]>([]);

  useEffect(() => {
    // Get cart items from localStorage or URL params
    const cartData = localStorage.getItem('customer_cart');
    if (cartData) {
      try {
        const trackingNumbers = JSON.parse(cartData);
        setCartTrackingNumbers(trackingNumbers);
      } catch (_e) {
        console.error("Failed to parse cart data:", _e);
      }
    }
    
    // Load bills
    loadBills();
  }, []);

  async function loadBills() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/bills", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bills");
      const allBills: Bill[] = Array.isArray(data?.bills) ? data.bills : [];
      
      // Filter to only cart items
      const cartData = localStorage.getItem('customer_cart');
      if (cartData) {
        try {
          const trackingNumbers = JSON.parse(cartData);
          const cartBills = allBills.filter(bill => 
            trackingNumbers.includes(bill.tracking_number) &&
            bill.payment_status !== 'paid' &&
            bill.amount_due > 0
          );
          setItems(cartBills);
          setCartTrackingNumbers(trackingNumbers);
        } catch (_e) {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch (_e) {
      setError(_e instanceof Error ? _e.message : "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = items.reduce((sum, bill) => sum + (Number(bill.amount_due) || 0), 0);
  const currencyCode = items.find(b => b.currency)?.currency || "JMD";

  const removeFromCart = (trackingNumber: string) => {
    const updated = cartTrackingNumbers.filter(tn => tn !== trackingNumber);
    setCartTrackingNumbers(updated);
    localStorage.setItem('customer_cart', JSON.stringify(updated));
    setItems(items.filter(b => b.tracking_number !== trackingNumber));
    toast.success("Item removed from cart");
  };

  async function handlePayPalCreateOrder() {
    if (items.length === 0) {
      toast.error("No items in cart");
      return "";
    }
    
    try {
      const res = await fetch("/api/customer/payments/create-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          currency: currencyCode,
          description: `Payment for ${items.length} invoice${items.length !== 1 ? 's' : ''}`,
          trackingNumbers: items.map(b => b.tracking_number),
          items: items.map(b => ({
            trackingNumber: b.tracking_number,
            invoiceNumber: b.invoice_number,
            amount: b.amount_due,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create PayPal order");
      setPaypalOrderId(data.orderId);
      return data.orderId;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PayPal order creation failed");
      throw error;
    }
  }

  async function handlePayPalApprove(data: { orderID: string }) {
    if (items.length === 0) return;

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

      // Process payment for all items
      const res = await fetch("/api/customer/payments/process-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(b => ({
            trackingNumber: b.tracking_number,
            amount: b.amount_due,
            invoiceNumber: b.invoice_number,
          })),
          totalAmount: totalAmount,
          currency: currencyCode,
          paymentMethod: "paypal",
          paypalOrderId: data.orderID,
        }),
      });

      const paymentData = await res.json();
      if (!res.ok) {
        throw new Error(paymentData?.error || "Failed to process payment");
      }

      // Clear cart
      localStorage.removeItem('customer_cart');
      
      toast.success(`Payment processed successfully for ${items.length} item${items.length !== 1 ? 's' : ''}!`);
      
      // Redirect to bills page
      setTimeout(() => {
        _router.push("/customer/bills?payment=success");
      }, 1500);
    } catch (_e) {
      toast.error(_e instanceof Error ? _e.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mb-6">Add bills to your cart to checkout</p>
            <Link
              href="/customer/bills"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Bills
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/customer/bills"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[#0f4d8a]">Checkout</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Review and pay for your selected bills
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-[#E67919]" />
              <span className="font-semibold text-[#E67919]">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0f4d8a]" />
                Order Summary
              </h2>
              <div className="space-y-3">
                {items.map((bill) => (
                  <div
                    key={bill.tracking_number}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {bill.invoice_number ? `Invoice #${bill.invoice_number}` : 'Bill'}
                          </p>
                          <p className="text-sm text-gray-500">Tracking: {bill.tracking_number}</p>
                          {bill.description && (
                            <p className="text-xs text-gray-400 mt-1">{bill.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-[#E67919]">
                          {formatCurrency(bill.amount_due || 0, bill.currency || currencyCode)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(bill.tracking_number)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from cart"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#E67919]" />
                Payment Summary
              </h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium text-gray-900">{items.length}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[#E67919]">
                      {formatCurrency(totalAmount, currencyCode)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Complete your payment securely with PayPal
                </p>
                <PayPalScriptProvider
                  options={{
                    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                    currency: currencyCode,
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
                      color: "gold",
                      shape: "rect",
                      label: "paypal",
                    }}
                    disabled={processing}
                  />
                </PayPalScriptProvider>
                {processing && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing payment...
                  </div>
                )}
              </div>

              <Link
                href="/customer/bills"
                className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bills
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading checkout...</p>
        </div>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}

