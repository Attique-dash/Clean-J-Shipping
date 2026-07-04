import PDFDocument from 'pdfkit';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { format } from 'date-fns';
import { IInvoice } from '@/models/Invoice';
import { CurrencyService } from '@/lib/currency-service';

const UPLOAD_DIR = '/tmp/invoices';

function formatPdfAddress(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.values(parsed)
          .filter((part) => typeof part === 'string' && part.trim())
          .join('\n');
      }
    } catch {
      // Not JSON
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

  doc.fontSize(18).text('INVOICE', { align: 'center', underline: true });
  doc.moveDown(0.5);

  // Company + invoice meta
  const startX = doc.x;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const halfWidth = pageWidth / 2;

  doc.fontSize(10).font('Helvetica-Bold').text(options.company.name, { width: halfWidth, continued: true });
  doc.font('Helvetica').fontSize(10).text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right', width: halfWidth });
  doc.moveDown(0.2);
  const companyAddress = formatPdfAddress(options.company.address);
  if (companyAddress) {
    doc.fontSize(9).text(companyAddress, { width: halfWidth });
  } else {
    doc.fontSize(9).text('', { width: halfWidth });
  }
  doc.text(`Issue Date: ${format(new Date(invoice.issueDate), 'MMM dd, yyyy')}`, { align: 'right', width: halfWidth });
  doc.text(`${options.company.city || ''}${options.company.city ? ', ' : ''}${options.company.state || ''}${options.company.zip ? ' ' + options.company.zip : ''}`, { width: halfWidth });
  doc.text(`Due Date: ${format(new Date(invoice.dueDate), 'MMM dd, yyyy')}`, { align: 'right', width: halfWidth });
  if (options.company.phone) doc.text(`Phone: ${options.company.phone}`, { width: halfWidth, continued: true });
  if (options.company.email) doc.text(`Email: ${options.company.email}`, { align: 'right', width: halfWidth });
  if (options.company.website) doc.text(`Website: ${options.company.website}`, { width: halfWidth, continued: true });
  doc.moveDown(0.5);

  // Bill to section
  doc.font('Helvetica-Bold').fontSize(12).text('Bill To');
  doc.font('Helvetica').fontSize(10).text(invoice.customer.name);
  const customerAddress = formatPdfAddress(invoice.customer.address);
  if (customerAddress) doc.text(customerAddress);
  if (invoice.customer.city || invoice.customer.state || (invoice.customer as any).zipCode) {
    doc.text(`${invoice.customer.city || ''}${invoice.customer.city ? ', ' : ''}${invoice.customer.state || ''}${(invoice.customer as any).zipCode ? ' ' + (invoice.customer as any).zipCode : ''}`);
  }
  if (invoice.customer.country) doc.text(invoice.customer.country);
  if (invoice.customer.phone) doc.text(`Phone: ${invoice.customer.phone}`);
  if (invoice.customer.email) doc.text(`Email: ${invoice.customer.email}`);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).text('Invoice Items');
  doc.moveDown(0.25);

  // Table header
  const tableTop = doc.y;
  const descWidth = pageWidth * 0.55;
  const qtyWidth = 50;
  const unitWidth = 90;
  const totalWidth = 90;
  const qtyX = startX + descWidth + 10;
  const unitX = qtyX + qtyWidth + 10;
  const totalX = unitX + unitWidth + 10;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Description', startX, tableTop, { width: descWidth });
  doc.text('Qty', qtyX, tableTop, { width: qtyWidth, align: 'right' });
  doc.text('Unit Price', unitX, tableTop, { width: unitWidth, align: 'right' });
  doc.text('Total', totalX, tableTop, { width: totalWidth, align: 'right' });
  doc.moveDown(0.35);

  doc.font('Helvetica').fontSize(10);
  invoice.items.forEach((item) => {
    const y = doc.y;
    const descriptionHeight = doc.heightOfString(item.description, { width: descWidth });
    const qtyHeight = doc.heightOfString(String(item.quantity), { width: qtyWidth });
    const unitHeight = doc.heightOfString(formatMoney(item.unitPrice), { width: unitWidth });
    const totalHeight = doc.heightOfString(formatMoney(item.total), { width: totalWidth });
    const rowHeight = Math.max(descriptionHeight, qtyHeight, unitHeight, totalHeight) + 6;

    doc.text(item.description, startX, y, { width: descWidth });
    doc.text(String(item.quantity), qtyX, y, { width: qtyWidth, align: 'right' });
    doc.text(formatMoney(item.unitPrice), unitX, y, { width: unitWidth, align: 'right' });
    doc.text(formatMoney(item.total), totalX, y, { width: totalWidth, align: 'right' });
    doc.y = y + rowHeight;
  });

  doc.moveDown(0.5);
  const summaryX = startX + halfWidth * 0.5;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Subtotal:', summaryX, doc.y, { width: halfWidth * 0.5, continued: true, align: 'right' });
  doc.text(formatMoney(invoice.subtotal), { width: halfWidth * 0.5, align: 'right' });
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(10).text('Tax:', summaryX, doc.y, { width: halfWidth * 0.5, continued: true, align: 'right' });
  doc.text(formatMoney(invoice.taxTotal), { width: halfWidth * 0.5, align: 'right' });
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(10).text('Discount:', summaryX, doc.y, { width: halfWidth * 0.5, continued: true, align: 'right' });
  doc.text(formatMoney(invoice.discountAmount), { width: halfWidth * 0.5, align: 'right' });
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(11).text('Total:', summaryX, doc.y, { width: halfWidth * 0.5, continued: true, align: 'right' });
  doc.text(formatMoney(invoice.total), { width: halfWidth * 0.5, align: 'right' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10).text('Amount Paid:', summaryX, doc.y, { width: halfWidth * 0.5, continued: true, align: 'right' });
  doc.text(formatMoney(invoice.amountPaid), { width: halfWidth * 0.5, align: 'right' });
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(11).text('Balance Due:', summaryX, doc.y, { width: halfWidth * 0.5, continued: true, align: 'right' });
  doc.text(formatMoney(invoice.balanceDue), { width: halfWidth * 0.5, align: 'right' });

  if (invoice.notes) {
    doc.moveDown(0.7);
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
