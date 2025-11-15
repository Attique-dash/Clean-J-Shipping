'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: '/images/marker-icon.png',
  iconRetinaUrl: '/images/marker-icon-2x.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ShipmentLocation {
  lat: number;
  lng: number;
  address: string;
}

interface ActiveShipment {
  id: string;
  trackingNumber: string;
  origin: ShipmentLocation;
  destination: ShipmentLocation;
  status: string;
  estimatedDelivery: string;
  carrier: string;
}

interface ShipmentMapProps {
  shipments: ActiveShipment[];
  className?: string;
}

export function ShipmentMap({ shipments, className = 'h-96' }: ShipmentMapProps) {
  if (typeof window === 'undefined') {
    return <div className={`bg-gray-100 rounded-lg ${className}`} />;
  }

  const calculateMidpoint = (start: ShipmentLocation, end: ShipmentLocation) => ({
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit':
        return 'bg-yellow-500';
      case 'out_for_delivery':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`rounded-lg overflow-hidden shadow ${className}`}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {shipments.map((shipment) => {
          const origin = [shipment.origin.lat, shipment.origin.lng] as [number, number];
          const destination = [shipment.destination.lat, shipment.destination.lng] as [number, number];
          const midpoint = calculateMidpoint(shipment.origin, shipment.destination);
          
          return (
            <div key={shipment.id}>
              <Marker position={origin}>
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold">Origin</p>
                    <p>{shipment.origin.address}</p>
                    <p className="text-sm text-gray-500">Shipment ID: {shipment.trackingNumber}</p>
                  </div>
                </Popup>
              </Marker>
              
              <Marker position={destination}>
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold">Destination</p>
                    <p>{shipment.destination.address}</p>
                    <p className="text-sm text-gray-500">Shipment ID: {shipment.trackingNumber}</p>
                  </div>
                </Popup>
              </Marker>
              
              <Polyline
                positions={[origin, destination]}
                color="#3B82F6"
                weight={2}
                dashArray="5, 5"
              />
              
              <Marker position={[midpoint.lat, midpoint.lng]} icon={L.divIcon({
                className: `w-4 h-4 rounded-full ${getStatusColor(shipment.status)}`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                popupAnchor: [0, 0],
                html: `<div class="w-full h-full rounded-full animate-pulse"></div>`,
              })}>
                <Popup>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(shipment.status)}`}></span>
                      <span className="text-sm font-medium capitalize">{shipment.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm">{shipment.trackingNumber}</p>
                    <p className="text-xs text-gray-500">Carrier: {shipment.carrier}</p>
                    <p className="text-xs text-gray-500">Est. Delivery: {new Date(shipment.estimatedDelivery).toLocaleDateString()}</p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
