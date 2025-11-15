export interface ShipmentStats {
  totalShipments: number;
  activeShipments: number;
  deliveredThisMonth: number;
  inTransit: number;
  averageDeliveryTime: number; // in hours
  onTimeDeliveryRate: number; // percentage
}

export interface RevenueData {
  currentMonth: number;
  previousMonth: number;
  totalYTD: number;
  growthRate: number; // percentage
  byService: Array<{
    service: string;
    revenue: number;
    percentage: number;
  }>;
}

export interface ActiveShipment {
  id: string;
  trackingNumber: string;
  origin: {
    lat: number;
    lng: number;
    address: string;
  };
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'in_transit' | 'out_for_delivery' | 'in_progress';
  estimatedDelivery: string;
  carrier: string;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  repeatCustomers: number;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalShipments: number;
    totalSpent: number;
  }>;
}

export interface PopularRoute {
  origin: string;
  destination: string;
  count: number;
  averageTransitTime: number; // in hours
}

export interface DashboardResponse {
  stats: ShipmentStats;
  revenue: RevenueData;
  activeShipments: ActiveShipment[];
  customerStats: CustomerStats;
  popularRoutes: PopularRoute[];
}
