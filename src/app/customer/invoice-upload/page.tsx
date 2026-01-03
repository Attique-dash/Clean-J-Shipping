"use client";

import { useState, useEffect } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "react-toastify";
import { 
  Upload, 
  FileText, 
  DollarSign, 
  Package, 
  Weight, 
  Plus, 
  X, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Download
} from "lucide-react";

interface PackageData {
  tracking_number: string;
  description?: string;
  weight?: string;
  status: string;
  current_location?: string;
}

interface InvoiceUpload {
  tracking_number: string;
  price_paid: number;
  currency: string;
  invoice_files: File[];
  description?: string;
}

export default function CustomerInvoiceUploadPage() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const { selectedCurrency: globalCurrency, formatCurrency } = useCurrency();
  
  // Form state
  const [uploads, setUploads] = useState<InvoiceUpload[]>([]);
  const [currentUpload, setCurrentUpload] = useState<InvoiceUpload>({
    tracking_number: "",
    price_paid: 0,
    currency: globalCurrency,
    invoice_files: [],
    description: ""
  });

  useEffect(() => {
    setSelectedCurrency(globalCurrency);
  }, [globalCurrency]);

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    try {
      const res = await fetch("/api/customer/packages", {
        credentials: "include",
        cache: "no-store",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load packages");
      
      const list: PackageData[] = Array.isArray(data?.packages) ? data.packages : [];
      // Filter packages that need invoice upload (received status and related statuses)
      const receivedPackages = list.filter(pkg => 
        pkg.status === "received" || 
        pkg.status === "in_processing" ||
        pkg.status === "pending" ||
        pkg.status === "processing" ||
        pkg.status === "in_transit" ||
        pkg.status === "shipped"
      );
      setPackages(receivedPackages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCurrentUpload(prev => ({
      ...prev,
      invoice_files: [...prev.invoice_files, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setCurrentUpload(prev => ({
      ...prev,
      invoice_files: prev.invoice_files.filter((_, i) => i !== index)
    }));
  };

  const addUploadToList = () => {
    if (!currentUpload.tracking_number) {
      toast.error("Please select a package");
      return;
    }
    
    if (currentUpload.price_paid <= 0) {
      toast.error("Please enter a valid price paid");
      return;
    }
    
    if (currentUpload.invoice_files.length === 0) {
      toast.error("Please upload at least one invoice file");
      return;
    }

    setUploads(prev => [...prev, { ...currentUpload }]);
    setCurrentUpload({
      tracking_number: "",
      price_paid: 0,
      currency: globalCurrency,
      invoice_files: [],
      description: ""
    });
    
    // Reset file input
    const fileInput = document.getElementById("invoice-files") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    
    toast.success("Package added to upload list");
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAll = async () => {
    if (uploads.length === 0) {
      toast.error("No packages to upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      
      uploads.forEach((upload, index) => {
        upload.invoice_files.forEach((file, fileIndex) => {
          formData.append(`files_${index}`, file);
        });
        formData.append(`upload_${index}`, JSON.stringify({
          tracking_number: upload.tracking_number,
          price_paid: upload.price_paid,
          currency: upload.currency,
          description: upload.description
        }));
      });

      const res = await fetch("/api/customer/invoice-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      toast.success("All invoices uploaded successfully!");
      setUploads([]);
      await loadPackages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Package Invoice Upload
            </h1>
            <p className="text-blue-100 mt-1">When warehouse receives your packages, upload how much you paid for the goods and provide descriptions</p>
          </div>
        </div>

        {/* Available Packages */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Packages Received at Warehouse
            </h2>
          </div>
          <div className="p-6">
            {packages.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No packages available for invoice upload</p>
                <p className="text-sm text-gray-500 mt-1">Packages will appear here once they are received at the warehouse and ready for invoice upload</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg) => (
                  <div key={pkg.tracking_number} className="border border-gray-200 rounded-lg p-4 hover:border-[#0f4d8a] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-[#0f4d8a]" />
                        <span className="font-mono text-sm font-semibold">{pkg.tracking_number}</span>
                      </div>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        {pkg.status}
                      </span>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                    )}
                    {pkg.weight && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Weight className="h-4 w-4" />
                        {pkg.weight}
                      </div>
                    )}
                    {pkg.current_location && (
                      <div className="text-sm text-gray-500 mt-1">
                        Location: {pkg.current_location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Add Invoice Details
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Package Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Package *
                </label>
                <select
                  value={currentUpload.tracking_number}
                  onChange={(e) => setCurrentUpload(prev => ({ ...prev, tracking_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                >
                  <option value="">Choose a package...</option>
                  {packages.map((pkg) => (
                    <option key={pkg.tracking_number} value={pkg.tracking_number}>
                      {pkg.tracking_number} - {pkg.description || 'No description'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Paid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Paid *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentUpload.price_paid}
                    onChange={(e) => setCurrentUpload(prev => ({ ...prev, price_paid: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <select
                      value={currentUpload.currency}
                      onChange={(e) => setCurrentUpload(prev => ({ ...prev, currency: e.target.value }))}
                      className="h-full py-0 pl-2 pr-3 border-l border-gray-300 bg-transparent text-gray-500 focus:ring-0 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="JMD">JMD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={currentUpload.description}
                onChange={(e) => setCurrentUpload(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
                placeholder="Enter any additional information about the invoice..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Files *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0f4d8a] transition-colors">
                <input
                  id="invoice-files"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="invoice-files" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, JPG, PNG, DOC up to 10MB each
                  </p>
                </label>
              </div>

              {/* File List */}
              {currentUpload.invoice_files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                  {currentUpload.invoice_files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add to List Button */}
            <button
              onClick={addUploadToList}
              disabled={!currentUpload.tracking_number || currentUpload.price_paid <= 0 || currentUpload.invoice_files.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0f4d8a] text-white rounded-lg font-medium hover:bg-[#0e447d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add to Upload List
            </button>
          </div>
        </div>

        {/* Upload List */}
        {uploads.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Upload Queue ({uploads.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {uploads.map((upload, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{upload.tracking_number}</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(upload.price_paid, upload.currency)}
                        </p>
                        {upload.description && (
                          <p className="text-sm text-gray-500 mt-1">{upload.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeUpload(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FileText className="h-4 w-4" />
                      {upload.invoice_files.length} file(s)
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmitAll}
                disabled={uploading}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload All Invoices
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
