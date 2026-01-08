import nodemailer from 'nodemailer';
import { NotificationType, EmailOptions } from './types';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Shipping App';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!EMAIL_USER || !EMAIL_PASS) return null;
  if (transporter) return transporter;
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

interface ExtendedEmailData {
  orderNumber?: string;
  customerName?: string;
  shippingAddress?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string | Date;
  status?: string;
  location?: string;
  notes?: string;
  signedBy?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  dueDate?: string | Date;
  paymentMethod?: string;
  transactionId?: string;
}

const emailTemplates: Record<NotificationType, (data: ExtendedEmailData) => { subject: string; html: string }> = {
  order_confirmation: (data) => ({
    subject: `Order Confirmation - #${data.orderNumber || 'N/A'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order Confirmed</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>Thank you for your order! We're excited to process it for you.</p>
        
        <h3>Order Details</h3>
        <p><strong>Order #:</strong> ${data.orderNumber || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3>Shipping Information</h3>
        <p>${data.shippingAddress || 'N/A'}</p>
        
        <p>We'll notify you once your order has been shipped.</p>
        <p>Thank you for choosing ${APP_NAME}!</p>
      </div>
    `,
  }),

  shipment_picked_up: (data) => ({
    subject: `Your Order #${data.orderNumber} Has Been Picked Up`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Order is On Its Way</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>Great news! Your order has been picked up and is on its way to our facility.</p>
        
        <h3>Shipment Details</h3>
        <p><strong>Tracking #:</strong> ${data.trackingNumber || 'N/A'}</p>
        <p><strong>Status:</strong> Picked Up</p>
        ${data.estimatedDeliveryDate ? `<p><strong>Estimated Delivery:</strong> ${new Date(data.estimatedDeliveryDate).toLocaleDateString()}</p>` : ''}
        
        <p>You can track your shipment using the button below:</p>
        <p>
          <a href="${APP_URL}/tracking/${data.trackingNumber}" 
             style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Track Your Package
          </a>
        </p>
      </div>
    `,
  }),

  in_transit_update: (data) => ({
    subject: `Update on Your Order #${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Order is In Transit</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>Your order is on the move! Here's the latest update:</p>
        
        <h3>Shipment Update</h3>
        <p><strong>Status:</strong> ${data.status || 'In Transit'}</p>
        ${data.location ? `<p><strong>Current Location:</strong> ${data.location}</p>` : ''}
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        
        <p>You can track your shipment using the button below:</p>
        <p>
          <a href="${APP_URL}/tracking/${data.trackingNumber}" 
             style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">
            Track Your Package
          </a>
        </p>
      </div>
    `,
  }),

  delivery_confirmation: (data) => ({
    subject: `Your Order #${data.orderNumber} Has Been Delivered`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Order Has Been Delivered</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>Great news! Your order has been successfully delivered.</p>
        
        <h3>Delivery Details</h3>
        <p><strong>Delivered On:</strong> ${new Date().toLocaleString()}</p>
        ${data.signedBy ? `<p><strong>Signed By:</strong> ${data.signedBy}</p>` : ''}
        
        <p>We hope you're satisfied with your purchase. If you have any questions, please don't hesitate to contact our support team.</p>
        
        <p>Thank you for shopping with us!</p>
      </div>
    `,
  }),

  invoice_sent: (data) => ({
    subject: `Invoice #${data.invoiceNumber || 'N/A'} for Order #${data.orderNumber || 'N/A'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Invoice</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>Here's your invoice for your recent order.</p>
        
        <h3>Invoice Details</h3>
        <p><strong>Invoice #:</strong> ${data.invoiceNumber || 'N/A'}</p>
        <p><strong>Order #:</strong> ${data.orderNumber || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Amount Due:</strong> ${formatCurrency(data.amount || 0, data.currency || 'USD')}</p>
        ${data.dueDate ? `<p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>` : ''}
        
        <p>You can view and download your invoice by clicking the button below:</p>
        <p>
          <a href="${APP_URL}/invoices/${data.invoiceNumber}" 
             style="display: inline-block; padding: 10px 20px; background-color: #9C27B0; color: white; text-decoration: none; border-radius: 5px;">
            View Invoice
          </a>
        </p>
      </div>
    `,
  }),

  payment_received: (data) => ({
    subject: `Payment Received - Thank You!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Received</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>We've received your payment. Thank you!</p>
        
        <h3>Payment Details</h3>
        <p><strong>Amount:</strong> ${formatCurrency(data.amount || 0, data.currency || 'USD')}</p>
        <p><strong>Payment Method:</strong> ${data.paymentMethod || 'N/A'}</p>
        <p><strong>Transaction ID:</strong> ${data.transactionId || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        
        <p>You can view your payment details and invoice in your account dashboard.</p>
        
        <p>Thank you for your business!</p>
      </div>
    `,
  }),
};

export async function sendEmail(
  type: NotificationType,
  options: Omit<EmailOptions, 'subject' | 'html'> & { data: ExtendedEmailData }
): Promise<{ success: boolean; message?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    console.error('Email not configured');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const template = emailTemplates[type];
    if (!template) {
      throw new Error(`No template found for notification type: ${type}`);
    }

    const { subject, html } = template(options.data);
    const mailOptions = {
      from: `"${APP_NAME}" <${EMAIL_USER}>`,
      to: options.to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, '\n').replace(/\s+\n/g, '\n').trim(),
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send email' };
  }
}
