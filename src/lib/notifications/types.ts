export type NotificationType =
  | 'order_confirmation'
  | 'shipment_picked_up'
  | 'in_transit_update'
  | 'delivery_confirmation'
  | 'invoice_sent'
  | 'payment_received';

export interface NotificationData {
  [key: string]: any;
  trackingNumber?: string;
  status?: string;
  orderNumber?: string;
  amount?: number;
  currency?: string;
  estimatedDeliveryDate?: string;
  location?: string;
  notes?: string;
}

export interface NotificationPayload {
  userId: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  data: NotificationData;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SmsOptions {
  to: string;
  body: string;
}

export interface PushNotificationOptions {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}
