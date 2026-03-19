"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { 
  Upload, 
  FileText, 
  X, 
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  File,
  Package,
  DollarSign,
  Plane,
  Ship,
  Truck,
  Check
} from "lucide-react";
import Loading from "@/components/Loading";

interface PackageData {
  id: string;
  trackingNumber: string;
  tracking_number: string;
  shipper: string;
  weight: number;
  serviceMode: 'air' | 'ocean' | 'local';
  dateReceived?: Date;
  received_date?: string;
  invoiceStatus: 'pending' | 'submitted' | 'approved' | 'rejected' | 'billed';
  invoiceUploaded: boolean;
  pricePaid: number;
  pricePaidCurrency: string;
  invoiceFiles: string[];
  invoiceSubmittedAt?: string;
  hasInvoice: boolean;
  description?: string;
  warehouseLocation?: string;
}

interface InvoiceFormData {
  price_paid: number;
  currency: string;
  files: File[];
}

export default function CustomerInvoiceUploadPage() {
  const { data: session } = useSession();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, InvoiceFormData>>({});

  // Load packages on mount
  useEffect(() => {
    if (session?.user) {
      loadPackages();
    } else if (session === null) {
      setLoading(false);
    }
  }, [session]);

  async function loadPackages() {
    try {
      setLoading(true);
      const res = await fetch("/api/customer/invoice-upload", {
        credentials: "include",
        cache: "no-store",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load packages");
      
      setPackages(data.packages || []);
      
      // Initialize form data for each package
      const initialFormData: Record<string, InvoiceFormData> = {};
      data.packages?.forEach((pkg: PackageData) => {
        initialFormData[pkg.trackingNumber] = {
          price_paid: 0,
          currency: 'USD',
          files: []
        };
      });
      setFormData(initialFormData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }

  const handleSelectPackage = (trackingNumber: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(trackingNumber)) {
      newSelected.delete(trackingNumber);
    } else {
      newSelected.add(trackingNumber);
    }
    setSelectedPackages(newSelected);
  };

  const handleSelectAll = () => {
    const availablePackages = packages.filter(p => canSubmit(p));
    if (selectedPackages.size === availablePackages.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(availablePackages.map(p => p.trackingNumber)));
    }
  };

  const handlePriceChange = (trackingNumber: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [trackingNumber]: {
        ...prev[trackingNumber],
        price_paid: parseFloat(value) || 0
      }
    }));
  };

  const handleCurrencyChange = (trackingNumber: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [trackingNumber]: {
        ...prev[trackingNumber],
        currency: value
      }
    }));
  };

  const handleFileChange = (trackingNumber: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validate files
      const validFiles = files.filter(file => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}. Only PDF, JPG, and PNG files are allowed.`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });

      // Limit to 3 files per package
      const currentFiles = formData[trackingNumber]?.files || [];
      const newFiles = [...currentFiles, ...validFiles].slice(0, 3);
      
      setFormData(prev => ({
        ...prev,
        [trackingNumber]: {
          ...prev[trackingNumber],
          files: newFiles
        }
      }));
    }
  };

  const removeFile = (trackingNumber: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [trackingNumber]: {
        ...prev[trackingNumber],
        files: prev[trackingNumber].files.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async () => {
    if (selectedPackages.size === 0) {
      toast.error("Please select at least one package");
      return;
    }

    // Validate selected packages
    const uploads: any[] = [];
    let hasError = false;

    for (const trackingNumber of selectedPackages) {
      const pkg = packages.find(p => p.trackingNumber === trackingNumber);
      const data = formData[trackingNumber];

      if (!pkg) continue;

      // Skip already submitted packages
      if (pkg.invoiceStatus === 'submitted' || pkg.invoiceStatus === 'billed') {
        continue;
      }

      // Check required fields
      if (!data.price_paid || data.price_paid <= 0) {
        toast.error(`Please enter a valid price paid for package ${trackingNumber}`);
        hasError = true;
        break;
      }

      if (data.files.length === 0) {
        toast.error(`Please upload at least one invoice file for package ${trackingNumber}`);
        hasError = true;
        break;
      }

      uploads.push({
        tracking_number: trackingNumber,
        price_paid: data.price_paid,
        currency: data.currency,
        files: data.files
      });
    }

    if (hasError) return;

    if (uploads.length === 0) {
      toast.error("No valid packages to submit");
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      
      uploads.forEach((upload, index) => {
        // Add files
        upload.files.forEach((file: File) => {
          formDataToSend.append(`files_${index}`, file);
        });
        
        // Add metadata (without files)
        const { files, ...metadata } = upload;
        formDataToSend.append(`upload_${index}`, JSON.stringify(metadata));
      });

      const res = await fetch("/api/customer/invoice-upload", {
        method: "POST",
        body: formDataToSend,
        credentials: "include",
      });

      const result = await res.json();
      
      if (!res.ok) {
        // Show detailed errors from results array
        if (result.results && result.results.length > 0) {
          const failedResults = result.results.filter((r: any) => !r.success);
          failedResults.forEach((r: any) => {
            toast.error(`${r.tracking_number}: ${r.error || 'Unknown error'}`);
          });
        } else {
          toast.error(result?.error || result?.message || "Failed to submit invoices");
        }
        return;
      }

      if (result.success) {
        toast.success(result.message);
        
        // Reload packages to update status
        await loadPackages();
        
        // Clear selection
        setSelectedPackages(new Set());
      } else {
        throw new Error(result.message || "Failed to submit invoices");
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit invoices");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getServiceModeIcon = (mode?: string) => {
    switch (mode?.toLowerCase()) {
      case 'air':
        return <Plane className="h-4 w-4" />;
      case 'ocean':
        return <Ship className="h-4 w-4" />;
      case 'local':
        return <Truck className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Submitted
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'billed':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
            <DollarSign className="w-3 h-3 mr-1" />
            Billed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <File className="h-4 w-4 text-blue-500" />;
  };

  const canSubmit = (pkg: PackageData) => {
    return pkg.invoiceStatus !== 'submitted' && 
           pkg.invoiceStatus !== 'billed' && 
           pkg.invoiceStatus !== 'approved';
  };

  if (loading && session === undefined) {
    return <Loading message="Loading packages..." />;
  }

  if (!session && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 mx-auto mb-6">
              <Package className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to upload invoices</p>
            <a
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Sign In to Your Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Background Pattern */}
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-tight md:text-3xl">Invoice Upload</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {packages.filter(p => canSubmit(p)).length} packages requiring invoice upload
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">Ready</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => loadPackages()}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </header>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How to Upload Invoices:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Select the packages you want to upload invoices for</li>
              <li>Enter the price you paid for each package (item value)</li>
              <li>Upload invoice files (PDF, JPG, or PNG, max 10MB each, up to 3 files per package)</li>
              <li>Click &quot;Submit All Invoices&quot; to complete</li>
            </ol>
          </div>

          {packages.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
                  <Package className="h-10 w-10 text-gray-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages available</h3>
                  <p className="text-sm text-gray-600">You don&apos;t have any packages that require invoice upload at the moment.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPackages.size === packages.filter(p => canSubmit(p)).length && packages.filter(p => canSubmit(p)).length > 0}
                    onChange={handleSelectAll}
                    className="h-5 w-5 rounded border-gray-300 text-[#0f4d8a] focus:ring-[#0f4d8a]"
                  />
                  <span className="font-medium text-gray-700">
                    Select All ({packages.filter(p => canSubmit(p)).length} available)
                  </span>
                </label>
                
                <div className="text-sm text-gray-500">
                  {selectedPackages.size} selected
                </div>
              </div>

              {/* Packages List */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left w-12"></th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Package</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price Paid</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice Files</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {packages.map((pkg) => {
                        const isSelected = selectedPackages.has(pkg.trackingNumber);
                        const canEdit = canSubmit(pkg);
                        const data = formData[pkg.trackingNumber] || { price_paid: 0, currency: 'USD', files: [] };
                        
                        return (
                          <tr 
                            key={pkg.trackingNumber} 
                            className={`hover:bg-gray-50 ${!canEdit ? 'bg-gray-50/50' : ''}`}
                          >
                            <td className="px-4 py-4">
                              {canEdit ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectPackage(pkg.trackingNumber)}
                                  className="h-5 w-5 rounded border-gray-300 text-[#0f4d8a] focus:ring-[#0f4d8a]"
                                />
                              ) : (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] text-white">
                                  {getServiceModeIcon(pkg.serviceMode)}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{pkg.trackingNumber}</div>
                                  <div className="text-sm text-gray-500">{pkg.shipper}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900">
                                <span className="font-medium">{pkg.weight} kg</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                Received: {formatDate(pkg.received_date)}
                              </div>
                              {pkg.warehouseLocation && (
                                <div className="text-sm text-gray-500">
                                  Location: {pkg.warehouseLocation}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {getStatusBadge(pkg.invoiceStatus)}
                              {pkg.invoiceSubmittedAt && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Submitted: {formatDate(pkg.invoiceSubmittedAt)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {canEdit ? (
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0.00"
                                      value={data.price_paid || ''}
                                      onChange={(e) => handlePriceChange(pkg.trackingNumber, e.target.value)}
                                      disabled={!isSelected}
                                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent text-sm disabled:bg-gray-100"
                                    />
                                  </div>
                                  <select
                                    value={data.currency}
                                    onChange={(e) => handleCurrencyChange(pkg.trackingNumber, e.target.value)}
                                    disabled={!isSelected}
                                    className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent text-sm disabled:bg-gray-100"
                                  >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="JMD">JMD</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <span className="font-semibold text-gray-900">
                                    {pkg.pricePaidCurrency} {pkg.pricePaid?.toFixed(2)}
                                  </span>
                                  {pkg.invoiceFiles.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {pkg.invoiceFiles.length} file(s) uploaded
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {canEdit ? (
                                <div className="space-y-2">
                                  {isSelected && data.files.length > 0 && (
                                    <div className="space-y-1">
                                      {data.files.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-gray-100 rounded px-2 py-1 text-sm">
                                          <div className="flex items-center gap-2">
                                            {getFileIcon(file.name)}
                                            <span className="truncate max-w-[120px]">{file.name}</span>
                                          </div>
                                          <button
                                            onClick={() => removeFile(pkg.trackingNumber, index)}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {isSelected && data.files.length < 3 && (
                                    <label className={`flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                      isSelected ? 'border-gray-300 hover:border-[#0f4d8a] hover:bg-blue-50' : 'border-gray-200 bg-gray-50'
                                    }`}>
                                      <Upload className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">
                                        {data.files.length === 0 ? 'Upload Files' : 'Add More'}
                                      </span>
                                      <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange(pkg.trackingNumber, e)}
                                        disabled={!isSelected}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                  {isSelected && data.files.length >= 3 && (
                                    <span className="text-xs text-gray-500">Max 3 files</span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {pkg.invoiceFiles.slice(0, 2).map((file, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      {getFileIcon(file)}
                                      <span className="truncate max-w-[150px] text-gray-600">
                                        {file.split('/').pop()}
                                      </span>
                                    </div>
                                  ))}
                                  {pkg.invoiceFiles.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{pkg.invoiceFiles.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-lg transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>Submit All Invoices ({selectedPackages.size})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
