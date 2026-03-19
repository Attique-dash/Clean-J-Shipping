"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Loader2,
  RefreshCw,
  File,
  Package,
  DollarSign,
  Eye,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  User,
  Calendar,
  CreditCard
} from "lucide-react";
import Loading from "@/components/Loading";

interface InvoicePackage {
  packageId: string;
  trackingNumber: string;
  shipper: string;
  weight: number;
  serviceMode: 'air' | 'ocean' | 'local';
  dateReceived: string;
  isReceived: boolean;
  warehouseLocation?: string;
  invoiceStatus: 'pending' | 'submitted' | 'approved' | 'rejected' | 'billed';
  invoiceSubmittedAt: string;
  invoiceReviewedAt?: string;
  invoiceReviewedBy?: string;
  invoiceRejectionReason?: string;
  pricePaid: number;
  pricePaidCurrency: string;
  invoiceFiles: string[];
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    shippingId?: string;
  } | null;
  itemDescription?: string;
  itemCategory?: string;
}

export default function AdminInvoiceReviewPage() {
  const { data: session } = useSession();
  const [packages, setPackages] = useState<InvoicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<InvoicePackage | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("submitted");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Bill generation form state
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [customsFee, setCustomsFee] = useState<number>(0);
  const [additionalFees, setAdditionalFees] = useState<{label: string, amount: number}[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [generateBill, setGenerateBill] = useState(true);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      loadInvoices();
    }
  }, [session, statusFilter]);

  async function loadInvoices() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/invoices/review?status=${statusFilter}`, {
        credentials: "include",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load invoices");
      
      setPackages(data.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  const handleReview = (pkg: InvoicePackage) => {
    setSelectedPackage(pkg);
    setShowReviewModal(true);
    // Reset form state
    setShippingFee(0);
    setCustomsFee(0);
    setAdditionalFees([]);
    setRejectionReason("");
    setGenerateBill(true);
  };

  const handleApprove = async () => {
    if (!selectedPackage) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/invoices/${selectedPackage.packageId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: 'approve',
          generateBill,
          shippingFee: shippingFee || 0,
          customsFee: customsFee || 0,
          additionalFees: additionalFees.filter(f => f.label && f.amount > 0)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to approve invoice");

      toast.success(data.message);
      setShowReviewModal(false);
      setSelectedPackage(null);
      await loadInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve invoice");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPackage) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/invoices/${selectedPackage.packageId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: 'reject',
          rejectionReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to reject invoice");

      toast.success(data.message);
      setShowReviewModal(false);
      setSelectedPackage(null);
      await loadInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject invoice");
    } finally {
      setProcessing(false);
    }
  };

  const toggleRowExpand = (packageId: string) => {
    try {
      const newExpanded = new Set(expandedRows);
      if (newExpanded.has(packageId)) {
        newExpanded.delete(packageId);
      } else {
        newExpanded.add(packageId);
      }
      setExpandedRows(newExpanded);
    } catch (error) {
      console.error('Error toggling row:', error);
    }
  };

  const addAdditionalFee = () => {
    setAdditionalFees([...additionalFees, { label: '', amount: 0 }]);
  };

  const updateAdditionalFee = (index: number, field: 'label' | 'amount', value: string | number) => {
    const updated = [...additionalFees];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalFees(updated);
  };

  const removeAdditionalFee = (index: number) => {
    setAdditionalFees(additionalFees.filter((_, i) => i !== index));
  };

  const handleFileClick = async (e: React.MouseEvent, fileUrl: string) => {
    e.preventDefault();
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'File not found on disk') {
          toast.error('File not available: ' + (data.message || 'Please ask customer to re-upload'));
          return;
        }
        throw new Error(data.error || 'Failed to download file');
      }
      // If successful, open in new tab
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('File download error:', error);
      toast.error('Unable to download file. It may have been deleted.');
    }
  };

  const calculateTotal = () => {
    if (!selectedPackage) return 0;
    const itemValue = selectedPackage.pricePaid || 0;
    const additionalTotal = additionalFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    return itemValue + shippingFee + customsFee + additionalTotal;
  };

  const filteredPackages = packages.filter(pkg => {
    const searchLower = searchTerm.toLowerCase();
    return (
      pkg.trackingNumber.toLowerCase().includes(searchLower) ||
      pkg.shipper.toLowerCase().includes(searchLower) ||
      pkg.customer?.name?.toLowerCase().includes(searchLower) ||
      pkg.customer?.shippingId?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-blue-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            Submitted
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Rejected
          </span>
        );
      case 'billed':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
            Billed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            Pending
          </span>
        );
    }
  };

  if (loading && !packages.length) {
    return <Loading message="Loading invoices..." />;
  }

  if (!session?.user || session.user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] text-white">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice Review</h1>
                <p className="text-gray-600">
                  {packages.length} invoices found
                </p>
              </div>
            </div>
            <button
              onClick={() => loadInvoices()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by tracking, shipper, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
              >
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="billed">Billed</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Package</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Item Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPackages.map((pkg) => (
                  <>
                    <tr 
                      key={pkg.packageId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRowExpand(pkg.packageId)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {expandedRows.has(pkg.packageId) ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{pkg.trackingNumber}</div>
                            <div className="text-sm text-gray-500">{pkg.shipper}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {pkg.customer ? (
                          <div>
                            <div className="font-medium text-gray-900">{pkg.customer.name}</div>
                            <div className="text-sm text-gray-500">{pkg.customer.shippingId}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">
                          {pkg.pricePaidCurrency} {pkg.pricePaid?.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(pkg.invoiceStatus)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(pkg.invoiceSubmittedAt)}
                      </td>
                      <td className="px-4 py-4">
                        {pkg.invoiceStatus === 'submitted' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReview(pkg);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#1e6bb8] transition-colors text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpand(pkg.packageId);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Expanded Row Details */}
                    {expandedRows.has(pkg.packageId) && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Customer Details */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Customer Details
                              </h4>
                              {pkg.customer ? (
                                <div className="space-y-2 text-sm">
                                  <p><span className="text-gray-500">Name:</span> {pkg.customer.name}</p>
                                  <p><span className="text-gray-500">Email:</span> {pkg.customer.email}</p>
                                  <p><span className="text-gray-500">Phone:</span> {pkg.customer.phone || 'N/A'}</p>
                                  <p><span className="text-gray-500">Shipping ID:</span> {pkg.customer.shippingId || 'N/A'}</p>
                                </div>
                              ) : (
                                <p className="text-gray-400">No customer information available</p>
                              )}
                            </div>

                            {/* Package Details */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Package Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <p><span className="text-gray-500">Weight:</span> {pkg.weight} kg</p>
                                <p><span className="text-gray-500">Service:</span> {pkg.serviceMode}</p>
                                <p><span className="text-gray-500">Received:</span> {pkg.isReceived ? 'Yes' : 'No'}</p>
                                <p><span className="text-gray-500">Date Received:</span> {formatDate(pkg.dateReceived)}</p>
                                <p><span className="text-gray-500">Location:</span> {pkg.warehouseLocation || 'N/A'}</p>
                                {pkg.itemDescription && (
                                  <p><span className="text-gray-500">Description:</span> {pkg.itemDescription}</p>
                                )}
                              </div>
                            </div>

                            {/* Invoice Files */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Invoice Files ({pkg.invoiceFiles.length})
                              </h4>
                              <div className="space-y-2">
                                {pkg.invoiceFiles.map((file, index) => (
                                  <button
                                    key={index}
                                    onClick={(e) => handleFileClick(e as any, file)}
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors w-full text-left"
                                  >
                                    {getFileIcon(file)}
                                    <span className="text-sm text-gray-700 truncate flex-1">
                                      {file.split('/').pop()}
                                    </span>
                                    <Download className="h-4 w-4 text-gray-400" />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Review History */}
                            {pkg.invoiceReviewedAt && (
                              <div className="bg-white rounded-lg p-4 border border-gray-200 md:col-span-2 lg:col-span-3">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Review History
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="text-gray-500">Reviewed At:</span> {formatDate(pkg.invoiceReviewedAt)}</p>
                                  <p><span className="text-gray-500">Reviewed By:</span> {pkg.invoiceReviewedBy}</p>
                                  {pkg.invoiceRejectionReason && (
                                    <p className="text-red-600">
                                      <span className="text-gray-500">Rejection Reason:</span> {pkg.invoiceRejectionReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPackages.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No invoices found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review Invoice</h2>
                <p className="text-gray-500">Package: {selectedPackage.trackingNumber}</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Package Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Package Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Tracking:</span> {selectedPackage.trackingNumber}</p>
                      <p><span className="text-gray-500">Shipper:</span> {selectedPackage.shipper}</p>
                      <p><span className="text-gray-500">Weight:</span> {selectedPackage.weight} kg</p>
                      <p><span className="text-gray-500">Service:</span> {selectedPackage.serviceMode}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                    {selectedPackage.customer ? (
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Name:</span> {selectedPackage.customer.name}</p>
                        <p><span className="text-gray-500">Email:</span> {selectedPackage.customer.email}</p>
                        <p><span className="text-gray-500">Shipping ID:</span> {selectedPackage.customer.shippingId}</p>
                      </div>
                    ) : (
                      <p className="text-gray-400">No customer information</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Invoice Files</h3>
                    <div className="space-y-2">
                      {selectedPackage.invoiceFiles.map((file, index) => (
                        <button
                          key={index}
                          onClick={(e) => handleFileClick(e as any, file)}
                          className="flex items-center gap-2 p-2 bg-white rounded border hover:border-[#0f4d8a] transition-colors w-full text-left"
                        >
                          {getFileIcon(file)}
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {file.split('/').pop()}
                          </span>
                          <Download className="h-4 w-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Billing Form */}
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Item Value Declared by Customer
                    </h3>
                    <div className="text-2xl font-bold text-blue-700">
                      {selectedPackage.pricePaidCurrency} {selectedPackage.pricePaid?.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Generate Bill</h3>
                    
                    <label className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        checked={generateBill}
                        onChange={(e) => setGenerateBill(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-[#0f4d8a] focus:ring-[#0f4d8a]"
                      />
                      <span>Generate bill immediately after approval</span>
                    </label>

                    {generateBill && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shipping Fee
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={shippingFee || ''}
                              onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customs/Duty Fee
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={customsFee || ''}
                              onChange={(e) => setCustomsFee(parseFloat(e.target.value) || 0)}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Additional Fees
                            </label>
                            <button
                              onClick={addAdditionalFee}
                              className="text-sm text-[#0f4d8a] hover:text-[#1e6bb8]"
                            >
                              + Add Fee
                            </button>
                          </div>
                          <div className="space-y-2">
                            {additionalFees.map((fee, index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Fee name"
                                  value={fee.label}
                                  onChange={(e) => updateAdditionalFee(index, 'label', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent text-sm"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Amount"
                                  value={fee.amount || ''}
                                  onChange={(e) => updateAdditionalFee(index, 'amount', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent text-sm"
                                />
                                <button
                                  onClick={() => removeAdditionalFee(index)}
                                  className="text-red-500 hover:text-red-700 px-2"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-green-900">Total Amount:</span>
                            <span className="text-2xl font-bold text-green-700">
                              ${calculateTotal().toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rejection Reason */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <h3 className="font-semibold text-red-900 mb-3">Rejection (Optional)</h3>
                    <textarea
                      placeholder="Enter reason for rejection (if rejecting)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#1e6bb8] transition-colors disabled:opacity-50"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {generateBill ? 'Approve & Generate Bill' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
