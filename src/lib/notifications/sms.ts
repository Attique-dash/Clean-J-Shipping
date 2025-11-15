import twilio from 'twilio';
import { NotificationType, SmsOptions } from './types';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Shipping App';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

let twilioClient: twilio.Twilio | null = null;

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  if (twilioClient) return twilioClient;
  
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return twilioClient;
}

const smsTemplates: Record<NotificationType, (data: any) => string> = {
  order_confirmation: (data) => 
    `Hi${data.customerName ? ` ${data.customerName}` : ''}, your order #${data.orderNumber || ''} has been confirmed. ` +
    `We'll notify you when it ships. ${APP_URL}/orders/${data.orderNumber}`,

  shipment_picked_up: (data) =>
    `Your order #${data.orderNumber || ''} has been picked up and is on its way! ` +
    `Track it here: ${APP_URL}/tracking/${data.trackingNumber}`,

  in_transit_update: (data) =>
    `Update: Your order #${data.orderNumber || ''} is now ${data.status || 'in transit'}. ` +
    `${data.location ? `Current location: ${data.location}. ` : ''}` +
    `Track: ${APP_URL}/tracking/${data.trackingNumber}`,

  delivery_confirmation: (data) =>
    `Great news! Your order #${data.orderNumber || ''} has been delivered. ` +
    `${data.signedBy ? `Signed by: ${data.signedBy}. ` : ''} ` +
    `View details: ${APP_URL}/orders/${data.orderNumber}`,

  invoice_sent: (data) =>
    `Your invoice #${data.invoiceNumber || ''} for order #${data.orderNumber || ''} is ready. ` +
    `Amount: ${data.amount ? `$${data.amount.toFixed(2)}` : 'N/A'} ` +
    `Due: ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A'}. ` +
    `View: ${APP_URL}/invoices/${data.invoiceNumber}`,

  payment_received: (data) =>
    `Thank you! We've received your payment of ${data.amount ? `$${data.amount.toFixed(2)}` : ''} ` +
    `for order #${data.orderNumber || ''}. ` +
    `Transaction ID: ${data.transactionId || 'N/A'}`,
};

export async function sendSms(
  type: NotificationType,
  options: Omit<SmsOptions, 'body'> & { data: any }
): Promise<{ success: boolean; message?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('Twilio not configured');
    return { success: false, message: 'SMS service not configured' };
  }

  const client = getTwilioClient();
  if (!client) {
    return { success: false, message: 'Failed to initialize Twilio client' };
  }

  try {
    const template = smsTemplates[type];
    if (!template) {
      throw new Error(`No template found for notification type: ${type}`);
    }

    const body = template(options.data);
    
    await client.messages.create({
      body,
      to: options.to,
      from: TWILIO_PHONE_NUMBER,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to send SMS' 
    };
  }
}
