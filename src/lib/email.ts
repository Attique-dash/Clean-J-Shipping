import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

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
