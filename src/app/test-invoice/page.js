'use client';
import { useState } from 'react';

export default function TestInvoice() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const testData = {
        sender: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          address: '123 Main St, New York, NY 10001, USA'
        },
        receiver: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '987-654-3210',
          address: '456 Oak Ave, Los Angeles, CA 90001, USA'
        },
        weight: 5,
        dimensions: {
          length: 20,
          width: 15,
          height: 10
        },
        description: 'Test Package',
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        insuranceRequired: true,
        customsFee: 25.50
      };

      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          message: 'Shipment and invoice created successfully!',
          trackingNumber: data.data.trackingNumber,
          invoiceUrl: data.data.invoiceUrl,
          invoiceNumber: data.data.invoiceNumber
        });
      } else {
        throw new Error(data.error || 'Failed to create shipment');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Invoice Generation</h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    This page helps you test the invoice generation functionality. Click the button below to create a test shipment and generate an invoice.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={testInvoice}
                disabled={loading}
                className={`px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Processing...' : 'Generate Test Invoice'}
              </button>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Success!</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>{result.message}</p>
                      <div className="mt-2 space-y-1">
                        <p>Tracking Number: <span className="font-medium">{result.trackingNumber}</span></p>
                        <p>Invoice Number: <span className="font-medium">{result.invoiceNumber}</span></p>
                        <p>
                          Invoice: 
                          <a 
                            href={result.invoiceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 underline"
                          >
                            View Invoice
                          </a>
                        </p>
                        <p>
                          <a 
                            href={`/track/${result.trackingNumber}`}
                            className="text-indigo-600 hover:text-indigo-800 underline"
                          >
                            Track Shipment
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
