import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: false,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS
    }
  });

  static async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: config.SMTP_USER,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${result.messageId}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  static async sendPackageUpdateEmail(to: string, trackingNumber: string, status: string, location?: string): Promise<boolean> {
    try {
      const subject = `Package Update: ${trackingNumber}`;
      const html = `
        <h2>Package Update</h2>
        <p>Tracking Number: <strong>${trackingNumber}</strong></p>
        <p>Status: <strong>${status}</strong></p>
        ${location ? `<p>Location: ${location}</p>` : ''}
        <p>You can track your package using the tracking number above.</p>
        <p>Thank you for using our shipping service!</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending package update email:', error);
      return false;
    }
  }

  static async sendPackagePreAlert(to: string, packageData: {
    trackingNumber: string;
    shipper: string;
    weight: number;
    airwayBill?: string;
    mailboxNumber: string;
    customerName: string;
    receivedDate: Date;
    // Add all detailed package fields
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    description?: string;
    itemDescription?: string;
    serviceMode?: string;
    status?: string;
    senderName?: string;
    senderEmail?: string;
    senderPhone?: string;
    senderAddress?: string;
    senderCountry?: string;
    recipient?: {
      name: string;
      email: string;
      shippingId?: string;
      phone?: string;
      address?: string;
    };
    totalAmount?: number;
    paymentStatus?: string;
    customsRequired?: boolean;
    customsStatus?: string;
    warehouseLocation?: string;
    specialInstructions?: string;
    isFragile?: boolean;
    isHazardous?: boolean;
    requiresSignature?: boolean;
    estimatedDelivery?: Date;
  }): Promise<boolean> {
    try {
      const subject = `New Package Received - ${packageData.trackingNumber}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 15px 0;">📦 New Package Received</h2>
            <p style="margin: 0; color: #666;">Hello ${packageData.customerName}, a new package has been received at our warehouse and is ready for processing.</p>
          </div>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Package Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555; width: 30%;">Tracking Number:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333; font-weight: bold;">${packageData.trackingNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Shipper:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.shipper}</td>
              </tr>
              ${packageData.airwayBill ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Airway Bill:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.airwayBill}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Weight:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.weight} kg</td>
              </tr>
              ${packageData.dimensions ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Dimensions:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.dimensions.length} x ${packageData.dimensions.width} x ${packageData.dimensions.height} ${packageData.dimensions.unit}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Service Mode:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.serviceMode ? packageData.serviceMode.toUpperCase() : 'STANDARD'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Mailbox #:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333; font-weight: bold;">${packageData.mailboxNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Status:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">
                  <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${(packageData.status || 'RECEIVED').replace(/_/g, ' ').toUpperCase()}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Received Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.receivedDate.toLocaleDateString()} at ${packageData.receivedDate.toLocaleTimeString()}</td>
              </tr>
              ${packageData.totalAmount ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Total Amount:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">$${packageData.totalAmount}</td>
              </tr>
              ` : ''}
              ${packageData.paymentStatus ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Payment Status:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.paymentStatus.replace(/_/g, ' ').toUpperCase()}</td>
              </tr>
              ` : ''}
              ${packageData.warehouseLocation ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Warehouse Location:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.warehouseLocation}</td>
              </tr>
              ` : ''}
              ${packageData.estimatedDelivery ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Estimated Delivery:</td>
                <td style="padding: 8px 0; color: #333;">${packageData.estimatedDelivery.toLocaleDateString()}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${packageData.description || packageData.itemDescription ? `
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Package Description</h3>
            ${packageData.description ? `
            <p><strong>Description:</strong> ${packageData.description}</p>
            ` : ''}
            ${packageData.itemDescription ? `
            <p><strong>Item Description:</strong> ${packageData.itemDescription}</p>
            ` : ''}
          </div>
          ` : ''}

          ${packageData.senderName ? `
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Sender Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555; width: 30%;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.senderName}</td>
              </tr>
              ${packageData.senderEmail ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.senderEmail}</td>
              </tr>
              ` : ''}
              ${packageData.senderPhone ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Phone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.senderPhone}</td>
              </tr>
              ` : ''}
              ${packageData.senderAddress ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Address:</td>
                <td style="padding: 8px 0; color: #333;">${packageData.senderAddress}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          ` : ''}

          ${packageData.recipient ? `
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Recipient Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555; width: 30%;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.recipient.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.recipient.email}</td>
              </tr>
              ${packageData.recipient.phone ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Phone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.recipient.phone}</td>
              </tr>
              ` : ''}
              ${packageData.recipient.shippingId ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Shipping ID:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.recipient.shippingId}</td>
              </tr>
              ` : ''}
              ${packageData.recipient.address ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Address:</td>
                <td style="padding: 8px 0; color: #333;">${packageData.recipient.address}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          ` : ''}

          ${packageData.customsRequired || packageData.isFragile || packageData.isHazardous || packageData.requiresSignature || packageData.specialInstructions ? `
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Additional Information</h3>
            ${packageData.customsRequired ? `
            <p><strong>Customs Required:</strong> Yes (${packageData.customsStatus || 'PENDING'})</p>
            ` : ''}
            ${packageData.isFragile ? '<p><strong>⚠️ Fragile Package</strong></p>' : ''}
            ${packageData.isHazardous ? '<p><strong>⚠️ Hazardous Material</strong></p>' : ''}
            ${packageData.requiresSignature ? '<p><strong>📝 Signature Required</strong></p>' : ''}
            ${packageData.specialInstructions ? `<p><strong>Special Instructions:</strong> ${packageData.specialInstructions}</p>` : ''}
          </div>
          ` : ''}
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">📋 Important Reminder</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li>Jamaica Customs requires an invoice for all packages. Packages without invoices will result in delays.</li>
              <li>Always send us a pre-alert with an attached invoice for all incoming packages. This will reduce delays.</li>
              <li>Always make sure your Mailbox # ${packageData.mailboxNumber} is included in the shipping address. This will reduce delays.</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Provide Invoice(s) Now</a>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
            <p>This is an automated notification from our warehouse management system.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>Tracking Number: ${packageData.trackingNumber}</p>
          </div>
        </div>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending package pre-alert email:', error);
      return false;
    }
  }

  static async sendPackageNotificationToRecipient(to: string, packageData: {
    trackingNumber: string;
    shipper: string;
    weight: number;
    description?: string;
    itemDescription?: string;
    senderName?: string;
    senderEmail?: string;
    senderPhone?: string;
    senderAddress?: string;
    senderCountry?: string;
    recipientName: string;
    recipientEmail: string;
    recipientPhone: string;
    recipientAddress: string;
    serviceMode: string;
    warehouseLocation?: string;
    estimatedDelivery?: Date;
    receivedDate: Date;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    totalAmount?: number;
  }): Promise<boolean> {
    try {
      const subject = `Package Information - ${packageData.trackingNumber}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 15px 0;">📦 Package Information</h2>
            <p style="margin: 0; color: #666;">A package has been processed and is being sent to you. Here are the details:</p>
          </div>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Package Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Tracking Number:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333; font-weight: bold;">${packageData.trackingNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Shipper:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.shipper}</td>
              </tr>
              ${packageData.description ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Description:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.description}</td>
              </tr>
              ` : ''}
              ${packageData.itemDescription ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Item Description:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.itemDescription}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Weight:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.weight} kg</td>
              </tr>
              ${packageData.dimensions ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Dimensions:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.dimensions.length} x ${packageData.dimensions.width} x ${packageData.dimensions.height} ${packageData.dimensions.unit}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Service Mode:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.serviceMode.toUpperCase()}</td>
              </tr>
              ${packageData.totalAmount ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Total Amount:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">$${packageData.totalAmount}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Received Date:</td>
                <td style="padding: 8px 0; color: #333;">${packageData.receivedDate.toLocaleDateString()} at ${packageData.receivedDate.toLocaleTimeString()}</td>
              </tr>
            </table>
          </div>
          
          ${packageData.senderName ? `
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Sender Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.senderName}</td>
              </tr>
              ${packageData.senderEmail ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.senderEmail}</td>
              </tr>
              ` : ''}
              ${packageData.senderPhone ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Phone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.senderPhone}</td>
              </tr>
              ` : ''}
              ${packageData.senderAddress ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Address:</td>
                <td style="padding: 8px 0; color: #333;">${packageData.senderAddress}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          ` : ''}
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Recipient Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.recipientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.recipientEmail}</td>
              </tr>
              ${packageData.recipientPhone ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Phone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${packageData.recipientPhone}</td>
              </tr>
              ` : ''}
              ${packageData.recipientAddress ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Address:</td>
                <td style="padding: 8px 0; color: #333;">${packageData.recipientAddress}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${packageData.warehouseLocation || packageData.estimatedDelivery ? `
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Shipping Information</h3>
            ${packageData.warehouseLocation ? `
            <p><strong>Current Location:</strong> ${packageData.warehouseLocation}</p>
            ` : ''}
            ${packageData.estimatedDelivery ? `
            <p><strong>Estimated Delivery:</strong> ${packageData.estimatedDelivery.toLocaleDateString()}</p>
            ` : ''}
          </div>
          ` : ''}
          
          <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0066cc; margin: 0 0 10px 0;">📞 Need Help?</h4>
            <p style="margin: 0; color: #0066cc;">If you have any questions about this package, please contact our support team at <a href="mailto:cleanjshipping@gmail.com">cleanjshipping@gmail.com</a> or <a href="mailto:info@cleanshipping.com">info@cleanshipping.com</a>.</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
            <p>This is an automated notification from our warehouse management system.</p>
            <p>Tracking Number: ${packageData.trackingNumber}</p>
          </div>
        </div>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending package notification to recipient:', error);
      return false;
    }
  }

  static async sendDeliveryConfirmationEmail(to: string, trackingNumber: string, deliveredAt: Date): Promise<boolean> {
    try {
      const subject = `Package Delivered: ${trackingNumber}`;
      const html = `
        <h2>Package Delivered!</h2>
        <p>Your package with tracking number <strong>${trackingNumber}</strong> has been successfully delivered.</p>
        <p>Delivery Date: ${deliveredAt.toLocaleDateString()} at ${deliveredAt.toLocaleTimeString()}</p>
        <p>Thank you for using our shipping service!</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending delivery confirmation email:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    try {
      const subject = 'Welcome to Our Shipping Service';
      const html = `
        <h2>Welcome, ${name}!</h2>
        <p>Thank you for joining our shipping service. We're excited to help you with all your shipping needs.</p>
        <p>With our service, you can:</p>
        <ul>
          <li>Track your packages in real-time</li>
          <li>Manage shipping addresses</li>
          <li>Receive delivery notifications</li>
          <li>View shipping history</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Welcome aboard!</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      return false;
    }
  }

  static async sendWelcomeWithShippingInfo(to: string, firstName: string, lastName: string, userCode: string, phone?: string, branch?: string, address?: any, courierCode?: string, airAddress?: any, seaAddress?: any, chinaAddress?: any): Promise<boolean> {
    try {
      const subject = 'Welcome to Our Shipping Service - Your Account Details';
      
      // Helper function to format address with user details
      const formatShippingAddress = (type: string) => {
        const fullName = `${firstName} ${lastName}`;
        const mailboxCode = type === 'air' ? `AIR-${courierCode}` : type === 'sea' ? `SEA-${courierCode}` : courierCode;
        
        if (type === 'china') {
          return `
            <strong>${fullName} / ${courierCode}</strong><br>
            China<br>
            Guangdong Province, Shenzhen<br>
            Baoshan No.2 Industrial Zone<br>
            <strong>Phone:</strong> 1 (876) 578-5945<br>
            <strong>Email:</strong> cleanjshipping@gmail.com, info@cleanshipping.com
          `;
        } else {
          return `
            <strong>${fullName}</strong><br>
            700 NW 57 Place<br>
            ${mailboxCode}<br>
            Ft. Lauderdale, Florida 33309<br>
            USA<br>
            <strong>Phone:</strong> 1 (876) 578-5945<br>
            <strong>Email:</strong> cleanjshipping@gmail.com, info@cleanshipping.com
          `;
        }
      };
      
      const html = `
        <h2>Welcome, ${firstName} ${lastName}!</h2>
        <p>Thank you for joining our shipping service. Your account has been successfully created.</p>
        
        <h3>Your Account Details:</h3>
        <ul>
          <li><strong>Full Name:</strong> ${firstName} ${lastName}</li>
          <li><strong>User Code:</strong> ${userCode}</li>
          <li><strong>Email:</strong> ${to}</li>
          ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
          ${branch ? `<li><strong>Branch:</strong> ${branch}</li>` : ''}
          ${courierCode ? `<li><strong>Mailbox Number:</strong> ${courierCode}</li>` : ''}
          ${address ? `
          <li><strong>Your Address:</strong><br>
            ${address.street}<br>
            ${address.city}, ${address.state} ${address.zipCode}<br>
            ${address.country}
          </li>` : ''}
        </ul>
        
        ${(airAddress || seaAddress || chinaAddress) ? `
        <h3>Warehouse Shipping Addresses:</h3>
        <p>When sending packages to our warehouse, please use the appropriate address based on your shipping method:</p>
        
        ${airAddress ? `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h4>🛩️ Standard Air Address</h4>
          ${formatShippingAddress('air')}
        </div>
        ` : ''}
        
        ${seaAddress ? `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h4>🚢 Standard Sea Address</h4>
          ${formatShippingAddress('sea')}
        </div>
        ` : ''}
        
        ${chinaAddress ? `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h4>🇨🇳 China Warehouse Address</h4>
          ${formatShippingAddress('china')}
        </div>
        ` : ''}
        
        <p><strong>Important:</strong> Always include your mailbox number (${courierCode}) when shipping packages to ensure proper delivery.</p>
        ` : ''}
        
        <p>If you have any questions, please contact our support team at <a href="mailto:cleanjshipping@gmail.com">cleanjshipping@gmail.com</a> or <a href="mailto:info@cleanshipping.com">info@cleanshipping.com</a>.</p>
        
        <p>Welcome to Clean J Shipping!</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending welcome email with shipping info:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    try {
      const subject = 'Password Reset Request';
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const html = `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      return false;
    }
  }

  static async sendLowStockAlert(to: string, items: Array<{ name: string; sku: string; quantity: number; minStockLevel: number }>): Promise<boolean> {
    try {
      const subject = 'Low Stock Alert';
      const itemsList = items.map(item => 
        `<li>${item.name} (${item.sku}): ${item.quantity} remaining (min: ${item.minStockLevel})</li>`
      ).join('');

      const html = `
        <h2>Low Stock Alert</h2>
        <p>The following items are running low on stock:</p>
        <ul>
          ${itemsList}
        </ul>
        <p>Please restock these items soon to avoid inventory shortages.</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending low stock alert:', error);
      return false;
    }
  }

  static async sendInvoiceEmail(to: string, invoiceData: any): Promise<boolean> {
    try {
      const subject = `Invoice #${invoiceData.invoiceNumber}`;
      const html = `
        <h2>Invoice #${invoiceData.invoiceNumber}</h2>
        <p>Date: ${invoiceData.date}</p>
        <p>Due Date: ${invoiceData.dueDate}</p>
        <h3>Items:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px;">Description</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Total</th>
          </tr>
          ${invoiceData.items.map((item: any) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">$${item.price}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">$${item.total}</td>
            </tr>
          `).join('')}
        </table>
        <h3>Total: $${invoiceData.total}</h3>
        <p>Thank you for your business!</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Error sending invoice email:', error);
      return false;
    }
  }

  static async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}
