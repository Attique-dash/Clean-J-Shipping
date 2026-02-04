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
