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
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
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
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        hasUser: !!process.env.SMTP_USER,
        hasPassword: !!process.env.SMTP_PASS,
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

  private getPaymentConfirmationTemplate(data: {
    customerName: string;
    amount: number;
    currency: string;
    transactionId: string;
    date: Date;
  }): string {
    const { CurrencyService } = require('./currency-service');
    const formattedAmount = CurrencyService.format(data.amount, data.currency);
    
    return this.getEmailWrapper(`
      <h2>💳 Payment Confirmation</h2>
      <p>Dear ${data.customerName},</p>
      <p>We have successfully received your payment.</p>
      
      <div class="info-box">
        <p><strong>Transaction ID:</strong> <span class="highlight">${data.transactionId}</span></p>
        <p><strong>Amount:</strong> ${formattedAmount}</p>
        <p><strong>Date:</strong> ${data.date.toLocaleString()}</p>
      </div>

      <p>Your payment has been processed and your account has been updated.</p>
      
      <p>Thank you for your business!</p>
    `);
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

  private getInvoiceSubmissionTemplate(data: {
    customerName: string;
    trackingNumber: string;
    invoiceNumber: string;
    totalValue: number;
    currency?: string;
  }): string {
    const { CurrencyService } = require('./currency-service');
    const currencyCode = data.currency || 'USD';
    const formattedValue = CurrencyService.format(data.totalValue, currencyCode);
    
    return this.getEmailWrapper(`
      <h2>📄 Invoice Submission Received</h2>
      <p>Dear ${data.customerName},</p>
      <p>We have received your invoice submission and it's under review.</p>
      
      <div class="info-box">
        <p><strong>Tracking Number:</strong> <span class="highlight">${data.trackingNumber}</span></p>
        <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
        <p><strong>Total Value:</strong> ${formattedValue}</p>
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
      ? `https://www.cleanjshipping.com/login?email=${encodeURIComponent(data.email)}&password=${encodeURIComponent(data.password)}`
      : 'https://www.cleanjshipping.com/login';
    
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
      
      <div class="info-box">
        <h3>📍 Our Warehouse Addresses</h3>
        <p style="margin:0 0 12px 0;color:#374151;font-size:14px;">Use these addresses when shipping packages to us:</p>
        <div style="background:white;border:1px solid #bfdbfe;border-radius:6px;padding:12px;margin-bottom:8px;">
          <p style="margin:0 0 4px 0;color:#1e40af;font-weight:600;font-size:13px;">✈️ Air Shipments (Tax Exempt)</p>
          <p style="margin:0;color:#374151;font-size:13px;white-space:pre-line;">700 NW 57 Place<br>AIR-${data.userCode}<br>Ft. Lauderdale, Florida 33309<br>USA</p>
        </div>
        <div style="background:white;border:1px solid #bfdbfe;border-radius:6px;padding:12px;margin-bottom:8px;">
          <p style="margin:0 0 4px 0;color:#0369a1;font-weight:600;font-size:13px;">🚢 Sea Shipments (Tax Exempt)</p>
          <p style="margin:0;color:#374151;font-size:13px;white-space:pre-line;">700 NW 57 Place<br>SEA-${data.userCode}<br>Ft. Lauderdale, Florida 33309<br>USA</p>
        </div>
        <div style="background:white;border:1px solid #bfdbfe;border-radius:6px;padding:12px;">
          <p style="margin:0 0 4px 0;color:#dc2626;font-weight:600;font-size:13px;">🇨🇳 China Warehouse</p>
          <p style="margin:0;color:#374151;font-size:13px;white-space:pre-line;">${data.userCode}<br>Baoshan No.2 Industrial Zone<br>Shenzhen, Guangdong Province 518000<br>China</p>
        </div>
      </div>
      
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

  /**
   * Send invoice notification with payment link
   */
  async sendInvoiceEmail(data: {
    to: string;
    customerName: string;
    invoiceNumber: string;
    trackingNumber: string;
    totalAmount: number;
    paymentLink: string;
    items: Array<{
      description: string;
      quantity: number;
      total: number;
    }>;
    currency?: string;
  }): Promise<boolean> {
    const html = this.getInvoiceTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: `📄 Invoice ${data.invoiceNumber} - Package ${data.trackingNumber} - Payment Required`,
      html,
    });
  }

  /**
   * Send billing email with payment link
   */
  async sendBillingEmail(data: {
    to: string;
    customerName: string;
    billNumber: string;
    packages: Array<{
      trackingNumber: string;
      shipper: string;
      weight: number;
      itemValue: number;
      shippingFee: number;
      customsFee: number;
      total: number;
      content?: string;
      description?: string;
      itemDescription?: string;
    }>;
    itemTotal: number;
    shippingFee: number;
    customsFee: number;
    additionalFees: Array<{label: string, amount: number}>;
    totalAmount: number;
    paymentLink: string;
  }): Promise<boolean> {
    const html = this.getBillingTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject: `Bill #: ${data.billNumber} for Packages - Payment Required`,
      html,
    });
  }

  private getBillingTemplate(data: {
    customerName: string;
    billNumber: string;
    packages: Array<{
      trackingNumber: string;
      shipper?: string;
      weight?: number;
      itemValue: number;
      shippingFee: number;
      customsFee: number;
      total: number;
      content?: string;
      description?: string;
      itemDescription?: string;
    }>;
    itemTotal: number;
    shippingFee: number;
    customsFee: number;
    additionalFees: Array<{label: string, amount: number}>;
    totalAmount: number;
    paymentLink: string;
    currency?: string;
  }): string {
    const { CurrencyService } = require('./currency-service');
    const currencyCode = data.currency || 'USD';
    const formatMoney = (value: number) => CurrencyService.format(value, currencyCode);
    
    // Format packages table rows with content/description
    const packagesRows = (data.packages as Array<{
      trackingNumber: string;
      shipper?: string;
      weight?: number;
      itemValue: number;
      shippingFee: number;
      customsFee: number;
      total: number;
      content?: string;
      description?: string;
      itemDescription?: string;
    }>).map((pkg: {
      trackingNumber: string;
      shipper?: string;
      weight?: number;
      itemValue: number;
      shippingFee: number;
      customsFee: number;
      total: number;
      content?: string;
      description?: string;
      itemDescription?: string;
    }) => {
      // Get package content from any available field
      const packageContent = pkg.content || pkg.description || pkg.itemDescription || 'N/A';
      return `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left;">${pkg.trackingNumber}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left;">${pkg.shipper}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; max-width: 200px; word-wrap: break-word;">${packageContent}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${pkg.weight} kg</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatMoney(pkg.itemValue)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatMoney(pkg.shippingFee)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatMoney(pkg.total)}</td>
      </tr>`
    }).join('');

    // Format additional fees
    const additionalFeesRows = data.additionalFees?.length > 0 
      ? data.additionalFees.map(fee => 
          `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb;">
            <span style="color: #6b7280;">${fee.label}</span>
            <span style="font-weight: 500;">${formatMoney(fee.amount)}</span>
          </div>`
        ).join('')
      : '';

    return this.getEmailWrapper(`
      <h2 style="color: #0f4d8a; margin-top: 0;">📄 Your Bill is Ready for Payment</h2>
      <p>Dear ${data.customerName},</p>
      
      <p>Your package invoice(s) have been reviewed and a bill has been generated. Please review the details below and make your payment to proceed with delivery.</p>
      
      <div class="info-box" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left-color: #0f4d8a;">
        <p style="margin: 0 0 8px 0;"><strong style="color: #0f4d8a;">Bill Number:</strong> <span style="font-size: 18px; font-weight: bold; color: #0f4d8a;">${data.billNumber}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Total Packages:</strong> ${data.packages.length}</p>
        <p style="margin: 0;"><strong>Total Amount Due:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 20px;">${formatMoney(data.totalAmount)}</span></p>
      </div>

      <h3 style="color: #374151; margin-top: 24px;">📦 Package Details:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: linear-gradient(135deg, #0f4d8a 0%, #1e6bb8 100%); color: white;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Tracking #</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Merchant</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Package Content</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Weight</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Item Value</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Shipping Fee</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${packagesRows}
        </tbody>
      </table>

      <h3 style="color: #374151; margin-top: 24px;">💰 Bill Summary:</h3>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb;">
          <span style="color: #6b7280;">Item Total</span>
          <span style="font-weight: 500;">${formatMoney(data.itemTotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb;">
          <span style="color: #6b7280;">Shipping Fee</span>
          <span style="font-weight: 500;">${formatMoney(data.shippingFee)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb;">
          <span style="color: #6b7280;">Customs/Duty Fee</span>
          <span style="font-weight: 500;">${formatMoney(data.customsFee)}</span>
        </div>
        ${additionalFeesRows}
        <div style="display: flex; justify-content: space-between; padding: 12px 0 0 0; margin-top: 8px; border-top: 2px solid #0f4d8a;">
          <span style="font-weight: bold; color: #0f4d8a; font-size: 16px;">Total Due</span>
          <span style="font-weight: bold; color: #dc2626; font-size: 18px;">${formatMoney(data.totalAmount)}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.paymentLink}" class="button" style="background: #dc2626; padding: 16px 40px; font-size: 16px; display: inline-block; text-decoration: none; color: white; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
          💳 Pay Online For Your Package
        </a>
        <p style="margin-top: 12px; font-size: 14px; color: #6b7280;">
          Click the button above to view and pay your bill securely online.
        </p>
      </div>
      
      <div class="info-box" style="background: #fffbeb; border-left-color: #f59e0b;">
        <h4 style="color: #92400e; margin-top: 0;">⚠️ Important Information:</h4>
        <ul style="color: #92400e; margin-bottom: 0;">
          <li>Please ensure payment is made promptly to avoid delivery delays</li>
          <li>Your package will be processed for delivery within 24 hours after payment confirmation</li>
          <li>If you have any questions about your bill, please contact our support team</li>
          <li>Keep your bill number (${data.billNumber}) for reference</li>
        </ul>
      </div>
      
      <p style="margin-top: 24px;">Thank you for choosing Clean J Shipping!</p>
    `);
  }

  private getBroadcastTemplate(data: { body: string }): string {
    return this.getEmailWrapper(`
      <div style="white-space: pre-wrap;">${data.body}</div>
    `);
  }

  private getInvoiceTemplate(data: {
    customerName: string;
    invoiceNumber: string;
    trackingNumber: string;
    totalAmount: number;
    paymentLink: string;
    items: Array<{
      description: string;
      quantity: number;
      total: number;
    }>;
    currency?: string;
  }): string {
    const { CurrencyService } = require('./currency-service');
    const currencyCode = data.currency || 'JMD';
    const formatMoney = (value: number) => CurrencyService.format(value, currencyCode);
    
    // Format items for email
    const itemsList = data.items.map(item => 
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatMoney(item.total)}</td>
      </tr>`
    ).join('');

    return this.getEmailWrapper(`
      <h2>💳 Invoice Generated - Payment Required</h2>
      <p>Dear ${data.customerName},</p>
      
      <p>Your package has been processed and an invoice has been generated. Please review the details below and make your payment to proceed with delivery.</p>
      
      <div class="info-box">
        <p><strong>Invoice Number:</strong> <span class="highlight">${data.invoiceNumber}</span></p>
        <p><strong>Tracking Number:</strong> <span class="highlight">${data.trackingNumber}</span></p>
        <p><strong>Total Amount Due:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 18px;">${formatMoney(data.totalAmount)}</span></p>
      </div>

      <h3>📋 Invoice Details:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white;">
        <thead>
          <tr>
            <th style="background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
            <th style="background: #f3f4f6; padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
            <th style="background: #f3f4f6; padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.paymentLink}" class="button" style="background: #10b981;">
          💳 Pay Online For Your Package
        </a>
        <p style="margin-top: 10px; font-size: 14px; color: #666;">
          Click the button above to view and pay your invoice securely online.<br>
          This link will expire in 7 days.
        </p>
      </div>
      
      <div class="info-box">
        <h4>⚠️ Important Information:</h4>
        <ul>
          <li>Please ensure payment is made promptly to avoid delivery delays</li>
          <li>Your package will be processed for delivery within 24 hours after payment confirmation</li>
          <li>If you have already paid for these goods, please contact our support team</li>
        </ul>
      </div>
      
      <p>Thank you for choosing Clean J Shipping!</p>
    `);
  }
}

// Singleton instance
export const emailService = new EmailService();