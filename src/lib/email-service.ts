// my-app/src/lib/email-service.ts
import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;

  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'Clean J Shipping <noreply@cleanjshipping.com>';

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || '',
      },
    });
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log('📧 Attempting to send email:', {
        to: options.to,
        subject: options.subject,
        from: options.from || this.defaultFrom,
        hasHtml: !!options.html,
        hasText: !!options.text
      });

      // Check email configuration
      console.log('🔧 Email configuration:', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        hasUser: !!process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASSWORD,
        from: this.defaultFrom
      });

      const result = await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log('✅ Email sent successfully:', result.messageId);
      return true;
    } catch (error: any) {
      console.error('❌ Email send error details:', {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Send new package arrival notification
   */
  async sendPackageArrivalNotification(data: {
    to: string;
    customerName: string;
    trackingNumber: string;
    weight?: number;
    description?: string;
  }): Promise<boolean> {
    const html = this.getPackageArrivalTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: `📦 Package Arrived - ${data.trackingNumber}`,
      html,
    });
  }

  /**
   * Send package status update
   */
  async sendStatusUpdateNotification(data: {
    to: string;
    customerName: string;
    trackingNumber: string;
    oldStatus: string;
    newStatus: string;
    location?: string;
  }): Promise<boolean> {
    const html = this.getStatusUpdateTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: `📍 Status Update - ${data.trackingNumber}`,
      html,
    });
  }

  /**
   * Send ready for pickup notification
   */
  async sendReadyForPickupNotification(data: {
    to: string;
    customerName: string;
    trackingNumber: string;
    branch: string;
    pickupHours: string;
  }): Promise<boolean> {
    const html = this.getReadyForPickupTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: `✅ Ready for Pickup - ${data.trackingNumber}`,
      html,
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(data: {
    to: string;
    customerName: string;
    amount: number;
    currency: string;
    transactionId: string;
    date: Date;
  }): Promise<boolean> {
    const html = this.getPaymentConfirmationTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: `💳 Payment Received - ${data.transactionId}`,
      html,
    });
  }

  /**
   * Send invoice submission confirmation
   */
  async sendInvoiceSubmissionConfirmation(data: {
    to: string;
    customerName: string;
    trackingNumber: string;
    invoiceNumber: string;
    totalValue: number;
  }): Promise<boolean> {
    const html = this.getInvoiceSubmissionTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: `📄 Invoice Submitted - ${data.invoiceNumber}`,
      html,
    });
  }

  /**
   * Send welcome email for new customers
   */
  async sendWelcomeEmail(data: {
    to: string;
    customerName: string;
    userCode: string;
    email?: string;
    password?: string;
  }): Promise<boolean> {
    const html = this.getWelcomeTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: '🎉 Welcome to Clean J Shipping!',
      html,
    });
  }

  /**
   * Send staff welcome email with login credentials
   */
  async sendStaffWelcomeEmail(data: {
    to: string;
    staffName: string;
    userCode: string;
    password: string;
    branch?: string;
    email?: string;
  }): Promise<boolean> {
    const html = this.getStaffWelcomeTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: '👋 Welcome to Clean J Shipping - Staff Account Created',
      html,
    });
  }

  /**
   * Send broadcast message
   */
  async sendBroadcastEmail(data: {
    to: string[];
    subject: string;
    body: string;
  }): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const email of data.to) {
      const success = await this.sendEmail({
        to: email,
        subject: data.subject,
        html: this.getBroadcastTemplate({ body: data.body }),
      });

      if (success) sent++;
      else failed++;
    }

    return { sent, failed };
  }

  // Email Templates
  
  private getEmailWrapper(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Clean J Shipping</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #0f4d8a 0%, #E67919 100%); padding: 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #0f4d8a 0%, #E67919 100%); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .info-box { background-color: #f8f9fa; border-left: 4px solid #0f4d8a; padding: 15px; margin: 20px 0; }
          .highlight { color: #0f4d8a; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Clean J Shipping</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Clean J Shipping. All rights reserved.</p>
            <p>📧 support@cleanjshipping.com | 📞 +92-XXX-XXXXXXX</p>
            <p>🌐 <a href="https://cleanjshipping.com" style="color: #0f4d8a;">www.cleanjshipping.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPackageArrivalTemplate(data: {
    customerName: string;
    trackingNumber: string;
    weight?: number;
    description?: string;
  }): string {
    return this.getEmailWrapper(`
      <h2>📦 Your Package Has Arrived!</h2>
      <p>Dear ${data.customerName},</p>
      <p>Great news! Your package has been received at our warehouse.</p>
      
      <div class="info-box">
        <p><strong>Tracking Number:</strong> <span class="highlight">${data.trackingNumber}</span></p>
        ${data.weight ? `<p><strong>Weight:</strong> ${data.weight} kg</p>` : ''}
        ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
      </div>

      <p>Your package is now being processed. We'll notify you once it's ready for pickup or dispatch.</p>
      
      <a href="https://cleanjshipping.com/track/${data.trackingNumber}" class="button">Track Your Package</a>
      
      <p>Thank you for choosing Clean J Shipping!</p>
    `);
  }

  private getStatusUpdateTemplate(data: {
    customerName: string;
    trackingNumber: string;
    oldStatus: string;
    newStatus: string;
    location?: string;
  }): string {
    return this.getEmailWrapper(`
      <h2>📍 Package Status Update</h2>
      <p>Dear ${data.customerName},</p>
      <p>Your package status has been updated.</p>
      
      <div class="info-box">
        <p><strong>Tracking Number:</strong> <span class="highlight">${data.trackingNumber}</span></p>
        <p><strong>Previous Status:</strong> ${data.oldStatus}</p>
        <p><strong>Current Status:</strong> <span class="highlight">${data.newStatus}</span></p>
        ${data.location ? `<p><strong>Current Location:</strong> ${data.location}</p>` : ''}
      </div>

      <a href="https://cleanjshipping.com/track/${data.trackingNumber}" class="button">View Details</a>
      
      <p>Thank you for choosing Clean J Shipping!</p>
    `);
  }

  private getReadyForPickupTemplate(data: {
    customerName: string;
    trackingNumber: string;
    branch: string;
    pickupHours: string;
  }): string {
    return this.getEmailWrapper(`
      <h2>✅ Your Package is Ready for Pickup!</h2>
      <p>Dear ${data.customerName},</p>
      <p>Excellent news! Your package is ready for collection.</p>
      
      <div class="info-box">
        <p><strong>Tracking Number:</strong> <span class="highlight">${data.trackingNumber}</span></p>
        <p><strong>Pickup Location:</strong> ${data.branch}</p>
        <p><strong>Pickup Hours:</strong> ${data.pickupHours}</p>
      </div>

      <p><strong>What to bring:</strong></p>
      <ul>
        <li>Valid ID</li>
        <li>This email or tracking number</li>
      </ul>
      
      <p>Please collect your package within 7 days to avoid storage fees.</p>
      
      <p>Thank you for choosing Clean J Shipping!</p>
    `);
  }

  private getPaymentConfirmationTemplate(data: {
    customerName: string;
    amount: number;
    currency: string;
    transactionId: string;
    date: Date;
  }): string {
    return this.getEmailWrapper(`
      <h2>💳 Payment Confirmation</h2>
      <p>Dear ${data.customerName},</p>
      <p>We have successfully received your payment.</p>
      
      <div class="info-box">
        <p><strong>Transaction ID:</strong> <span class="highlight">${data.transactionId}</span></p>
        <p><strong>Amount:</strong> ${data.currency} ${data.amount.toFixed(2)}</p>
        <p><strong>Date:</strong> ${data.date.toLocaleString()}</p>
      </div>

      <p>Your payment has been processed and your account has been updated.</p>
      
      <p>Thank you for your business!</p>
    `);
  }

  private getInvoiceSubmissionTemplate(data: {
    customerName: string;
    trackingNumber: string;
    invoiceNumber: string;
    totalValue: number;
  }): string {
    return this.getEmailWrapper(`
      <h2>📄 Invoice Submission Received</h2>
      <p>Dear ${data.customerName},</p>
      <p>We have received your invoice submission and it's under review.</p>
      
      <div class="info-box">
        <p><strong>Tracking Number:</strong> <span class="highlight">${data.trackingNumber}</span></p>
        <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
        <p><strong>Total Value:</strong> $${data.totalValue.toFixed(2)}</p>
      </div>

      <p>Our team will review your invoice within 24-48 hours. You'll receive a notification once the review is complete.</p>
      
      <p>Thank you for choosing Clean J Shipping!</p>
    `);
  }

  private getWelcomeTemplate(data: {
    customerName: string;
    userCode: string;
    email?: string;
    password?: string;
  }): string {
    const loginUrl = data.email && data.password 
      ? `https://clean-j-shipping.vercel.app/login?email=${encodeURIComponent(data.email)}&password=${encodeURIComponent(data.password)}`
      : 'https://clean-j-shipping.vercel.app/login';
    
    return this.getEmailWrapper(`
      <h2>🎉 Welcome to Clean J Shipping!</h2>
      <p>Dear ${data.customerName},</p>
      <p>Thank you for joining Clean J Shipping! We're excited to help you with all your shipping needs.</p>
      
      <div class="info-box">
        <p><strong>Your Customer Code:</strong> <span class="highlight">${data.userCode}</span></p>
        ${data.email ? `<p><strong>Your Email:</strong> <span class="highlight">${data.email}</span></p>` : ''}
        ${data.password ? `<p><strong>Your Password:</strong> <span class="highlight">${data.password}</span></p>` : ''}
        <p>Keep this information handy - you'll need it for all your shipments!</p>
      </div>

      <h3>Getting Started:</h3>
      <ul>
        <li>Submit pre-alerts for incoming packages</li>
        <li>Track your shipments in real-time</li>
        <li>Manage invoices and payments</li>
        <li>Access your complete shipping history</li>
      </ul>
      
      <a href="${loginUrl}" class="button">Access Your Account</a>
      
      <p>If you have any questions, our support team is here to help!</p>
    `);
  }

  private getStaffWelcomeTemplate(data: {
    staffName: string;
    userCode: string;
    password: string;
    branch?: string;
  }): string {
    return this.getEmailWrapper(`
      <h2>👋 Welcome to the Clean J Shipping Team!</h2>
      <p>Dear ${data.staffName},</p>
      <p>Your staff account has been created successfully. Welcome to the Clean J Shipping team!</p>
      
      <div class="info-box">
        <p><strong>Your Staff Code:</strong> <span class="highlight">${data.userCode}</span></p>
        <p><strong>Your Email:</strong> ${data.userCode.includes('@') ? data.userCode : 'staff@cleanjshipping.com'}</p>
        <p><strong>Your Password:</strong> <span class="highlight">${data.password}</span></p>
        ${data.branch ? `<p><strong>Assigned Branch:</strong> ${data.branch}</p>` : ''}
      </div>

      <h3>🔐 Important Security Information:</h3>
      <ul>
        <li>Keep your login credentials secure and confidential</li>
        <li>Change your password after first login for security</li>
        <li>Never share your credentials with anyone</li>
        <li>Report any suspicious activity immediately</li>
      </ul>

      <h3>🚀 Your Responsibilities:</h3>
      <ul>
        <li>Process incoming packages efficiently</li>
        <li>Update package statuses in real-time</li>
        <li>Handle customer inquiries professionally</li>
        <li>Maintain accurate inventory records</li>
        <li>Follow all operational procedures</li>
      </ul>
      
      <a href="https://cleanjshipping.com/login" class="button">Access Your Staff Account</a>
      
      <h3>📚 Quick Start Guide:</h3>
      <ol>
        <li>Log in with your email and password above</li>
        <li>Familiarize yourself with the dashboard</li>
        <li>Review the operational procedures</li>
        <li>Start processing packages under supervision</li>
      </ol>
      
      <p>For training and support, contact your supervisor or the admin team.</p>
      <p>We're excited to have you on board! 🎉</p>
    `);
  }

  private getBroadcastTemplate(data: { body: string }): string {
    return this.getEmailWrapper(`
      <div style="white-space: pre-wrap;">${data.body}</div>
    `);
  }
}

// Singleton instance
export const emailService = new EmailService();