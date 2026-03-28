"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Package, MapPin } from "lucide-react";
import { renderToString } from "react-dom/server";

interface LocationPoint {
  lat: number;
  lng: number;
  address?: string;
  status?: string;
  timestamp?: string;
}

interface TrackingMapProps {
  currentLocation: LocationPoint;
  history?: LocationPoint[];
  trackingNumber: string;
  status: string;
}

export default function TrackingMap({ 
  currentLocation, 
  history = [], 
  trackingNumber, 
  status 
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map
    const map = L.map(mapRef.current).setView([currentLocation.lat, currentLocation.lng], 12);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create custom icons using Lucide icons
    const currentIconHtml = renderToString(
      <div className="relative">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rotate-45"></div>
      </div>
    );

    const historyIconHtml = renderToString(
      <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center border-2 border-white shadow">
        <MapPin className="w-3 h-3 text-white" />
      </div>
    );

    const currentIcon = L.divIcon({
      className: "custom-marker",
      html: currentIconHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    const historyIcon = L.divIcon({
      className: "custom-marker",
      html: historyIconHtml,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // Add current location marker
    const currentPopupContent = `
      <div class="p-2 min-w-[200px]">
        <h3 class="font-bold text-lg mb-1">${trackingNumber}</h3>
        <p class="text-sm text-gray-600 mb-2">Status: <span class="font-semibold text-blue-600">${status}</span></p>
        ${currentLocation.address ? `<p class="text-sm text-gray-500 mb-1">📍 ${currentLocation.address}</p>` : ''}
        <p class="text-xs text-gray-400">Updated: ${new Date().toLocaleString()}</p>
      </div>
    `;

    L.marker([currentLocation.lat, currentLocation.lng], { icon: currentIcon })
      .addTo(map)
      .bindPopup(currentPopupContent);

    // Add history markers
    const validHistory = history.filter(h => h.lat && h.lng);
    
    validHistory.forEach((point, index) => {
      const popupContent = `
        <div class="p-2">
          <p class="font-semibold text-sm">${point.status || 'Location Update'}</p>
          ${point.address ? `<p class="text-xs text-gray-500">📍 ${point.address}</p>` : ''}
          ${point.timestamp ? `<p class="text-xs text-gray-400 mt-1">${new Date(point.timestamp).toLocaleString()}</p>` : ''}
        </div>
      `;

      L.marker([point.lat, point.lng], { icon: historyIcon })
        .addTo(map)
        .bindPopup(popupContent);
    });

    // Draw route line if we have history
    if (validHistory.length > 0) {
      const routePoints = [
        [currentLocation.lat, currentLocation.lng],
        ...validHistory.map(h => [h.lat, h.lng])
      ] as L.LatLngExpression[];

      L.polyline(routePoints, {
        color: '#3B82F6',
        weight: 3,
        opacity: 0.6,
        dashArray: '10, 10',
      }).addTo(map);

      // Fit bounds to show all points
      const bounds = L.latLngBounds(routePoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [currentLocation, history, trackingNumber, status]);

  return (
    <div className="w-full">
      <div ref={mapRef} className="w-full h-80 rounded-lg border" />
      
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <Package className="w-2.5 h-2.5 text-white" />
          </div>
          <span>Current Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span>Past Locations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500 border-dashed"></div>
          <span>Route</span>
        </div>
      </div>
    </div>
  );
}
