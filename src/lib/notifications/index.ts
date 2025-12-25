import { sendEmail } from './email';
import { sendSms } from './sms';
import { sendPushNotification } from './push';
import { NotificationType, NotificationPayload } from './types';

export async function sendNotification(
  type: NotificationType,
  payload: NotificationPayload
) {
  const { userId, email, phone, pushToken, data } = payload;
  
  // Send email if email is provided
  if (email) {
    await sendEmail(type, { to: email, data }).catch(console.error);
  }
  
  // Send SMS if phone is provided and SMS is enabled
  if (phone && process.env.TWILIO_ENABLED === 'true') {
    await sendSms(type, { to: phone, data }).catch(console.error);
  }
  
  // Send push notification if token is provided
  if (pushToken) {
    await sendPushNotification(type, { to: pushToken, data }).catch(console.error);
  }
}

// Helper functions for specific notification types
export const notifications = {
  async orderConfirmation(user: { email?: string; phone?: string; pushToken?: string }, orderData: any) {
    return sendNotification('order_confirmation', {
      userId: user.email || '',
      email: user.email,
      phone: user.phone,
      pushToken: user.pushToken,
      data: orderData
    });
  },
  
  async shipmentPickedUp(user: { email?: string; phone?: string; pushToken?: string }, shipmentData: any) {
    return sendNotification('shipment_picked_up', {
      userId: user.email || '',
      email: user.email,
      phone: user.phone,
      pushToken: user.pushToken,
      data: shipmentData
    });
  },
  
  async inTransitUpdate(user: { email?: string; phone?: string; pushToken?: string }, updateData: any) {
    return sendNotification('in_transit_update', {
      userId: user.email || '',
      email: user.email,
      phone: user.phone,
      pushToken: user.pushToken,
      data: updateData
    });
  },
  
  async deliveryConfirmation(user: { email?: string; phone?: string; pushToken?: string }, deliveryData: any) {
    return sendNotification('delivery_confirmation', {
      userId: user.email || '',
      email: user.email,
      phone: user.phone,
      pushToken: user.pushToken,
      data: deliveryData
    });
  },
  
  async invoiceSent(user: { email?: string; phone?: string; pushToken?: string }, invoiceData: any) {
    return sendNotification('invoice_sent', {
      userId: user.email || '',
      email: user.email,
      phone: user.phone,
      pushToken: user.pushToken,
      data: invoiceData
    });
  },
  
  async paymentReceived(user: { email?: string; phone?: string; pushToken?: string }, paymentData: any) {
    return sendNotification('payment_received', {
      userId: user.email || '',
      email: user.email,
      phone: user.phone,
      pushToken: user.pushToken,
      data: paymentData
    });
  }
};
