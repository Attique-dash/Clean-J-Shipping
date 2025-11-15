export interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  carrier?: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  status: 'pre_transit' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'failure';
  origin: string;
  destination: string;
  estimatedDelivery?: string;
  carrier: string;
  history: Array<{
    status: string;
    location: string;
    timestamp: string;
    description?: string;
  }>;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  orderId: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  billingAddress: {
    name: string;
    company?: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  invoiceId: string;
  orderId: string;
  receiptNumber: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    content: string;
    from: 'customer' | 'support';
    timestamp: string;
  };
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    language: string;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    memberSince: string;
  };
}
