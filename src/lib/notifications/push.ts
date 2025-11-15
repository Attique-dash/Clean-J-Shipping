import admin from 'firebase-admin';
import { NotificationType, PushNotificationOptions } from './types';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

const pushTemplates: Record<NotificationType, (data: any) => { title: string; body: string; data?: Record<string, string> }> = {
  order_confirmation: (data) => ({
    title: 'Order Confirmed',
    body: `Your order #${data.orderNumber || ''} has been confirmed.`,
    data: {
      type: 'order_confirmation',
      orderId: data.orderNumber || '',
      url: `/orders/${data.orderNumber}`,
    },
  }),

  shipment_picked_up: (data) => ({
    title: 'Order Picked Up',
    body: `Your order #${data.orderNumber || ''} has been picked up and is on its way!`,
    data: {
      type: 'shipment_update',
      orderId: data.orderNumber || '',
      trackingNumber: data.trackingNumber || '',
      status: 'picked_up',
      url: `/tracking/${data.trackingNumber}`,
    },
  }),

  in_transit_update: (data) => ({
    title: 'Shipment Update',
    body: `Your order #${data.orderNumber || ''} is now ${data.status || 'in transit'}.`,
    data: {
      type: 'shipment_update',
      orderId: data.orderNumber || '',
      trackingNumber: data.trackingNumber || '',
      status: 'in_transit',
      location: data.location || '',
      url: `/tracking/${data.trackingNumber}`,
    },
  }),

  delivery_confirmation: (data) => ({
    title: 'Order Delivered',
    body: `Your order #${data.orderNumber || ''} has been delivered!`,
    data: {
      type: 'delivery_confirmation',
      orderId: data.orderNumber || '',
      trackingNumber: data.trackingNumber || '',
      signedBy: data.signedBy || '',
      url: `/orders/${data.orderNumber}`,
    },
  }),

  invoice_sent: (data) => ({
    title: 'New Invoice Available',
    body: `Invoice #${data.invoiceNumber || ''} for order #${data.orderNumber || ''} is ready.`,
    data: {
      type: 'invoice',
      invoiceId: data.invoiceNumber || '',
      orderId: data.orderNumber || '',
      amount: data.amount ? String(data.amount) : '0',
      dueDate: data.dueDate || '',
      url: `/invoices/${data.invoiceNumber}`,
    },
  }),

  payment_received: (data) => ({
    title: 'Payment Received',
    body: `Thank you! We've received your payment of $${data.amount?.toFixed(2) || '0.00'} for order #${data.orderNumber || ''}.`,
    data: {
      type: 'payment',
      orderId: data.orderNumber || '',
      amount: data.amount ? String(data.amount) : '0',
      transactionId: data.transactionId || '',
      url: `/orders/${data.orderNumber}`,
    },
  }),
};

export async function sendPushNotification(
  type: NotificationType,
  options: Omit<PushNotificationOptions, 'title' | 'body'> & { data: any }
): Promise<{ success: boolean; message?: string }> {
  if (!admin.apps.length) {
    return { success: false, message: 'Firebase Admin not initialized' };
  }

  try {
    const template = pushTemplates[type];
    if (!template) {
      throw new Error(`No template found for notification type: ${type}`);
    }

    const { title, body, data } = template(options.data);
    
    const message = {
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For Flutter apps
      },
      token: options.to, // For single device
      // topic: 'all', // For sending to topic
    };

    await admin.messaging().send(message);
    return { success: true };
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to send push notification' 
    };
  }
}

// For sending to multiple devices or using topics
export const pushNotificationService = {
  sendToDevice: async (token: string, message: admin.messaging.Message) => {
    try {
      await admin.messaging().send({ ...message, token });
      return { success: true };
    } catch (error) {
      console.error('Failed to send to device:', error);
      return { success: false, error };
    }
  },
  
  sendToTopic: async (topic: string, message: admin.messaging.Message) => {
    try {
      await admin.messaging().send({ ...message, topic });
      return { success: true };
    } catch (error) {
      console.error('Failed to send to topic:', error);
      return { success: false, error };
    }
  },
  
  subscribeToTopic: async (tokens: string | string[], topic: string) => {
    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      return { success: true };
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      return { success: false, error };
    }
  },
  
  unsubscribeFromTopic: async (tokens: string | string[], topic: string) => {
    try {
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      return { success: true };
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
      return { success: false, error };
    }
  },
};
