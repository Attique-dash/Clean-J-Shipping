'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, CreditCard, Package } from 'lucide-react';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    email: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  total: number;
  status: string;
  issueDate: string;
  dueDate: string;
  trackingNumber?: string;
}

export default function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const [resolvedParams, setResolvedParams] = useState<{ token: string } | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const searchParams = useSearchParams();
  
  // Resolve params
  useEffect(() => {
    params.then(p => setResolvedParams(p));
  }, [params]);

  const invoiceId = searchParams?.get('invoice');

  useEffect(() => {
    if (resolvedParams) {
      fetchInvoice();
    }
  }, [resolvedParams, invoiceId]);

  const fetchInvoice = async () => {
    if (!resolvedParams) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/public/${invoiceId}?token=${resolvedParams.token}`);
      
      if (!response.ok) {
        throw new Error('Invoice not found or link has expired');
      }
      
      const data = await response.json();
      setInvoiceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!invoiceData || !resolvedParams) return;
    
    try {
      setPaying(true);
      
      // Here you would integrate with your payment gateway (Stripe, PayPal, etc.)
      // For now, we'll simulate a payment
      const response = await fetch(`/api/invoices/${invoiceData.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resolvedParams.token,
          paymentMethod: 'online',
          amount: invoiceData.total
        })
      });

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      const result = await response.json();
      
      // Redirect to success page or update UI
      if (result.success) {
        // Refresh invoice data to show updated status
        await fetchInvoice();
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600">{error || 'Invoice not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = invoiceData.status === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPaid ? 'Payment Confirmed' : 'Invoice Payment'}
          </h1>
          <p className="text-gray-600">
            {isPaid 
              ? 'Thank you for your payment!'
              : 'Please review your invoice details below and complete the payment'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Invoice Info */}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Invoice Number</p>
                      <p className="font-semibold">{invoiceData.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isPaid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {isPaid ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Paid
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {invoiceData.trackingNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="font-medium">{invoiceData.trackingNumber}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Issue Date</p>
                      <p className="font-medium">
                        {new Date(invoiceData.issueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Due Date</p>
                      <p className="font-medium">
                        {new Date(invoiceData.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-2">Billed To</p>
                    <p className="font-medium">{invoiceData.customer.name}</p>
                    <p className="text-sm text-gray-600">{invoiceData.customer.email}</p>
                  </div>

                  {/* Items */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">Items</h3>
                    <div className="space-y-2">
                      {invoiceData.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b">
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity} × JMD {item.unitPrice.toFixed(2)}</p>
                          </div>
                          <p className="font-medium">JMD {item.total.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Amount</span>
                      <span className="text-2xl font-bold text-blue-600">
                        JMD {invoiceData.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {isPaid ? 'Payment Status' : 'Complete Payment'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPaid ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-700 mb-2">
                      Payment Successful
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your payment has been processed successfully.
                    </p>
                    <p className="text-sm text-gray-500">
                      Transaction ID: {invoiceData.id}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-gray-900 mb-2">
                        JMD {invoiceData.total.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">Amount Due</p>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Payment Methods</h4>
                      <div className="space-y-2">
                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="payment" defaultChecked className="mr-3" />
                          <span>Credit/Debit Card</span>
                        </label>
                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="payment" className="mr-3" />
                          <span>PayPal</span>
                        </label>
                      </div>
                    </div>

                    <Button 
                      onClick={handlePayment}
                      disabled={paying}
                      className="w-full"
                    >
                      {paying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      By clicking "Pay Now", you agree to our terms and conditions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="mt-4">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-3">
                  If you have any questions about this invoice or payment, please contact our support team.
                </p>
                <div className="space-y-1 text-sm">
                  <p>📧 support@cleanjshipping.com</p>
                  <p>📞 +1-876-XXX-XXXX</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
