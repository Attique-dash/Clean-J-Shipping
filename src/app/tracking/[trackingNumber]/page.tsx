'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin, Clock, Package, CheckCircle2, X } from 'lucide-react';

type Status = 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface StatusUpdate {
  status: Status;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  timestamp: string;
  notes?: string;
}

interface ShipmentData {
  trackingNumber: string;
  status: Status;
  statusHistory: StatusUpdate[];
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    lastUpdated: string;
  };
  package: {
    tracking_number: string;
    user_code: string;
    description: string;
    weight: number;
    status: string;
  };
}

const statusConfig: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-5 w-5" /> },
  picked_up: { label: 'Picked Up', color: 'bg-blue-100 text-blue-800', icon: <Package className="h-5 w-5" /> },
  in_transit: { label: 'In Transit', color: 'bg-indigo-100 text-indigo-800', icon: <Package className="h-5 w-5" /> },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-purple-100 text-purple-800', icon: <Package className="h-5 w-5" /> },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-5 w-5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: <X className="h-5 w-5" /> },
};

export default function TrackingResultPage() {
  const params = useParams();
  const router = useRouter();
  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        setIsLoading(true);
        const trackingNumber = Array.isArray(params.trackingNumber) 
          ? params.trackingNumber[0] 
          : params.trackingNumber;
        
        const response = await fetch(`/api/tracking/${encodeURIComponent(trackingNumber)}`);
        
        if (!response.ok) {
          throw new Error('Shipment not found');
        }
        
        const data = await response.json();
        setShipment(data);
      } catch (err) {
        setError('Could not find a shipment with that tracking number');
        console.error('Error fetching shipment:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.trackingNumber) {
      fetchShipment();
    }
  }, [params.trackingNumber]);

  const getStatusColor = (status: Status) => {
    return statusConfig[status]?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: Status) => {
    return statusConfig[status]?.label || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading shipment details...</p>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Shipment Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error || 'We couldn\'t find a shipment with that tracking number.'}
          </p>
          <Button onClick={() => router.push('/tracking')}>
            Track Another Shipment
          </Button>
        </div>
      </div>
    );
  }

  const currentStatus = shipment.status;
  const statusInfo = statusConfig[currentStatus] || { label: currentStatus, color: 'bg-gray-100' };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => router.push('/tracking')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tracking
      </Button>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                Tracking #: {shipment.trackingNumber}
              </CardTitle>
              <CardDescription className="mt-1">
                {shipment.package?.description || 'No description available'}
              </CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} flex items-center gap-1`}>
              {statusInfo.icon}
              {statusInfo.label}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Current Location</h3>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{shipment.currentLocation.address}</p>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(shipment.currentLocation.lastUpdated).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Package Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Weight:</span> {shipment.package?.weight} kg</p>
                <p><span className="text-muted-foreground">User Code:</span> {shipment.package?.user_code}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted -translate-x-1/2" />
            
            <div className="space-y-6">
              {[...shipment.statusHistory]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((update, index) => {
                  const status = update.status as Status;
                  const statusInfo = statusConfig[status] || { label: status, color: 'bg-gray-100' };
                  
                  return (
                    <div key={index} className="relative pl-10">
                      <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-muted flex items-center justify-center -translate-x-1/2">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color.replace('bg-', 'bg-opacity-100 bg-').split(' ')[0]}`} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{statusInfo.label}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(update.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{update.notes}</p>
                        {update.address && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{update.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
