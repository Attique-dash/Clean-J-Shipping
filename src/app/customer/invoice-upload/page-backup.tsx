"use client";

import { useState, useEffect } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "react-toastify";
import { 
  Upload, 
  FileText, 
  DollarSign, 
  Package, 
  Plus, 
  X, 
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface PackageData {
  tracking_number: string;
  description?: string;
  weight?: string;
  status: string;
  current_location?: string;
  invoice_status?: string;
  invoice_uploaded_date?: string;
}

interface InvoiceUpload {
  tracking_number: string;
  price_paid: number;
  currency: string;
  invoice_files: File[];
  description?: string;
  item_description?: string;
  item_category?: string;
  item_quantity?: number;
  hs_code?: string;
  declared_value?: number;
  supplier_name?: string;
  supplier_address?: string;
  purchase_date?: string;
}

export default function CustomerInvoiceUploadPage() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { selectedCurrency: globalCurrency, formatCurrency } = useCurrency();
  
  const [uploads, setUploads] = useState<InvoiceUpload[]>([]);
  const [currentUpload, setCurrentUpload] = useState<InvoiceUpload>({
    tracking_number: "",
    price_paid: 0,
    currency: globalCurrency,
    invoice_files: [],
    description: "",
    item_description: "",
    item_category: "",
    item_quantity: 1,
    hs_code: "",
    declared_value: 0,
    supplier_name: "",
    supplier_address: "",
    purchase_date: new Date().toISOString().split('T')[0]
  });

  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024;
      
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds the 10MB size limit`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      setCurrentUpload(prev => ({
        ...prev,
        invoice_files: [...prev.invoice_files, ...validFiles]
      }));
      toast.success(`${validFiles.length} file(s) added successfully`);
    }
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
      description: "",
      item_description: "",
      item_category: "",
      item_quantity: 1,
      hs_code: "",
      declared_value: 0,
      supplier_name: "",
      supplier_address: "",
      purchase_date: new Date().toISOString().split('T')[0]
    });
    
    const fileInput = document.getElementById("invoice-files") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    
    toast.success("Package added to upload list");
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const getInvoiceStatusBadge = (status?: string) => {
    switch (status) {
      case "uploaded":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Invoice Uploaded
          </span>
        );
      case "submitted":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Invoice Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved by Customs
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Invoice Required
          </span>
        );
    }
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
        upload.invoice_files.forEach((file: File, fileIndex: number) => {
          formData.append(`files_${index}`, file);
        });
        formData.append(`upload_${index}`, JSON.stringify({
          tracking_number: upload.tracking_number,
          price_paid: upload.price_paid,
          currency: upload.currency,
          description: upload.description,
          item_description: upload.item_description,
          item_category: upload.item_category,
          item_quantity: upload.item_quantity,
          hs_code: upload.hs_code,
          declared_value: upload.declared_value,
          supplier_name: upload.supplier_name,
          supplier_address: upload.supplier_address,
          purchase_date: upload.purchase_date
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Upload className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Invoice Upload</h1>
                <p className="text-sm text-gray-500">Upload your package invoices and documents</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {packages.length} packages available
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Package Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Select Package</h2>
                <p className="text-sm text-gray-500 mt-1">Choose a package to upload invoice</p>
              </div>
              <div className="p-6">
                {packages.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No packages available</p>
                    <p className="text-sm text-gray-500 mt-1">Packages will appear here once received</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {packages.map((pkg) => (
                      <div 
                        key={pkg.tracking_number} 
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          currentUpload.tracking_number === pkg.tracking_number 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCurrentUpload(prev => ({ ...prev, tracking_number: pkg.tracking_number }))}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-blue-600" />
                              <span className="font-mono text-sm font-medium">{pkg.tracking_number}</span>
                            </div>
                            {pkg.description && (
                              <p className="text-xs text-gray-600 mb-1">{pkg.description}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {pkg.status}
                              </span>
                              {getInvoiceStatusBadge(pkg.invoice_status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Upload Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Invoice Details</h2>
                <p className="text-sm text-gray-500 mt-1">Enter invoice information and upload documents</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price Paid *</label>
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
                        className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Description *</label>
                    <input
                      type="text"
                      value={currentUpload.item_description}
                      onChange={(e) => setCurrentUpload(prev => ({ ...prev, item_description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the items"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Category</label>
                    <select
                      value={currentUpload.item_category}
                      onChange={(e) => setCurrentUpload(prev => ({ ...prev, item_category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select category...</option>
                      <option value="electronics">Electronics</option>
                      <option value="clothing">Clothing & Accessories</option>
                      <option value="books">Books & Media</option>
                      <option value="home">Home & Garden</option>
                      <option value="health">Health & Beauty</option>
                      <option value="sports">Sports & Outdoors</option>
                      <option value="toys">Toys & Games</option>
                      <option value="food">Food & Beverages</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={currentUpload.item_quantity}
                      onChange={(e) => setCurrentUpload(prev => ({ ...prev, item_quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Declared Value ({currentUpload.currency}) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentUpload.declared_value}
                      onChange={(e) => setCurrentUpload(prev => ({ ...prev, declared_value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                    <input
                      type="date"
                      value={currentUpload.purchase_date}
                      onChange={(e) => setCurrentUpload(prev => ({ ...prev, purchase_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Supplier Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier/Seller Name</label>
                    <input
                      type="text"
                      value={currentUpload.supplier_name}
                      onChange={(e) => setCurrentUpload(prev => ({ ...prev, supplier_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Store or seller name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">HS Code (Optional)</label>
                    <input
                      type="text"
                      value={currentUpload.hs_code}
                      onChange={(e) => setCurrentUpload(prev => ({ ...prev, hs_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 8517.12.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Address</label>
                  <input
                    type="text"
                    value={currentUpload.supplier_address}
                    onChange={(e) => setCurrentUpload(prev => ({ ...prev, supplier_address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Supplier address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                  <textarea
                    value={currentUpload.description}
                    onChange={(e) => setCurrentUpload(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter any additional information..."
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Files *</label>
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                       isDragging 
                         ? 'border-blue-500 bg-blue-50' 
                         : 'border-gray-300 hover:border-gray-400'
                   }`}
                   onDragOver={handleDragOver}
                   onDragLeave={handleDragLeave}
                   onDrop={handleDrop}>
                    <input
                      id="invoice-files"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="invoice-files" className="cursor-pointer">
                      <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
                        isDragging ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <p className="text-sm text-gray-600">
                        {isDragging ? 'Drop files here...' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, JPG, PNG, DOC up to 10MB each
                      </p>
                    </label>
                  </div>

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
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Add to Upload List
                </button>
              </div>
            </div>

            {/* Upload Queue */}
            {uploads.length > 0 && (
              <div className="bg-white rounded-lg shadow mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Upload Queue ({uploads.length})</h2>
                  <p className="text-sm text-gray-500 mt-1">Packages ready to upload</p>
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
                    className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>
    </div>
  );
}
