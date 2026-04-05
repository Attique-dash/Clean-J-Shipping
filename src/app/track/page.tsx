'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Package, ArrowRight } from 'lucide-react';

function TrackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(searchParams?.get('q') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    // Navigate to the tracking result page
    router.push(`/track/${encodeURIComponent(trackingNumber.trim())}`);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl mx-auto text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600">
            <Package className="h-8 w-8" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
          Track Your Shipment
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Enter your tracking number to get real-time updates on your package location and delivery status
        </p>

        {/* Search Form */}
        <form onSubmit={handleTrack} className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter tracking number (e.g., ABC123456789)"
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  if (error) setError('');
                }}
                className="h-14 text-lg px-4"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-500 text-left">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              size="lg"
              className="h-14 px-8 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Track
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          <div className="bg-muted/50 p-4 rounded-lg text-left">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Where is my tracking number?
            </h3>
            <p className="text-sm text-muted-foreground">
              Your tracking number can be found in your shipping confirmation email or receipt.
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-left">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              Need help tracking?
            </h3>
            <p className="text-sm text-muted-foreground">
              Contact our support team for assistance with your shipment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <TrackPageContent />
    </Suspense>
  );
}
