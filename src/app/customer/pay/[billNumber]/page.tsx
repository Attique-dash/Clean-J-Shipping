"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { 
  CreditCard, 
  FileText, 
  Loader2,
  Package,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Lock,
  ChevronRight,
  Truck
} from "lucide-react";
import Loading from "@/components/Loading";

interface BillPackage {
  packageId: string;
  trackingNumber: string;
  shipper: string;
  weight: number;
  itemValue: number;
  shippingFee: number;
  customsFee: number;
  total: number;
  invoiceFiles?: string[];
  itemDescription?: string;
  warehouseLocation?: string;
  dateReceived?: string;
}

interface BillData {
  billId: string;
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
  packages: BillPackage[];
  adminNotes?: string;
}

export default function PaymentPage() {
  const { data: session } = useSession();
  const params = useParams();
  const billNumber = params?.billNumber as string;
  
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  useEffect(() => {
    if (session?.user && billNumber) {
      loadBill();
    }
  }, [session, billNumber]);

  async function loadBill() {
    try {
      setLoading(true);
      const res = await fetch(`/api/customer/bills/${billNumber}`, {
        credentials: "include",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bill");
      
      setBill(data.data);
      if (data.data.status === 'paid') {
        setPaymentComplete(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load bill");
    } finally {
      setLoading(false);
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bill) return;

    setProcessing(true);
    try {
      // In a real implementation, you would:
      // 1. Create a payment intent with your payment gateway (Stripe/PayPal)
      // 2. Confirm the payment
      // 3. Then call your API to record the payment
      
      // For demo purposes, we'll simulate a successful payment
      const mockPaymentId = `PAY-${Date.now()}`;
      
      const res = await fetch(`/api/customer/bills/${billNumber}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentMethod: paymentMethod === 'card' ? 'credit_card' : 'paypal',
          paymentId: mockPaymentId,
          paidAmount: bill.totalAmount,
          gatewayResponse: { status: 'success', id: mockPaymentId }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Payment failed");

      toast.success("Payment successful! Your packages are now ready for delivery.");
      setPaymentComplete(true);
      await loadBill();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return <Loading message="Loading bill details..." />;
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Bill Not Found</h2>
          <p className="text-gray-600">We couldn&apos;t find the bill you&apos;re looking for.</p>
        </div>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your payment. Your packages are now ready for delivery.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Bill Number</p>
                  <p className="font-semibold text-gray-900">{bill.billNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount Paid</p>
                  <p className="font-semibold text-green-600">{formatCurrency(bill.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(bill.paidAt || new Date().toISOString())}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Paid
                  </span>
                </div>
              </div>
            </div>
            
            <a
              href="/customer/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f4d8a] text-white rounded-xl hover:bg-[#1e6bb8] transition-colors font-medium"
            >
              Go to Dashboard
              <ChevronRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bill Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] text-white">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Bill #{bill.billNumber}</h1>
                  <p className="text-gray-500">Created on {formatDate(bill.createdAt)}</p>
                </div>
              </div>

              {/* Packages */}
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-900">Packages</h2>
                {bill.packages.map((pkg) => (
                  <div key={pkg.packageId} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{pkg.trackingNumber}</div>
                        <div className="text-sm text-gray-500">{pkg.shipper}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Weight:</span> {pkg.weight} kg</div>
                      <div><span className="text-gray-500">Item Value:</span> {formatCurrency(pkg.itemValue)}</div>
                      <div><span className="text-gray-500">Shipping:</span> {formatCurrency(pkg.shippingFee)}</div>
                      <div><span className="text-gray-500">Customs:</span> {formatCurrency(pkg.customsFee)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill Summary */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Item Total</span>
                  <span className="font-medium">{formatCurrency(bill.itemTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping Fee</span>
                  <span className="font-medium">{formatCurrency(bill.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customs/Duty Fee</span>
                  <span className="font-medium">{formatCurrency(bill.customsFee)}</span>
                </div>
                {bill.additionalFees && bill.additionalFees.length > 0 && (
                  bill.additionalFees.map((fee, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-500">{fee.label}</span>
                      <span className="font-medium">{formatCurrency(fee.amount)}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Total Due</span>
                  <span className="text-[#0f4d8a]">{formatCurrency(bill.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-600" />
                Secure Payment
              </h2>

              {/* Payment Method Selection */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                    paymentMethod === 'card'
                      ? 'border-[#0f4d8a] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Credit Card</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('paypal')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                    paymentMethod === 'paypal'
                      ? 'border-[#0f4d8a] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="h-5 w-5" />
                  <span className="font-medium">PayPal</span>
                </button>
              </div>

              {paymentMethod === 'card' ? (
                <form onSubmit={handlePayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVC
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-lg transition-all font-semibold text-lg disabled:opacity-50"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-5 w-5" />
                        Pay {formatCurrency(bill.totalAmount)}
                      </>
                    )}
                  </button>

                  <p className="text-center text-sm text-gray-500 flex items-center justify-center gap-1">
                    <Lock className="h-4 w-4" />
                    Secure SSL Encrypted Transaction
                  </p>
                </form>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    You will be redirected to PayPal to complete your payment.
                  </p>
                  <button
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-[#0070ba] text-white rounded-xl hover:bg-[#005ea6] transition-all font-semibold text-lg disabled:opacity-50"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-5 w-5" />
                        Pay with PayPal {formatCurrency(bill.totalAmount)}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Info */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Truck className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Ready for Delivery</h3>
              </div>
              <p className="text-sm text-blue-800">
                Once payment is confirmed, your packages will be processed and ready for delivery within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
