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
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" } as const;
  const { to, firstName, resetUrl } = opts;
  const subject = `Reset your password for ${APP_NAME}`;
  const html = `
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
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };

  const { to, firstName, trackingNumber, status, weight, shipper } = opts;

  const subject = `New Package Received — ${trackingNumber}`;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px 0;">New Package Received</h2>
    <p>Hi ${firstName || "Customer"},</p>
    <p>Great news! We have received a new package for you.</p>
    <h3 style="margin:16px 0 8px 0;">Package Information</h3>
    <ul style="padding-left:16px;">
      <li><strong>Shipper:</strong> ${shipper || "UNKNOWN"}</li>
      <li><strong>Tracking Number:</strong> ${trackingNumber}</li>
      <li><strong>Weight:</strong> ${weight ?? "-"}</li>
      <li><strong>Status:</strong> ${status}</li>
    </ul>
    <p>
      You can view live updates in your portal.
    </p>
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
