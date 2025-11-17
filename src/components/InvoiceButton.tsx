// src/components/InvoiceButton.tsx
'use client';

import { useState } from 'react';
import { invoice } from '@/lib/invoice';

export function InvoiceButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateInvoice = async () => {
    setIsLoading(true);
    try {
      const pdf = await invoice.generateInvoicePdf({
        // Your invoice data here
        client: {
          company: "Client Company",
          address: "123 Client St",
          zip: "12345",
          city: "Client City",
          country: "Client Country",
        },
        // ... other invoice data
      });
      invoice.downloadPdf(pdf, 'invoice');
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerateInvoice}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {isLoading ? 'Generating...' : 'Download Invoice'}
    </button>
  );
}