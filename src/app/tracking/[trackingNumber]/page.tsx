'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Loader2, 
  MapPin, 
  Clock, 
  Package, 
  CheckCircle2, 
  X,
  Navigation,
  Truck,
  Home,
  AlertCircle,
  RefreshCw,
  Radio,
  Phone,
  User,
  Weight,
  Calendar
} from 'lucide-react';
import { useRealTimeTracking } from '@/hooks/useRealTimeTracking';
import { useNotification } from '@/contexts/NotificationContext';
import dynamic from 'next/dynamic';

// Dynamic import for map to avoid SSR issues
const TrackingMap = dynamic(() => import('@/components/tracking/TrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

type Status = 'pending' | 'received' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'returned' | 'lost' | 'damaged';

interface Location {
  lat?: number;
  lng?: number;
  address?: string;
}

interface StatusUpdate {
  status: string;
  statusCode?: string;
  location?: Location;
  address?: string;
  timestamp: string;
  description?: string;
  scanType?: string;
  scanLocation?: string;
  performedBy?: string;
}

interface ShipmentData {
  trackingNumber: string;
  referenceNumber?: string;
  status: Status;
  statusReason?: string;
  statusHistory: StatusUpdate[];
  currentLocation?: {
    lat?: number;
    lng?: number;
    address?: string;
    lastUpdated: string;
  };
  package: {
    description: string;
    weight: number;
    weightUnit: string;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    quantity: number;
    category?: string;
    value?: number;
    isFragile: boolean;
    isHazardous: boolean;
    packageType: string;
    serviceType: string;
  };
  sender: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  receiver: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  estimatedDelivery?: string;
  actualDelivery?: string;
  pickupDate?: string;
  dateReceived?: string;
  warehouseLocation?: string;
  manifest?: {
    number: string;
    status: string;
    origin: string;
    destination: string;
    estimatedArrival?: string;
  };
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: ReactNode; bgColor: string }> = {
  pending: { 
    label: 'Pending', 
    color: 'text-yellow-700', 
    icon: <Clock className="h-5 w-5" />,
    bgColor: 'bg-yellow-100'
  },
  received: { 
    label: 'Received', 
    color: 'text-blue-700', 
    icon: <Package className="h-5 w-5" />,
    bgColor: 'bg-blue-100'
  },
  in_transit: { 
    label: 'In Transit', 
    color: 'text-indigo-700', 
    icon: <Truck className="h-5 w-5" />,
    bgColor: 'bg-indigo-100'
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    color: 'text-purple-700', 
    icon: <Navigation className="h-5 w-5" />,
    bgColor: 'bg-purple-100'
  },
  delivered: { 
    label: 'Delivered', 
    color: 'text-green-700', 
    icon: <CheckCircle2 className="h-5 w-5" />,
    bgColor: 'bg-green-100'
  },
  exception: { 
    label: 'Exception', 
    color: 'text-red-700', 
    icon: <AlertCircle className="h-5 w-5" />,
    bgColor: 'bg-red-100'
  },
  returned: { 
    label: 'Returned', 
    color: 'text-orange-700', 
    icon: <X className="h-5 w-5" />,
    bgColor: 'bg-orange-100'
  },
  lost: { 
    label: 'Lost', 
    color: 'text-gray-700', 
    icon: <X className="h-5 w-5" />,
    bgColor: 'bg-gray-100'
  },
  damaged: { 
    label: 'Damaged', 
    color: 'text-red-700', 
    icon: <AlertCircle className="h-5 w-5" />,
    bgColor: 'bg-red-100'
  },
};

export default function TrackingResultPage() {
  const params = useParams() as { trackingNumber?: string | string[] } | null;
  const router = useRouter();
  const { addNotification } = useNotification();
  
  const trackingNumber = Array.isArray(params?.trackingNumber)
    ? params?.trackingNumber[0]
    : params?.trackingNumber;

  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const handleUpdate = useCallback((data: any) => {
    if (data) {
      setShipment(data);
      setIsInitialLoading(false);
    }
  }, []);

  const handleStatusChange = useCallback((newStatus: string, oldStatus?: string) => {
    if (oldStatus && newStatus !== oldStatus) {
      addNotification(`Package status updated from ${oldStatus} to ${newStatus}`, 'info');
    }
  }, [addNotification]);

  const { data: trackingData, isLoading, isLive, isConnected, refresh } = useRealTimeTracking({
    trackingNumber: trackingNumber || '',
    onUpdate: handleUpdate,
    onStatusChange: handleStatusChange,
    enablePolling: true,
    pollingInterval: 30000,
  });

  useEffect(() => {
    if (trackingData && isInitialLoading) {
      setShipment(trackingData as ShipmentData);
      setIsInitialLoading(false);
    }
  }, [trackingData, isInitialLoading]);

  if (isInitialLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading shipment details...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => router.push('/tracking')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Shipment Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find a shipment with that tracking number.
          </p>
          <Button onClick={() => router.push('/tracking')}>
            Track Another Shipment
          </Button>
        </div>
      </div>
    );
  }

  const currentStatus = shipment.status;
  const statusInfo = statusConfig[currentStatus] || { 
    label: currentStatus, 
    color: 'text-gray-700',
    icon: <Package className="h-5 w-5" />,
    bgColor: 'bg-gray-100'
  };

  const hasCoordinates = shipment.currentLocation?.lat && shipment.currentLocation?.lng;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/tracking')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tracking
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
            {isLive && isConnected ? (
              <>
                <Radio className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Live</span>
              </>
            ) : (
              <>
                <Radio className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Polling</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Tracking Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Package className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-2xl">
                  Tracking #: {shipment.trackingNumber}
                </CardTitle>
              </div>
              {shipment.referenceNumber && (
                <CardDescription className="ml-9">
                  Reference: {shipment.referenceNumber}
                </CardDescription>
              )}
            </div>
            
            <div className={`px-4 py-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.color} flex items-center gap-2`}>
              {statusInfo.icon}
              <span className="font-semibold">{statusInfo.label}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Current Location</span>
              </div>
              <p className="font-medium">
                {shipment.currentLocation?.address || shipment.warehouseLocation || 'Location not available'}
              </p>
              {shipment.currentLocation?.lastUpdated && (
                <p className="text-sm text-muted-foreground">
                  Updated: {new Date(shipment.currentLocation.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>

            {/* Estimated Delivery */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {shipment.actualDelivery ? 'Delivered On' : 'Estimated Delivery'}
                </span>
              </div>
              <p className="font-medium">
                {shipment.actualDelivery 
                  ? new Date(shipment.actualDelivery).toLocaleDateString()
                  : shipment.estimatedDelivery 
                    ? new Date(shipment.estimatedDelivery).toLocaleDateString()
                    : 'Not available'
                }
              </p>
              {shipment.manifest?.estimatedArrival && !shipment.actualDelivery && (
                <p className="text-sm text-muted-foreground">
                  Manifest ETA: {new Date(shipment.manifest.estimatedArrival).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Package Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Weight className="h-4 w-4" />
                <span className="text-sm font-medium">Package Details</span>
              </div>
              <p className="font-medium">{shipment.package.weight} {shipment.package.weightUnit}</p>
              <p className="text-sm text-muted-foreground">
                {shipment.package.description}
              </p>
              {shipment.package.dimensions && (
                <p className="text-sm text-muted-foreground">
                  Dimensions: {shipment.package.dimensions.length}×{shipment.package.dimensions.width}×{shipment.package.dimensions.height} {shipment.package.dimensions.unit}
                </p>
              )}
            </div>
          </div>

          {shipment.statusReason && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Status Note</p>
                  <p className="text-sm text-yellow-700">{shipment.statusReason}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Section */}
      {hasCoordinates && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Live Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrackingMap 
              currentLocation={{
                lat: shipment.currentLocation!.lat!,
                lng: shipment.currentLocation!.lng!,
                address: shipment.currentLocation?.address,
              }}
              history={shipment.statusHistory
                .filter(h => h.location?.lat && h.location?.lng)
                .map(h => ({
                  lat: h.location!.lat!,
                  lng: h.location!.lng!,
                  address: h.location?.address,
                  status: h.status,
                  timestamp: h.timestamp,
                }))
              }
              trackingNumber={shipment.trackingNumber}
              status={shipment.status}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tracking Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tracking History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              
              <div className="space-y-6">
                {shipment.statusHistory.map((update, index) => {
                  const sInfo = statusConfig[update.status] || statusConfig['pending'];
                  const isLatest = index === 0;
                  
                  return (
                    <div key={index} className="relative pl-12">
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isLatest ? 'bg-blue-500 text-white' : 'bg-gray-100'
                      }`}>
                        {isLatest ? (
                          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${sInfo.bgColor.replace('bg-', 'bg-').replace('100', '400')}`} />
                        )}
                      </div>
                      
                      <div className={`p-4 rounded-lg border ${isLatest ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className={sInfo.bgColor + ' ' + sInfo.color}>
                                {sInfo.label}
                              </Badge>
                              {isLatest && (
                                <Badge variant="default" className="bg-blue-500">Latest</Badge>
                              )}
                            </div>
                            
                            {update.description && (
                              <p className="text-sm text-gray-700 mt-1">{update.description}</p>
                            )}
                            
                            {update.location?.address && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                                <MapPin className="h-3 w-3" />
                                {update.location.address}
                              </div>
                            )}
                            
                            {update.scanLocation && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Navigation className="h-3 w-3" />
                                Facility: {update.scanLocation}
                              </div>
                            )}
                            
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(update.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {shipment.statusHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tracking history available</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sender & Receiver Info */}
        <div className="space-y-6">
          {/* Sender */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Sender Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{shipment.sender.name}</p>
              {shipment.sender.company && (
                <p className="text-sm text-muted-foreground">{shipment.sender.company}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3" />
                {shipment.sender.address}, {shipment.sender.city}, {shipment.sender.state}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3" />
                {shipment.sender.phone}
              </div>
            </CardContent>
          </Card>

          {/* Receiver */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />
                Receiver Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{shipment.receiver.name}</p>
              {shipment.receiver.company && (
                <p className="text-sm text-muted-foreground">{shipment.receiver.company}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3" />
                {shipment.receiver.address}, {shipment.receiver.city}, {shipment.receiver.state}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3" />
                {shipment.receiver.phone}
              </div>
            </CardContent>
          </Card>

          {/* Manifest Info */}
          {shipment.manifest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Manifest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Manifest #:</span>{' '}
                  <span className="font-medium">{shipment.manifest.number}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Route:</span>{' '}
                  <span className="font-medium">{shipment.manifest.origin} → {shipment.manifest.destination}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant="outline">{shipment.manifest.status}</Badge>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={shipment.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                  {shipment.paymentStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="font-medium">${shipment.totalAmount?.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
