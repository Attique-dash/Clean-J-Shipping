'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Clock, 
  FileText, 
  CreditCard, 
  HelpCircle, 
  ArrowRight,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock as ClockIcon
} from 'lucide-react';
import Link from 'next/link';
import { CustomerProfile, CustomerOrder, Shipment } from '@/types/customer';

// Mock data - replace with actual API calls
const mockProfile: CustomerProfile = {
  id: 'cust_123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  company: 'Acme Inc.',
  address: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
  },
  preferences: {
    emailNotifications: true,
    smsNotifications: true,
    language: 'en-US',
  },
  stats: {
    totalOrders: 15,
    totalSpent: 12500,
    memberSince: '2022-01-15',
  },
};

const mockOrders: CustomerOrder[] = [
  {
    id: 'ord_001',
    orderNumber: 'ORD-2023-1001',
    date: '2023-10-15',
    status: 'delivered',
    total: 1250.0,
    items: [
      { id: 'item_001', name: 'Premium Shipping Box (Large)', quantity: 5, price: 20.0 },
      { id: 'item_002', name: 'Express Shipping', quantity: 1, price: 50.0 },
    ],
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
    },
    trackingNumber: 'SHIP-123-456-789',
    carrier: 'FedEx',
  },
  // Add more mock orders as needed
];

const mockShipments: Shipment[] = [
  {
    id: 'ship_001',
    trackingNumber: 'SHIP-123-456-789',
    status: 'in_transit',
    origin: 'New York, NY',
    destination: 'Los Angeles, CA',
    estimatedDelivery: '2023-10-25',
    carrier: 'FedEx',
    history: [
      {
        status: 'In Transit',
        location: 'Chicago, IL',
        timestamp: '2023-10-18T14:30:00Z',
        description: 'Package is in transit to the next facility',
      },
      {
        status: 'Departed Facility',
        location: 'New York, NY',
        timestamp: '2023-10-17T09:15:00Z',
      },
      {
        status: 'Picked Up',
        location: 'New York, NY',
        timestamp: '2023-10-16T16:45:00Z',
      },
    ],
    items: [
      { id: 'item_001', name: 'Premium Shipping Box (Large)', quantity: 5 },
    ],
  },
];

export default function CustomerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [recentOrders, setRecentOrders] = useState<CustomerOrder[]>([]);
  const [activeShipments, setActiveShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      try {
        // In a real app, you would fetch this data from your API
        setProfile(mockProfile);
        setRecentOrders(mockOrders.slice(0, 3));
        setActiveShipments(mockShipments);
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-700">Unable to load customer data</h2>
        <p className="mt-2 text-gray-500">Please try again later or contact support.</p>
      </div>
    );
  }

  const stats = [
    { 
      name: 'Total Orders', 
      value: profile.stats.totalOrders, 
      icon: Package,
      href: '/customer/orders',
      change: '+12%',
      changeType: 'increase'
    },
    { 
      name: 'Active Shipments', 
      value: activeShipments.length, 
      icon: Truck,
      href: '/customer/shipments',
      change: activeShipments.length > 0 ? `${activeShipments.length} in transit` : 'None',
      changeType: activeShipments.length > 0 ? 'active' : 'neutral'
    },
    { 
      name: 'Pending Payments', 
      value: '$0.00', 
      icon: CreditCard,
      href: '/customer/payments',
      change: 'All paid',
      changeType: 'positive'
    },
    { 
      name: 'Open Tickets', 
      value: '0', 
      icon: HelpCircle,
      href: '/customer/support',
      change: 'No active tickets',
      changeType: 'neutral'
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Delivered
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Truck className="h-3.5 w-3.5 mr-1" />
            In Transit
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3.5 w-3.5 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profile.name.split(' ')[0]}!</h1>
        <p className="mt-1 text-gray-500">Here's what's happening with your shipments and orders.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link 
            key={stat.name} 
            href={stat.href}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'increase' ? 'text-green-600' : 
                        stat.changeType === 'decrease' ? 'text-red-600' : 
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-blue-700 hover:text-blue-500">
                  View all <span className="sr-only">{stat.name} stat</span>
                  <ArrowRight className="inline h-4 w-4 ml-1" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Orders</h3>
            <Link 
              href="/customer/orders" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all orders
            </Link>
          </div>
        </div>
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/customer/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by placing a new order.</p>
            <div className="mt-6">
              <Link
                href="/shipment/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Truck className="-ml-1 mr-2 h-5 w-5" />
                New Shipment
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Active Shipments */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Active Shipments</h3>
            <Link 
              href="/customer/shipments" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Track all shipments
            </Link>
          </div>
        </div>
        {activeShipments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {activeShipments.map((shipment) => (
              <div key={shipment.id} className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {getStatusBadge(shipment.status)}
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        {shipment.trackingNumber}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {shipment.origin} → {shipment.destination}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 sm:ml-6">
                    <div className="flex flex-col sm:items-end">
                      <p className="text-sm text-gray-500">
                        Estimated delivery: {new Date(shipment.estimatedDelivery || '').toLocaleDateString()}
                      </p>
                      <Link 
                        href={`/customer/shipments/${shipment.trackingNumber}`}
                        className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Track shipment <span aria-hidden="true">&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-6">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                          {shipment.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-blue-600">
                          {shipment.history[0]?.status}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                      <div 
                        style={{ width: '75%' }} 
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Picked Up</span>
                      <span>In Transit</span>
                      <span>Out for Delivery</span>
                      <span>Delivered</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active shipments</h3>
            <p className="mt-1 text-sm text-gray-500">Your shipments will appear here when they're on the way.</p>
          </div>
        )}
      </div>
    </div>
  );
}
