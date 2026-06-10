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
  const { formatCurrency } = useCurrency();
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
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
  const displayBills = showHistory ? paidBills : pendingBills;
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Bills</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(false)}
              className={`px-4 py-2 rounded font-medium ${
                !showHistory ? 'bg-[#0f4d8a] text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              Pending ({pendingBills.length})
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`px-4 py-2 rounded font-medium ${
                showHistory ? 'bg-[#0f4d8a] text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              Paid ({paidBills.length})
            </button>
          </div>
        </div>

        {/* Bills Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {displayBills.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bills found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packages</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayBills.map(bill => (
                  <tr key={bill._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{bill.billNumber}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(bill.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{bill.packages.length}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(bill.totalAmount, 'USD')}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(bill.status)}</td>
                    <td className="px-6 py-4">
                      {!showHistory && (
                        <Link
                          href={`/customer/pay/${bill.billNumber}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f4d8a] text-white rounded font-medium hover:bg-[#1e6bb8]"
                        >
                          <CreditCard className="w-4 h-4" />
                          Pay
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
