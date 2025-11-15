'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileText, 
  Loader2, 
  Printer, 
  Search, 
  X, 
  Package,
  User,
  Weight,
  Calendar,
  Filter,
  FileCheck,
  Eye,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  Warehouse
} from 'lucide-react';
import { generateInvoicePdf, downloadPdf, openPrintWindow, getBase64FromUrl } from '@/lib/invoice';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface Package {
  _id: string;
  tracking_number: string;
  user_code: string;
  description: string;
  weight: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceData {
  client: {
    company: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
  };
  sender: {
    company: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
  };
  information: {
    number: string;
    date: string;
    'due-date': string;
  };
  products: Array<{
    quantity: number;
    description: string;
    'tax-rate': number;
    price: number;
  }>;
  'bottom-notice'?: string;
  settings: {
    currency: string;
    'tax-notation'?: string;
    'margin-top'?: number;
    'margin-right'?: number;
    'margin-left'?: number;
    'margin-bottom'?: number;
  };
  'tax-notation'?: string;
  logo?: string;
}

export default function InvoiceGenerator() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch packages on component mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/packages');
        if (!response.ok) throw new Error('Failed to fetch packages');
        const data = await response.json();
        setPackages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching packages:', error);
        setPackages([]);
      } finally {
        setIsLoading(false);
        setIsMounted(true);
      }
    };

    fetchPackages();
  }, []);

  // Filter packages
  const filteredPackages = (packages || []).filter(pkg => {
    if (!pkg) return false;
    const matchesSearch = (pkg.tracking_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (pkg.user_code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isMounted) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0f4d8a]" />
          <p className="mt-4 text-sm font-medium text-gray-600">Loading invoice generator...</p>
        </div>
      </div>
    );
  }

  const generateInvoice = async (pkg: Package) => {
    if (!pkg) return;
    
    try {
      setIsGenerating(true);
      setSelectedPackage(pkg);
      
      const logoBase64 = await getBase64FromUrl('/images/logo.png');
      
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 30);
      
      const invoiceData: InvoiceData = {
        client: {
          company: 'Customer',
          address: '123 Customer St',
          zip: '12345',
          city: 'Customer City',
          country: 'USA',
          email: 'customer@example.com',
          phone: '+1 234 567 8901'
        },
        sender: {
          company: 'Your Shipping Company',
          address: '456 Business Ave',
          zip: '67890',
          city: 'Business City',
          country: 'USA',
          email: 'billing@yourshipping.com',
          phone: '+1 800 123 4567'
        },
        information: {
          number: `INV-${pkg.tracking_number}`,
          date: format(today, 'yyyy-MM-dd'),
          'due-date': format(dueDate, 'yyyy-MM-dd')
        },
        products: [
          {
            quantity: 1,
            description: `Shipping for Package #${pkg.tracking_number}`,
            'tax-rate': 0,
            price: pkg.weight ? pkg.weight * 5 : 50
          },
          {
            quantity: 1,
            description: 'Handling Fee',
            'tax-rate': 0,
            price: 10
          }
        ],
        'bottom-notice': 'Thank you for your business!',
        settings: {
          currency: 'USD',
          'tax-notation': 'vat',
          'margin-top': 50,
          'margin-right': 50,
          'margin-left': 50,
          'margin-bottom': 50
        },
        'tax-notation': 'vat',
        logo: logoBase64
      };

      const pdf = await generateInvoicePdf(invoiceData);
      setInvoiceUrl(pdf);
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadInvoice = () => {
    if (!invoiceUrl) return;
    downloadPdf(invoiceUrl, 'invoice');
  };

  const printInvoice = () => {
    if (!invoiceUrl) return;
    openPrintWindow(invoiceUrl);
  };

  const statusConfig = {
    'At Warehouse': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Warehouse },
    'In Transit': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
    'Delivered': { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle2 },
    'Ready for Pickup': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock }
  };

  const stats = {
    total: packages.length,
    filtered: filteredPackages.length,
    atWarehouse: packages.filter(p => p.status === 'At Warehouse').length,
    inTransit: packages.filter(p => p.status === 'In Transit').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Invoice Generator</h2>
                <p className="mt-1 text-sm text-blue-100">Create and manage customer invoices</p>
              </div>
            </div>
          </div>
          
          {invoiceUrl && (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={downloadInvoice}
                className="group flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-4 py-2 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-lg"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button 
                onClick={printInvoice}
                className="group flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-4 py-2 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-lg"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button 
                onClick={() => {
                  setInvoiceUrl(null);
                  setSelectedPackage(null);
                }}
                className="group flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-[#0f4d8a] shadow-lg transition-all hover:shadow-xl"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        {!invoiceUrl && (
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Packages" value={stats.total} />
            <StatCard label="Filtered" value={stats.filtered} />
            <StatCard label="At Warehouse" value={stats.atWarehouse} />
            <StatCard label="In Transit" value={stats.inTransit} />
          </div>
        )}
      </div>
      
      {!invoiceUrl ? (
        <div className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by tracking number or user code..."
                  className="h-12 rounded-xl border-2 border-gray-200 pl-12 pr-4 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 w-[200px] rounded-xl border-2 border-gray-200 font-medium transition-all focus:border-[#0f4d8a] focus:ring-2 focus:ring-[#0f4d8a]/20">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="At Warehouse">At Warehouse</SelectItem>
                    <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Packages Grid - Card View for Mobile, Table for Desktop */}
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-white">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          <Package className="h-4 w-4" />
                          Tracking #
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          <User className="h-4 w-4" />
                          Customer
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          <FileText className="h-4 w-4" />
                          Description
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          <Weight className="h-4 w-4" />
                          Weight
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Status
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0f4d8a]" />
                          <p className="mt-3 text-sm font-medium text-gray-600">Loading packages...</p>
                        </td>
                      </tr>
                    ) : filteredPackages.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Package className="mx-auto h-12 w-12 text-gray-300" />
                          <p className="mt-3 text-sm font-medium text-gray-600">No packages found</p>
                          <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPackages.map((pkg) => {
                        const status = statusConfig[pkg.status as keyof typeof statusConfig] || { 
                          color: 'bg-gray-100 text-gray-700 border-gray-200', 
                          icon: Clock 
                        };
                        const StatusIcon = status.icon;
                        
                        return (
                          <tr key={pkg._id} className="transition-colors hover:bg-gray-50">
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="font-bold text-gray-900">{pkg.tracking_number}</span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="font-medium text-gray-700">{pkg.user_code}</span>
                            </td>
                            <td className="max-w-xs truncate px-6 py-4">
                              <span className="text-sm text-gray-600">{pkg.description || 'No description'}</span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="font-semibold text-gray-900">{pkg.weight ? `${pkg.weight} kg` : 'N/A'}</span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${status.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {pkg.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right">
                              <button
                                onClick={() => generateInvoice(pkg)}
                                disabled={isGenerating}
                                className="group inline-flex items-center gap-2 rounded-xl border-2 border-[#0f4d8a] bg-[#0f4d8a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0e447d] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isGenerating && selectedPackage?._id === pkg._id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <FileCheck className="h-4 w-4" />
                                    Generate
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-4 lg:hidden">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0f4d8a]" />
                    <p className="mt-3 text-sm font-medium text-gray-600">Loading packages...</p>
                  </div>
                </div>
              ) : filteredPackages.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8">
                  <Package className="h-16 w-16 text-gray-300" />
                  <p className="mt-4 text-sm font-medium text-gray-600">No packages found</p>
                  <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredPackages.map((pkg) => {
                  const status = statusConfig[pkg.status as keyof typeof statusConfig] || { 
                    color: 'bg-gray-100 text-gray-700 border-gray-200', 
                    icon: Clock 
                  };
                  const StatusIcon = status.icon;
                  
                  return (
                    <div key={pkg._id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4d8a] to-[#0e7893] shadow-md">
                              <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{pkg.tracking_number}</div>
                              <div className="text-sm text-gray-600">{pkg.user_code}</div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {pkg.status}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FileText className="h-4 w-4" />
                            <span className="truncate">{pkg.description || 'No description'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Weight className="h-4 w-4" />
                            <span className="font-semibold">{pkg.weight ? `${pkg.weight} kg` : 'N/A'}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => generateInvoice(pkg)}
                          disabled={isGenerating}
                          className="w-full rounded-xl border-2 border-[#0f4d8a] bg-[#0f4d8a] px-4 py-3 font-semibold text-white transition-all hover:bg-[#0e447d] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isGenerating && selectedPackage?._id === pkg._id ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating Invoice...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <FileCheck className="h-4 w-4" />
                              Generate Invoice
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Invoice Preview</h3>
                <p className="text-sm text-gray-600">
                  Generated for {selectedPackage?.tracking_number}
                </p>
              </div>
            </div>
          </div>
          <div className="relative h-[80vh] w-full overflow-hidden bg-gray-100">
            <iframe 
              ref={iframeRef}
              src={invoiceUrl} 
              className="h-full w-full border-0"
              title="Invoice Preview"
              onError={() => {
                console.error('Error loading invoice preview');
                downloadInvoice();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4">
      <div className="text-xs font-medium text-blue-100">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}