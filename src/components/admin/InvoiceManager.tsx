'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Download, 
  Eye, 
  Send, 
  Plus, 
  Edit,
  Package,
  DollarSign,
  Calendar
} from 'lucide-react';

interface PackageData {
  _id: string;
  trackingNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    userCode: string;
  };
  weight: number;
  shipper: string;
  description: string;
  status: string;
  shippingCost: number;
  totalAmount: number;
  entryDate: string;
  invoiceGenerated?: boolean;
  invoiceNumber?: string;
  paymentLink?: string;
  regularCharge?: number;
  customCharge?: number;
  chargeCurrency?: string;
}

export default function InvoiceManager() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [regularCharge, setRegularCharge] = useState('');
  const [customCharge, setCustomCharge] = useState('');
  const [chargeCurrency, setChargeCurrency] = useState('JMD');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/packages');
      const data = await response.json();
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (pkg: PackageData) => {
    try {
      // First update the package with the charges using PUT method
      const updateResponse = await fetch(`/api/admin/packages/${pkg._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regularCharge: parseFloat(regularCharge) || 0,
          customCharge: parseFloat(customCharge) || 0,
          chargeCurrency: chargeCurrency
        })
      });

      if (!updateResponse.ok) {
        alert('Error updating package charges');
        return;
      }

      // Then generate the invoice
      const response = await fetch(`/api/admin/packages/${pkg._id}/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // No body needed - uses package's regularCharge and customCharge
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Invoice ${result.invoice_number} generated successfully!`);
        setShowChargeModal(false);
        fetchPackages(); // Refresh data
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error generating invoice');
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.customer.userCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${pkg.customer.firstName} ${pkg.customer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-gray-600">Generate and manage invoices for received packages</p>
        </div>
        <Button onClick={fetchPackages} variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by tracking number, customer code, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Packages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Packages ({filteredPackages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading packages...</p>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No packages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Tracking #</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Shipper</th>
                    <th className="text-left py-3 px-4">Weight</th>
                    <th className="text-left py-3 px-4">Shipping Cost</th>
                    <th className="text-left py-3 px-4">Goods Cost</th>
                    <th className="text-left py-3 px-4">Total</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Invoice</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium">{pkg.trackingNumber}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {pkg.customer.firstName} {pkg.customer.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{pkg.customer.userCode}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{pkg.shipper}</td>
                      <td className="py-3 px-4">{pkg.weight} kg</td>
                      <td className="py-3 px-4">
                        {pkg.regularCharge ? `${pkg.chargeCurrency || 'JMD'} ${pkg.regularCharge.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {pkg.customCharge ? `${pkg.chargeCurrency || 'JMD'} ${pkg.customCharge.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {pkg.chargeCurrency || 'JMD'} {((pkg.regularCharge || 0) + (pkg.customCharge || 0)).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          pkg.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : pkg.status === 'received'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {pkg.invoiceGenerated ? (
                          <div>
                            <p className="text-sm font-medium text-green-600">
                              {pkg.invoiceNumber}
                            </p>
                            {pkg.paymentLink && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(pkg.paymentLink!)}
                                className="p-0 h-auto text-xs"
                              >
                                Copy Link
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600">
                            Not Generated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {!pkg.invoiceGenerated && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPackage(pkg);
                                setShowChargeModal(true);
                                setRegularCharge(pkg.regularCharge?.toString() || '');
                                setCustomCharge(pkg.customCharge?.toString() || '');
                                setChargeCurrency(pkg.chargeCurrency || 'JMD');
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Invoice
                            </Button>
                          )}
                          {pkg.invoiceGenerated && pkg.paymentLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(pkg.paymentLink, '_blank')}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charge Modal */}
      {showChargeModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Generate Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Package: <strong>{selectedPackage.trackingNumber}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Customer: <strong>{selectedPackage.customer.firstName} {selectedPackage.customer.lastName}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Regular Charge (JMD)</label>
                <Input
                  type="number"
                  value={regularCharge}
                  onChange={(e) => setRegularCharge(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Custom Charge (JMD)</label>
                <Input
                  type="number"
                  value={customCharge}
                  onChange={(e) => setCustomCharge(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={chargeCurrency}
                  onChange={(e) => setChargeCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="JMD">JMD</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">Total Invoice Amount:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {chargeCurrency} {((parseFloat(regularCharge) || 0) + (parseFloat(customCharge) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowChargeModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleGenerateInvoice(selectedPackage)}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Generate & Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
