'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    // Navigate to the tracking result page
    router.push(`/tracking/${encodeURIComponent(trackingNumber.trim())}`);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Track Your Shipment</h1>
        <p className="text-muted-foreground">
          Enter your tracking number to check the status of your shipment
        </p>
      </div>

      <form onSubmit={handleTrack} className="max-w-2xl mx-auto">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="h-12 text-base"
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
          <Button 
            type="submit" 
            size="lg" 
            className="px-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tracking...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Track
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="mt-12 bg-muted/50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
        <p className="text-muted-foreground">
          If you&apos;re having trouble finding your tracking number or need assistance, 
          please contact our customer support team.
        </p>
      </div>
    </div>
  );
}
