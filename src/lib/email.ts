import nodemailer from "nodemailer";

const SMTP_USER = process.env.SMTP_USER || process.env.SMTP_USER;
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.SMTP_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Clean J Shipping";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// SMTP configuration (matching warehouse-backend)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!SMTP_USER || !EMAIL_PASS) {
    console.warn("Email not configured: SMTP_USER/SMTP_USER or EMAIL_PASS/SMTP_PASS missing");
    return null;
  }
  if (transporter) return transporter;
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: { user: SMTP_USER, pass: EMAIL_PASS },
    });
    console.log(`[Email] Transporter created with ${SMTP_HOST}:${SMTP_PORT}`);
    return transporter;
  } catch (error) {
    console.error("Failed to create email transporter:", error);
    return null;
  }
}

export async function sendPaymentReceiptEmail(opts: {
  to: string;
  firstName?: string;
  amount: number;
  currency: string;
  method?: string;
  trackingNumber?: string;
  reference?: string;
  receiptNumber?: string;
  paidAt?: Date | string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" } as const;
  const { to, firstName, amount, currency, method, trackingNumber, reference, receiptNumber, paidAt } = opts;
  const subject = `${APP_NAME} — Payment Receipt ${receiptNumber ? `#${receiptNumber}` : ""}`.trim();
  const paidDate = paidAt ? new Date(paidAt).toLocaleString() : new Date().toLocaleString();
  const amountFmt = new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "USD").toUpperCase() }).format(amount);
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">Payment Receipt</h2>
    <p>Hi ${firstName || "there"},</p>
    <p>Thanks for your payment. Here are your receipt details:</p>
    <table style="border-collapse:collapse">
      <tbody>
        <tr><td style="padding:4px 8px;color:#374151">Amount</td><td style="padding:4px 8px"><strong>${amountFmt}</strong></td></tr>
        <tr><td style="padding:4px 8px;color:#374151">Currency</td><td style="padding:4px 8px">${(currency || "USD").toUpperCase()}</td></tr>
        ${method ? `<tr><td style="padding:4px 8px;color:#374151">Method</td><td style=\"padding:4px 8px\">${method}</td></tr>` : ""}
        ${trackingNumber ? `<tr><td style="padding:4px 8px;color:#374151">Tracking</td><td style=\"padding:4px 8px\">${trackingNumber}</td></tr>` : ""}
        ${reference ? `<tr><td style="padding:4px 8px;color:#374151">Reference</td><td style=\"padding:4px 8px\">${reference}</td></tr>` : ""}
        ${receiptNumber ? `<tr><td style="padding:4px 8px;color:#374151">Receipt #</td><td style=\"padding:4px 8px\">${receiptNumber}</td></tr>` : ""}
        <tr><td style="padding:4px 8px;color:#374151">Paid at</td><td style="padding:4px 8px">${paidDate}</td></tr>
      </tbody>
    </table>
    <p style="margin-top:16px">If you have any questions, reply to this email.</p>
  </div>`;
  try {
    await t.sendMail({ from: SMTP_USER, to, subject, html });
    return { sent: true } as const;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Email send error:", errorMessage);
    // Return failure but don't throw - let caller handle it
    return { sent: false, reason: errorMessage } as const;
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName?: string;
  resetUrl: string;
  isOtp?: boolean;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" } as const;
  const { to, firstName, resetUrl, isOtp } = opts;
  const subject = `Reset your password for ${APP_NAME}`;
  
  const html = isOtp ? `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">Password reset request</h2>
    <p>Hi ${firstName || "there"},</p>
    <p>We received a request to reset your password for ${APP_NAME}. If you didn't request this, you can ignore this email.</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 8px 0;color:#374151;font-size:14px;">Your verification code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:2px;color:#E67919;background:#fff;padding:12px;border-radius:4px;border:2px solid #E67919;">
        ${resetUrl.replace('Your OTP is: ', '')}
      </div>
      <p style="margin:8px 0 0 0;color:#6b7280;font-size:12px;">This code will expire in 10 minutes</p>
    </div>
    <p>Enter this code on the password reset page to continue.</p>
  </div>` : `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">Password reset request</h2>
    <p>Hi ${firstName || "there"},</p>
    <p>We received a request to reset your password for ${APP_NAME}. If you didn't request this, you can ignore this email.</p>
    <p style="margin:16px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#E67919;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
    </p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break:break-all;color:#374151">${resetUrl}</p>
  </div>`;
  
  await t.sendMail({ from: SMTP_USER, to, subject, html });
  return { sent: true } as const;
}

// Helper function to format warehouse address for email
function formatWarehouseAddress(address: unknown): string {
  if (!address) return '';
  
  // If it's already a formatted string with newlines, return as-is
  if (typeof address === 'string') {
    // Check if it looks like a JSON string
    if (address.trim().startsWith('{') && address.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(address);
        return formatAddressObject(parsed);
      } catch {
        return address;
      }
    }
    return address;
  }
  
  // If it's an object, format it nicely
  if (typeof address === 'object' && address !== null) {
    return formatAddressObject(address as Record<string, string>);
  }
  
  return String(address);
}

function formatAddressObject(obj: Record<string, string>): string {
  const parts: string[] = [];
  
  if (obj.name) parts.push(obj.name);
  if (obj.street || obj.address) parts.push(obj.street || obj.address || '');
  if (obj.city || obj.state || obj.zipCode || obj.zip) {
    const cityParts = [obj.city, obj.state, obj.zipCode || obj.zip].filter(Boolean);
    if (cityParts.length) parts.push(cityParts.join(', '));
  }
  if (obj.country) parts.push(obj.country);
  if (obj.phone) parts.push(`Phone: ${obj.phone}`);
  if (obj.email) parts.push(`Email: ${obj.email}`);
  if (obj.instructions) parts.push(`Note: ${obj.instructions}`);
  
  return parts.join('\n');
}

export async function sendNewPackageEmail(opts: {
  to: string;
  firstName: string;
  trackingNumber: string;
  status: string;
  weight?: number;
  shipper?: string;
  warehouse?: string;
  receivedBy?: string;
  receivedDate?: Date;
  invoiceId?: string; // NEW: Optional invoice ID to attach PDF
  description?: string; // Package description/contents
  itemDescription?: string; // Item description
  warehouseAddresses?: {
    airAddress?: string;
    seaAddress?: string;
    chinaAddress?: string;
  };
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };

  const { to, firstName, trackingNumber, status, weight, shipper, warehouse, receivedBy, receivedDate, invoiceId, description, itemDescription, warehouseAddresses } = opts;

  const subject = `Package Received at Warehouse — ${trackingNumber}`;
  const receivedDateStr = receivedDate ? new Date(receivedDate).toLocaleString() : new Date().toLocaleString();
  
  // Package contents/description
  const packageContents = itemDescription || description || "Package received at warehouse";
  
  // Try to generate and attach invoice PDF if invoiceId is provided
  const attachments: Array<{ filename: string; path: string; contentType: string }> = [];
  if (invoiceId) {
    try {
      const { dbConnect } = await import('@/lib/db');
      const Invoice = (await import('@/models/Invoice')).default;
      const { generateInvoicePdf } = await import('@/lib/pdfGenerator');
      
      await dbConnect();
      const invoice = await Invoice.findById(invoiceId).lean();
      
      if (invoice) {
        const company = {
          name: APP_NAME,
          address: "Kingston",
          city: "Kingston",
          state: "Kingston",
          zip: "00000",
          country: "Jamaica",
          phone: "+1-876-XXX-XXXX",
          email: ADMIN_EMAIL || "info@cleanjshipping.com",
          website: APP_URL || "https://cleanjshipping.com",
        };
        
        const pdfResult = await generateInvoicePdf({
          invoice: invoice as any,
          company,
        });
        
        attachments.push({
          filename: pdfResult.fileName,
          path: pdfResult.filePath,
          contentType: 'application/pdf',
        });
      }
    } catch (pdfError) {
      console.error('Failed to generate invoice PDF for email:', pdfError);
      // Continue without PDF attachment
    }
  }
  
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">Package Received at Warehouse</h2>
    <p>Hi ${firstName || "Customer"},</p>
    <p>Great news! We have received your package at our warehouse. Here are the details:</p>
    
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
      <h3 style="margin:0 0 12px 0;color:#1e40af;">Package Information</h3>
      <table style="border-collapse:collapse;width:100%;">
        <tbody>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;width:140px;">Tracking Number:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;"><strong>${trackingNumber}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Package Contents:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${packageContents}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Shipper:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${shipper || "UNKNOWN"}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Weight:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${weight ? `${weight} kg` : "-"}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Status:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
              <span style="background:#10b981;color:white;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;">
                ${status}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Warehouse:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${warehouse || "Main Warehouse"}</td>
          </tr>
          <tr>
            <td style="padding:8px;color:#374151;font-weight:600;">Received Date:</td>
            <td style="padding:8px;">${receivedDateStr}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    ${warehouseAddresses ? `
    <div style="background:#eff6ff;border:1px solid #3b82f6;border-radius:8px;padding:16px;margin:16px 0;">
      <h3 style="margin:0 0 12px 0;color:#1e40af;">📍 Our Warehouse Addresses</h3>
      <p style="margin:0 0 12px 0;color:#374151;font-size:14px;">Use these addresses when shipping packages to us:</p>
      ${warehouseAddresses.airAddress ? `
      <div style="background:white;border:1px solid #bfdbfe;border-radius:6px;padding:12px;margin-bottom:8px;">
        <p style="margin:0 0 4px 0;color:#1e40af;font-weight:600;font-size:13px;">✈️ Air Shipments</p>
        <p style="margin:0;color:#374151;font-size:13px;white-space:pre-line;">${formatWarehouseAddress(warehouseAddresses.airAddress)}</p>
      </div>
      ` : ''}
      ${warehouseAddresses.seaAddress ? `
      <div style="background:white;border:1px solid #bfdbfe;border-radius:6px;padding:12px;margin-bottom:8px;">
        <p style="margin:0 0 4px 0;color:#0369a1;font-weight:600;font-size:13px;">🚢 Sea Shipments</p>
        <p style="margin:0;color:#374151;font-size:13px;white-space:pre-line;">${formatWarehouseAddress(warehouseAddresses.seaAddress)}</p>
      </div>
      ` : ''}
      ${warehouseAddresses.chinaAddress ? `
      <div style="background:white;border:1px solid #bfdbfe;border-radius:6px;padding:12px;">
        <p style="margin:0 0 4px 0;color:#dc2626;font-weight:600;font-size:13px;">🇨🇳 China Warehouse</p>
        <p style="margin:0;color:#374151;font-size:13px;white-space:pre-line;">${formatWarehouseAddress(warehouseAddresses.chinaAddress)}</p>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    ${attachments.length > 0 ? `
    <div style="background:#dbeafe;border:1px solid #3b82f6;border-radius:8px;padding:16px;margin:16px 0;">
      <h4 style="margin:0 0 8px 0;color:#1e40af;">📄 Invoice Attached</h4>
      <p style="margin:0;color:#1e40af;">Your billing invoice has been generated and attached to this email. Please review the invoice and make payment through the customer portal.</p>
    </div>
    ` : ''}
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0;">
      <h4 style="margin:0 0 8px 0;color:#92400e;">📋 Invoice Information Required</h4>
      <p style="margin:0;color:#92400e;">Please provide the invoice value of your goods through the customer portal. This information is required for customs clearance and will help us calculate any applicable duties and taxes.</p>
      <p style="margin:8px 0 0 0;">
        <a href="https://clean-j-shipping.vercel.app/customer/invoice-upload" style="display:inline-block;background:#E67919;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
          Upload Invoice
        </a>
      </p>
    </div>
    
    <p style="margin-top:16px;">You can view live tracking updates and manage your package in your customer portal.</p>
    <p style="margin-top:8px;">If you have any questions, please don't hesitate to contact us.</p>
  </div>`;

  try {
    await t.sendMail({
      from: SMTP_USER,
      to,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    console.log(`[Email] Package notification sent to ${to} for tracking ${trackingNumber}`);
    return { sent: true };
  } catch (error: any) {
    console.error(`[Email] Failed to send package notification to ${to}:`, error.message);
    return { sent: false, reason: error.message };
  }
}

export async function sendVerificationEmail(opts: {
  to: string;
  firstName?: string;
  verifyUrl: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" } as const;
  const { to, firstName, verifyUrl } = opts;
  const subject = `Verify your email for ${APP_NAME}`;
  const safeUrl = verifyUrl || APP_URL || "";
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">Confirm your email</h2>
    <p>Hi ${firstName || "there"},</p>
    <p>Thanks for creating your account at ${APP_NAME}. Please confirm your email to activate your account.</p>
    <p style="margin:16px 0;">
      <a href="${safeUrl}" style="display:inline-block;background:#E67919;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
    </p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break:break-all;color:#374151">${safeUrl}</p>
  </div>`;
  await t.sendMail({ from: SMTP_USER, to, subject, html });
  return { sent: true } as const;
}

export async function sendSupportContactEmail(opts: {
  fromEmail: string;
  name?: string;
  subject: string;
  message: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };
  const to = ADMIN_EMAIL || SMTP_USER;
  if (!to) return { sent: false, reason: "No admin email configured" };

  const subject = `[Support] ${opts.subject}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">New Support Contact</h2>
    <p><strong>From:</strong> ${opts.name ? opts.name + " — " : ""}${opts.fromEmail}</p>
    <p style="white-space:pre-wrap">${opts.message}</p>
  </div>`;

  await t.sendMail({
    from: SMTP_USER,
    to,
    subject,
    html,
    replyTo: opts.fromEmail,
  });
  return { sent: true };
}

export async function sendStatusUpdateEmail(opts: {
  to: string;
  firstName: string;
  trackingNumber: string;
  status: string;
  note?: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };

  const { to, firstName, trackingNumber, status, note } = opts;
  const subject = `Package Update — ${trackingNumber} is now ${status}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">Package Status Updated</h2>
    <p>Hi ${firstName || "Customer"},</p>
    <p>Your package has a new status: <strong>${status}</strong>.</p>
    ${note ? `<p style="margin:8px 0 0 0;color:#374151">Note: ${note}</p>` : ""}
    <p style="margin-top:16px;">You can view live tracking updates in your customer portal.</p>
  </div>`;

  await t.sendMail({
    from: SMTP_USER,
    to,
    subject,
    html,
  });
  return { sent: true };
}

export async function sendPackageNotificationToRecipient(opts: {
  to: string;
  recipientName: string;
  trackingNumber: string;
  shipper?: string;
  weight?: number;
  warehouse?: string;
  receivedDate?: Date;
  customerName?: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };

  const { to, recipientName, trackingNumber, shipper, weight, warehouse, receivedDate, customerName } = opts;
  const subject = `Package Notification — ${trackingNumber}`;
  const receivedDateStr = receivedDate ? new Date(receivedDate).toLocaleString() : new Date().toLocaleString();
  
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">Package Notification</h2>
    <p>Hi ${recipientName || "Recipient"},</p>
    <p>A package has been received at our warehouse${customerName ? ` for ${customerName}` : ""}.</p>
    
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
      <h3 style="margin:0 0 12px 0;color:#1e40af;">Package Information</h3>
      <table style="border-collapse:collapse;width:100%;">
        <tbody>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;width:140px;">Tracking Number:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;"><strong>${trackingNumber}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Shipper:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${shipper || "UNKNOWN"}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Weight:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${weight ? `${weight} kg` : "-"}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Warehouse:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${warehouse || "Main Warehouse"}</td>
          </tr>
          <tr>
            <td style="padding:8px;color:#374151;font-weight:600;">Received Date:</td>
            <td style="padding:8px;">${receivedDateStr}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <p style="margin-top:16px;">You can track this package using the tracking number above.</p>
    <p style="margin-top:8px;">If you have any questions, please don't hesitate to contact us.</p>
  </div>`;

  await t.sendMail({
    from: SMTP_USER,
    to,
    subject,
    html,
  });
  return { sent: true };
}

// ============== PAYPAL PAYMENT EMAILS ==============

export async function sendBillCreatedEmail(opts: {
  to: string;
  firstName?: string;
  billNumber: string;
  amount: number;
  currency: string;
  dueDate?: Date;
  paymentUrl?: string;
  packageCount: number;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };

  const { to, firstName, billNumber, amount, currency, dueDate, paymentUrl, packageCount } = opts;
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A';
  
  const subject = `New Bill Created — #${billNumber}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#0f4d8a 0%,#1e6bb8 100%);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:24px;">New Bill Available</h1>
    </div>
    <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p style="font-size:16px;margin:0 0 16px 0;">Hi ${firstName || "Customer"},</p>
      <p style="font-size:16px;margin:0 0 16px 0;">A new bill has been created for your packages.</p>
      
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Bill Number:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:16px;">${billNumber}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Packages:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:16px;">${packageCount}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Due Date:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:16px;">${dueDateStr}</td>
          </tr>
          <tr style="border-top:2px solid #e5e7eb;">
            <td style="padding:12px 0 0 0;color:#111;font-size:16px;font-weight:600;">Total Amount:</td>
            <td style="padding:12px 0 0 0;text-align:right;font-weight:700;font-size:20px;color:#059669;">${currency} ${amount.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      ${paymentUrl ? `
      <div style="text-align:center;margin:32px 0;">
        <a href="${paymentUrl}" style="background:linear-gradient(135deg,#0f4d8a 0%,#1e6bb8 100%);color:#fff;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">Pay Now with PayPal</a>
      </div>
      <p style="font-size:14px;color:#6b7280;text-align:center;margin:16px 0;">Click the button above to pay securely via PayPal</p>
      ` : '<p style="font-size:14px;color:#6b7280;">Payment link will be sent separately.</p>'}
      
      <p style="font-size:14px;color:#6b7280;margin:24px 0 0 0;">Questions? Contact us at <a href="mailto:support@cleanjshipping.com" style="color:#0f4d8a;">support@cleanjshipping.com</a></p>
    </div>
  </div>`;

  await t.sendMail({ from: SMTP_USER, to, subject, html });
  return { sent: true };
}

export async function sendPaymentConfirmationEmail(opts: {
  to?: string;
  firstName?: string;
  billNumber: string;
  amount: number;
  currency: string;
  paidAt: Date;
  paypalOrderId: string;
  transactionId?: string;
  packageCount: number;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };
  if (!opts.to) return { sent: false, reason: "No recipient email" };

  const { to, firstName, billNumber, amount, currency, paidAt, paypalOrderId, transactionId, packageCount } = opts;
  const paidDateStr = new Date(paidAt).toLocaleString();
  
  const subject = `Payment Confirmed — Bill #${billNumber}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Payment Successful!</h1>
    </div>
    <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p style="font-size:16px;margin:0 0 16px 0;">Hi ${firstName || "Customer"},</p>
      <p style="font-size:16px;margin:0 0 16px 0;">Thank you for your payment. Your bill has been paid successfully.</p>
      
      <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="text-align:center;font-size:18px;font-weight:700;color:#059669;margin:0 0 16px 0;">Payment Confirmed</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Bill Number:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${billNumber}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Amount Paid:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#059669;">${currency} ${amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Paid At:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${paidDateStr}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Transaction ID:</td>
            <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px;">${transactionId || paypalOrderId}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size:16px;margin:24px 0 8px 0;"><strong>Your packages are now ready for pickup!</strong></p>
      <p style="font-size:14px;color:#6b7280;margin:0;">You can collect your ${packageCount} package${packageCount !== 1 ? 's' : ''} at your convenience.</p>
      
      <div style="text-align:center;margin:32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customer/dashboard" style="background:#0f4d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">View My Packages</a>
      </div>
      
      <p style="font-size:14px;color:#6b7280;margin:24px 0 0 0;">Questions? Contact us at <a href="mailto:support@cleanjshipping.com" style="color:#0f4d8a;">support@cleanjshipping.com</a></p>
    </div>
  </div>`;

  await t.sendMail({ from: SMTP_USER, to, subject, html });
  return { sent: true };
}

export async function sendPaymentFailedEmail(opts: {
  to?: string;
  firstName?: string;
  billNumber: string;
  amount: number;
  currency: string;
  reason: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };
  if (!opts.to) return { sent: false, reason: "No recipient email" };

  const { to, firstName, billNumber, amount, currency, reason } = opts;
  
  const subject = `Payment Failed — Bill #${billNumber}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Payment Failed</h1>
    </div>
    <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p style="font-size:16px;margin:0 0 16px 0;">Hi ${firstName || "Customer"},</p>
      <p style="font-size:16px;margin:0 0 16px 0;">Unfortunately, your payment for bill <strong>${billNumber}</strong> could not be processed.</p>
      
      <div style="background:#fef2f2;border:1px solid #ef4444;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="text-align:center;font-size:16px;font-weight:600;color:#dc2626;margin:0 0 16px 0;">❌ Payment Declined</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Amount:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${currency} ${amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Reason:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#dc2626;">${reason}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size:16px;margin:24px 0 8px 0;"><strong>What to do next:</strong></p>
      <ul style="font-size:14px;color:#6b7280;margin:0 0 24px 0;padding-left:20px;">
        <li>Check your payment method has sufficient funds</li>
        <li>Try a different payment method</li>
        <li>Contact your bank if the issue persists</li>
      </ul>
      
      <div style="text-align:center;margin:32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customer/bills" style="background:#0f4d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">Try Payment Again</a>
      </div>
      
      <p style="font-size:14px;color:#6b7280;margin:24px 0 0 0;">Need help? Contact us at <a href="mailto:support@cleanjshipping.com" style="color:#0f4d8a;">support@cleanjshipping.com</a></p>
    </div>
  </div>`;

  await t.sendMail({ from: SMTP_USER, to, subject, html });
  return { sent: true };
}

export async function sendAdminPaymentNotification(opts: {
  billNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  packageCount: number;
  packageIds: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return { sent: false, reason: "No admin email configured" };

  const { billNumber, customerName, customerEmail, amount, currency, packageCount, packageIds } = opts;
  
  const subject = `Payment Received — Bill #${billNumber}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:20px;">💰 New Payment Received</h1>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p style="font-size:14px;color:#6b7280;margin:0 0 16px 0;">A customer has paid their bill. Packages are now ready for pickup.</p>
      
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Bill:</td><td style="padding:6px 0;font-weight:600;">${billNumber}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Customer:</td><td style="padding:6px 0;">${customerName}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email:</td><td style="padding:6px 0;">${customerEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Amount:</td><td style="padding:6px 0;font-weight:700;color:#059669;">${currency} ${amount.toFixed(2)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Packages:</td><td style="padding:6px 0;">${packageCount}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Tracking #s:</td><td style="padding:6px 0;font-family:monospace;font-size:12px;word-break:break-all;">${packageIds}</td></tr>
      </table>
    </div>
  </div>`;

  await t.sendMail({ from: SMTP_USER, to: adminEmail, subject, html });
  return { sent: true };
}
