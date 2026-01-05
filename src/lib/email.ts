import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Clean J Shipping";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!EMAIL_USER || !EMAIL_PASS) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
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
  await t.sendMail({ from: EMAIL_USER, to, subject, html });
  return { sent: true } as const;
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
  
  await t.sendMail({ from: EMAIL_USER, to, subject, html });
  return { sent: true } as const;
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
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };

  const { to, firstName, trackingNumber, status, weight, shipper, warehouse, receivedBy, receivedDate } = opts;

  const subject = `Package Received at Warehouse — ${trackingNumber}`;
  const receivedDateStr = receivedDate ? new Date(receivedDate).toLocaleString() : new Date().toLocaleString();
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
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#374151;font-weight:600;">Received By:</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${receivedBy || "Warehouse Staff"}</td>
          </tr>
          <tr>
            <td style="padding:8px;color:#374151;font-weight:600;">Received Date:</td>
            <td style="padding:8px;">${receivedDateStr}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0;">
      <h4 style="margin:0 0 8px 0;color:#92400e;">📋 Invoice Information Required</h4>
      <p style="margin:0;color:#92400e;">Please provide the invoice value of your goods through the customer portal. This information is required for customs clearance and will help us calculate any applicable duties and taxes.</p>
      <p style="margin:8px 0 0 0;">
        <a href="${APP_URL}/customer/invoice-upload" style="display:inline-block;background:#E67919;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
          Upload Invoice
        </a>
      </p>
    </div>
    
    <p style="margin-top:16px;">You can view live tracking updates and manage your package in your customer portal.</p>
    <p style="margin-top:8px;">If you have any questions, please don't hesitate to contact us.</p>
  </div>`;

  await t.sendMail({
    from: EMAIL_USER,
    to,
    subject,
    html,
  });
  return { sent: true };
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
  await t.sendMail({ from: EMAIL_USER, to, subject, html });
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
  const to = ADMIN_EMAIL || EMAIL_USER;
  if (!to) return { sent: false, reason: "No admin email configured" };

  const subject = `[Support] ${opts.subject}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">New Support Contact</h2>
    <p><strong>From:</strong> ${opts.name ? opts.name + " — " : ""}${opts.fromEmail}</p>
    <p style="white-space:pre-wrap">${opts.message}</p>
  </div>`;

  await t.sendMail({
    from: EMAIL_USER,
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
    from: EMAIL_USER,
    to,
    subject,
    html,
  });
  return { sent: true };
}
