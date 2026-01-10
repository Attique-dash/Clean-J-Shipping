"use client";

import { useEffect, useState, useRef } from "react";
import { MapPin, Package, Clock, Navigation, Loader2, AlertCircle, X } from "lucide-react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
}

interface PackageTrackingData {
  trackingNumber: string;
  status: string;
  currentLocation?: Location;
  history: Array<{
    status: string;
    location?: Location;
    timestamp: Date;
  }>;
}

interface PackageTrackerProps {
  trackingNumber: string;
  onClose?: () => void;
}

export default function PackageTracker({ trackingNumber, onClose }: PackageTrackerProps) {
  const [packageData, setPackageData] = useState<PackageTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_map, setMap] = useState<L.Map | null>(null);
  const [_markers, setMarkers] = useState<L.Marker[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { socket, isConnected } = useWebSocket();

  // Load package data
  useEffect(() => {
    loadPackageData();
    
    // Subscribe to package updates via WebSocket
    if (socket && isConnected) {
      socket.emit('subscribe:packages');
      socket.emit('track:package', { trackingNumber });
      
      socket.on('package:location', (data: unknown) => {
        if ((data as { trackingNumber?: string })?.trackingNumber === trackingNumber) {
          updateLocation(data);
        }
      });
      
      socket.on('package:update', (data: unknown) => {
        const packageUpdate = data as { 
          trackingNumber?: string; 
          status?: string; 
          location?: { latitude: number; longitude: number; address?: string };
          timestamp?: string | number | Date;
        };
        if (packageUpdate.trackingNumber === trackingNumber) {
          setPackageData(prev => prev ? {
            ...prev,
            status: packageUpdate.status || prev.status,
            currentLocation: packageUpdate.location ? {
              latitude: packageUpdate.location.latitude,
              longitude: packageUpdate.location.longitude,
              address: packageUpdate.location.address,
              timestamp: packageUpdate.timestamp ? new Date(packageUpdate.timestamp) : new Date(),
            } : prev.currentLocation,
          } : null);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('package:location');
        socket.off('package:update');
      }
    };
  }, [trackingNumber, socket, isConnected, loadPackageData]);

  async function loadPackageData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customer/packages/track/${trackingNumber}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Package not found");
      setPackageData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load package data");
    } finally {
      setLoading(false);
    }
  }

  function updateLocation(data: unknown) {
    const dataWithLocation = data as { 
      location?: { latitude: number; longitude: number; address?: string };
      status?: string;
      timestamp?: string | number | Date;
    };
    if (dataWithLocation.location) {
      const timestamp = dataWithLocation.timestamp ? new Date(dataWithLocation.timestamp) : new Date();
      setPackageData(prev => prev ? {
        ...prev,
        currentLocation: {
          latitude: dataWithLocation.location!.latitude,
          longitude: dataWithLocation.location!.longitude,
          address: dataWithLocation.location!.address,
          timestamp,
        },
        history: [
          ...prev.history,
          {
            status: dataWithLocation.status || prev.status,
            location: {
              latitude: dataWithLocation.location!.latitude,
              longitude: dataWithLocation.location!.longitude,
              address: dataWithLocation.location!.address,
              timestamp,
            },
            timestamp,
          },
        ],
      } : null);
    }
  }

  // Initialize map with Leaflet
  useEffect(() => {
    if (!mapRef.current || !packageData?.currentLocation) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet map only if we have valid coordinates
    // Check if hasCoordinates flag is set, or if we have both latitude and longitude
    const hasCoordinates = (packageData.currentLocation as any)?.hasCoordinates !== false &&
                          packageData.currentLocation.latitude && 
                          packageData.currentLocation.longitude &&
                          typeof packageData.currentLocation.latitude === 'number' &&
                          typeof packageData.currentLocation.longitude === 'number' &&
                          !isNaN(packageData.currentLocation.latitude) &&
                          !isNaN(packageData.currentLocation.longitude);
    
    if (hasCoordinates) {
      const mapInstance = L.map(mapRef.current).setView(
        [packageData.currentLocation.latitude, packageData.currentLocation.longitude],
        12
      );

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Create custom icons
    const currentIcon = L.divIcon({
      className: "custom-marker-current",
      html: `<div style="background-color: #E67919; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const historyIcon = L.divIcon({
      className: "custom-marker-history",
      html: `<div style="background-color: #0f4d8a; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    // Add current location marker
    const currentMarker = L.marker(
      [packageData.currentLocation.latitude, packageData.currentLocation.longitude],
      { icon: currentIcon }
    ).addTo(mapInstance);

    const currentPopup = L.popup().setContent(`
      <div style="padding: 8px;">
        <strong>Package: ${packageData.trackingNumber}</strong><br/>
        <span>Status: ${packageData.status}</span><br/>
        ${packageData.currentLocation.address ? `<span>${packageData.currentLocation.address}</span><br/>` : ''}
        <span>Updated: ${new Date(packageData.currentLocation.timestamp).toLocaleString()}</span>
      </div>
    `);
    currentMarker.bindPopup(currentPopup);

    // Add history markers
    const historyMarkers: L.Marker[] = [];
    packageData.history.forEach((entry, _index) => {
      if (entry.location) {
        const marker = L.marker(
          [entry.location.latitude, entry.location.longitude],
          { icon: historyIcon }
        ).addTo(mapInstance);

        const popup = L.popup().setContent(`
          <div style="padding: 6px;">
            <strong>${entry.status}</strong><br/>
            ${entry.location.address ? `<span>${entry.location.address}</span><br/>` : ''}
            <span>${new Date(entry.timestamp).toLocaleString()}</span>
          </div>
        `);
        marker.bindPopup(popup);
        historyMarkers.push(marker);
      }
    });

    setMap(mapInstance);
    setMarkers([currentMarker, ...historyMarkers]);
    mapInstanceRef.current = mapInstance;

    // Fit bounds to show all markers
    if (packageData.history.length > 0 || packageData.currentLocation) {
      const bounds = L.latLngBounds([
        [packageData.currentLocation.latitude, packageData.currentLocation.longitude],
      ]);
      packageData.history.forEach(entry => {
        if (entry.location) {
          bounds.extend([entry.location.latitude, entry.location.longitude]);
        }
      });
      mapInstance.fitBounds(bounds, { padding: [20, 20] });
    }
    } // Close the if statement for valid coordinates

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [packageData?.currentLocation?.latitude, packageData?.currentLocation?.longitude, packageData?.trackingNumber, packageData?.status, packageData?.history]);

  // Show package info even without coordinates
  if (!packageData?.currentLocation?.latitude || !packageData?.currentLocation?.longitude) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Package Tracking</h3>
                <p className="text-sm text-blue-100">{trackingNumber}</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Package Info without Map */}
        <div className="p-6">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 mb-1">Location coordinates not available</p>
                <p className="text-sm text-yellow-700">The package location is being tracked, but GPS coordinates are not yet available. Status and address information is shown below.</p>
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <span className="text-sm font-semibold text-gray-900">{packageData?.status || 'Unknown'}</span>
              </div>
              {packageData?.currentLocation?.address && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Location:</span>
                  <span className="text-sm font-semibold text-gray-900">{packageData.currentLocation.address}</span>
                </div>
              )}
              {packageData?.currentLocation?.timestamp && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                  <span className="text-sm text-gray-700">{new Date(packageData.currentLocation.timestamp).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* History */}
            {packageData?.history && packageData.history.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Tracking History</h4>
                <div className="space-y-2">
                  {packageData.history.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 pb-2 border-b border-gray-200 last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{entry.status || 'Status Update'}</p>
                        {entry.location?.address && (
                          <p className="text-xs text-gray-600 mt-1">{entry.location.address}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
        <p className="text-gray-600">Package not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Package Tracking</h3>
              <p className="text-sm text-blue-100">{trackingNumber}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <span className="text-white text-xl">×</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live Tracking Active' : 'Connecting...'}
            </span>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
            {packageData.status}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={mapRef} className="w-full h-96" />
        {!packageData.currentLocation && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Location data not available</p>
            </div>
          </div>
        )}
      </div>

      {/* Location Info */}
      {packageData.currentLocation && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Navigation className="h-5 w-5 text-[#E67919]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Current Location</p>
              {packageData.currentLocation.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {packageData.currentLocation.address}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Updated: {new Date(packageData.currentLocation.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {packageData.history.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tracking History
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {packageData.history.slice().reverse().map((entry, index) => (
              <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <div className="p-1.5 bg-blue-100 rounded-full mt-0.5">
                  <MapPin className="h-3 w-3 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{entry.status}</p>
                  {entry.location?.address && (
                    <p className="text-xs text-gray-600">{entry.location.address}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

