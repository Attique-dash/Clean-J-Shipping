import PDFDocument from 'pdfkit';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { format } from 'date-fns';
import { IInvoice } from '@/models/Invoice';
import { CurrencyService } from '@/lib/currency-service';

const UPLOAD_DIR = '/tmp/invoices';

function formatPdfAddress(value: unknown): string {
  const parsed = parseAddressValue(value);
  return parsed.replace(/\s*\n\s*/g, '\n');
}

function parseAddressValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const withoutBraces = trimmed.slice(1, -1);
      const parts = withoutBraces
        .split(/,\s*|\n+/)
        .map((part) => part.trim().replace(/^['"]?|['"]?$/g, '').replace(/^[^:]+:\s*/, ''))
        .filter(Boolean);
      if (parts.length) return parts.join('\n');
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.values(parsed)
          .filter((part) => typeof part === 'string' && part.trim())
          .join('\n');
      }
    } catch {
      // not JSON
    }
    return trimmed;
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .filter((part) => typeof part === 'string' && part.trim())
      .join('\n');
  }
  return String(value);
}

interface GeneratePdfOptions {
  invoice: IInvoice;
  company: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    logoUrl?: string;
    taxId?: string;
  };
  signatureUrl?: string;
}

export async function generateInvoicePdf(options: GeneratePdfOptions): Promise<{ filePath: string; fileName: string }> {
  const { invoice } = options;
  
  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
  const filePath = join(UPLOAD_DIR, fileName);
  
  // Create a new PDF document
  const doc = new PDFDocument();
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  // Add invoice header
  const currencyCode = (invoice.currency || 'JMD').toUpperCase();
  const currencySymbol = CurrencyService.getCurrencyInfo(currencyCode)?.symbol || currencyCode;
  const formatMoney = (value: number) => `${currencySymbol}${value.toFixed(2)}`;

  const startX = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftWidth = pageWidth * 0.55;
  const rightWidth = pageWidth - leftWidth;
  const headerTop = doc.y;

  doc.font('Helvetica-Bold').fontSize(18).text(options.company.name, startX, headerTop, {
    width: leftWidth,
  });

  const companyLines = [
    formatPdfAddress(options.company.address),
    [options.company.city, options.company.state, options.company.zip].filter(Boolean).join(', '),
    options.company.country,
    options.company.phone ? `Phone: ${options.company.phone}` : '',
    options.company.email ? `Email: ${options.company.email}` : '',
    options.company.website ? options.company.website : '',
  ]
    .filter(Boolean)
    .join('\n');

  doc.font('Helvetica').fontSize(9).text(companyLines, startX, doc.y + 4, {
    width: leftWidth,
    lineGap: 3,
  });

  const rightX = startX + leftWidth;
  const invoiceTitleTop = headerTop;
  doc.font('Helvetica-Bold').fontSize(24).text('INVOICE', rightX, invoiceTitleTop, {
    width: rightWidth,
    align: 'right',
  });

  const invoiceMetaTop = doc.y + 4;
  const invoiceMeta = [
    `Invoice #: ${invoice.invoiceNumber}`,
    `Issue Date: ${format(new Date(invoice.issueDate), 'MMM dd, yyyy')}`,
    `Due Date: ${format(new Date(invoice.dueDate), 'MMM dd, yyyy')}`,
    invoice.tracking_number ? `Tracking: ${invoice.tracking_number}` : '',
    invoice.status ? `Status: ${invoice.status}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  doc.font('Helvetica').fontSize(10).text(invoiceMeta, rightX, invoiceTitleTop + 28, {
    width: rightWidth,
    align: 'right',
    lineGap: 4,
  });

  doc.moveDown(1);
  const sectionY = Math.max(doc.y, headerTop + 90);
  doc.moveTo(startX, sectionY).lineTo(startX + pageWidth, sectionY).lineWidth(1).stroke();
  doc.moveDown(0.5);

  // Bill to + invoice summary section
  const billToTop = doc.y;
  const customerLines = [
    invoice.customer.name,
    formatPdfAddress(invoice.customer.address),
    [invoice.customer.city, invoice.customer.state, (invoice.customer as any).zipCode].filter(Boolean).join(', '),
    invoice.customer.country,
    invoice.customer.phone ? `Phone: ${invoice.customer.phone}` : '',
    invoice.customer.email ? `Email: ${invoice.customer.email}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  doc.font('Helvetica-Bold').fontSize(12).text('Bill To', startX, billToTop, { width: leftWidth });
  doc.font('Helvetica').fontSize(10).text(customerLines, startX, doc.y + 4, {
    width: leftWidth,
    lineGap: 3,
  });

  const summaryX = startX + leftWidth;
  const summaryWidth = rightWidth;
  const paymentSummary = [
    `Subtotal: ${formatMoney(invoice.subtotal)}`,
    `Tax: ${formatMoney(invoice.taxTotal)}`,
    `Discount: ${formatMoney(invoice.discountAmount)}`,
    `Total: ${formatMoney(invoice.total)}`,
    `Paid: ${formatMoney(invoice.amountPaid)}`,
    `Balance: ${formatMoney(invoice.balanceDue)}`,
  ].join('\n');
  doc.font('Helvetica-Bold').fontSize(10).text('Summary', summaryX, billToTop, {
    width: summaryWidth,
    align: 'right',
  });
  doc.font('Helvetica').fontSize(10).text(paymentSummary, summaryX, doc.y + 4, {
    width: summaryWidth,
    align: 'right',
    lineGap: 4,
  });

  doc.moveDown(1);

  // Table header
  const tableTop = doc.y;
  const descWidth = pageWidth * 0.4;
  const infoWidth = pageWidth * 0.25;
  const feeWidth = pageWidth * 0.15;
  const govtWidth = pageWidth * 0.1;
  const dueWidth = pageWidth * 0.1;

  doc.rect(startX, tableTop - 4, pageWidth, 22).fillOpacity(0.08).fillAndStroke('#000000', '#e0e0e0');
  doc.fillOpacity(1);
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
  doc.text('House AWB#', startX + 4, tableTop, { width: descWidth - 8 });
  doc.text('Information', startX + descWidth + 4, tableTop, { width: infoWidth - 8 });
  doc.text('Our Fees', startX + descWidth + infoWidth + 4, tableTop, { width: feeWidth - 8, align: 'right' });
  doc.text('Govt Fees', startX + descWidth + infoWidth + feeWidth + 4, tableTop, { width: govtWidth - 8, align: 'right' });
  doc.text('Due', startX + descWidth + infoWidth + feeWidth + govtWidth + 4, tableTop, { width: dueWidth - 8, align: 'right' });

  doc.font('Helvetica').fontSize(10);
  const rowY = tableTop + 24;
  const infoLines = [`Weight: ${invoice.items[0]?.quantity || 1} x ${formatMoney(invoice.items[0]?.unitPrice || 0)}`].filter(Boolean).join('\n');
  let currentY = rowY;

  invoice.items.forEach((item, index) => {
    const itemDesc = item.description || 'Item';
    const itemInfo = `Qty: ${item.quantity}`;
    const itemFee = formatMoney(item.total);
    const govFee = '$0.00';
    const dueFee = formatMoney(item.total);

    doc.text(itemDesc, startX + 4, currentY, { width: descWidth - 8 });
    doc.text(itemInfo, startX + descWidth + 4, currentY, { width: infoWidth - 8 });
    doc.text(itemFee, startX + descWidth + infoWidth + 4, currentY, { width: feeWidth - 8, align: 'right' });
    doc.text(govFee, startX + descWidth + infoWidth + feeWidth + 4, currentY, { width: govtWidth - 8, align: 'right' });
    doc.text(dueFee, startX + descWidth + infoWidth + feeWidth + govtWidth + 4, currentY, { width: dueWidth - 8, align: 'right' });
    currentY += 18;
  });

  doc.moveTo(startX, currentY + 6).lineTo(startX + pageWidth, currentY + 6).stroke('#e0e0e0');
  doc.y = currentY + 16;

  const bottomTop = doc.y;
  const columnWidth = pageWidth / 3;

  const thankYou = 'Thank you for your business!\nPlease print or save this for your records.';
  doc.font('Helvetica-Bold').fontSize(11).text('Thank you for your business!', startX, bottomTop, { width: columnWidth, lineGap: 4 });
  doc.font('Helvetica').fontSize(9).text('Please print or save this for your records.', startX, doc.y + 4, { width: columnWidth, lineGap: 4 });

  const paymentTitleX = startX + columnWidth;
  doc.font('Helvetica-Bold').fontSize(11).text('Payment Details', paymentTitleX, bottomTop, { width: columnWidth, align: 'center' });
  doc.font('Helvetica').fontSize(9).text(`Paid: ${formatMoney(invoice.amountPaid)}`, paymentTitleX, doc.y + 4, { width: columnWidth, align: 'center' });
  doc.text(`Balance: ${formatMoney(invoice.balanceDue)}`, paymentTitleX, doc.y + 2, { width: columnWidth, align: 'center' });

  const totalsX = startX + columnWidth * 2;
  doc.font('Helvetica-Bold').fontSize(11).text('Summary', totalsX, bottomTop, { width: columnWidth, align: 'right' });
  doc.font('Helvetica').fontSize(9).text(`Sub-Total: ${formatMoney(invoice.subtotal)}`, totalsX, doc.y + 4, { width: columnWidth, align: 'right' });
  doc.text(`Total: ${formatMoney(invoice.total)}`, totalsX, doc.y + 2, { width: columnWidth, align: 'right' });

  if (invoice.notes) {
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(10).text('Notes');
    doc.font('Helvetica').fontSize(9).text(invoice.notes, { paragraphGap: 4 });
  }

  doc.end();

  // Wait for the PDF to be written
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return {
    filePath,
    fileName
  };
}

// Helper function to generate an invoice and return the file path
// Note: In serverless environments like Vercel, PDFs are stored in /tmp and cannot be served via URL
// Use the filePath directly for email attachments or other purposes
export async function generateInvoicePdfUrl(invoice: IInvoice, company: GeneratePdfOptions['company'], signatureUrl?: string): Promise<string> {
  const result = await generateInvoicePdf({
    invoice,
    company,
    signatureUrl
  });
  return result.filePath;
}

// Helper function to send invoice email
export async function sendInvoiceEmail(
  to: string,
  subject: string,
  invoiceNumber: string,
  pdfPath: string
): Promise<boolean> {
  // This is a placeholder for email sending logic
  // In a real application, you would use a service like Nodemailer, SendGrid, etc.
  console.log(`Sending invoice ${invoiceNumber} to ${to}`);
  console.log(`PDF path: ${pdfPath}`);
  
  // Example using Nodemailer (uncomment and configure as needed)
  /*
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@example.com',
      pass: 'your-password',
    },
  });

  try {
    await transporter.sendMail({
      from: `"${companyName}" <noreply@example.com>`,
      to,
      subject,
      text: `Please find attached your invoice #${invoiceNumber}.`,
      html: `
        <p>Dear Customer,</p>
        <p>Please find attached your invoice #${invoiceNumber}.</p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>${companyName}</p>
      `,
      attachments: [{
        filename: `invoice-${invoiceNumber}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf'
      }]
    });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
  */
  
  return true; // Return true for development
}
