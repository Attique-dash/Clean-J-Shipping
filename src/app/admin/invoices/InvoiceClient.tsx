'use client';

import dynamic from 'next/dynamic';
import { Loader2, FileText } from 'lucide-react';

// Dynamically import the InvoiceGenerator component with SSR disabled
const InvoiceGenerator = dynamic(
  () => import('@/components/InvoiceGenerator'),
  { 
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Invoice Generator</h2>
                <p className="mt-1 text-sm text-blue-100">Loading invoice system...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="text-center">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-[#0f4d8a]" />
            <p className="mt-4 text-lg font-semibold text-gray-900">Loading Invoice Generator</p>
            <p className="mt-2 text-sm text-gray-600">Please wait while we prepare the invoice system...</p>
            
            {/* Loading Progress Animation */}
            <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#0f4d8a] to-[#0e7893]" />
            </div>
          </div>
        </div>
      </div>
    )
  }
);

export default function InvoiceClient() {
  return <InvoiceGenerator />;
}