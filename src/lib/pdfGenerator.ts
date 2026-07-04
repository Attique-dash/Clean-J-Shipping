import PDFDocument from 'pdfkit';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { format } from 'date-fns';
import { IInvoice } from '@/models/Invoice';
import { CurrencyService } from '@/lib/currency-service';

const UPLOAD_DIR = '/tmp/invoices';

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
  doc.fontSize(9).text(options.company.address || '', { width: halfWidth, continued: true });
  doc.text(`Issue Date: ${format(new Date(invoice.issueDate), 'MMM dd, yyyy')}`, { align: 'right', width: halfWidth });
  doc.text(`${options.company.city || ''}${options.company.city ? ', ' : ''}${options.company.state || ''}${options.company.zip ? ' ' + options.company.zip : ''}`, { width: halfWidth, continued: true });
  doc.text(`Due Date: ${format(new Date(invoice.dueDate), 'MMM dd, yyyy')}`, { align: 'right', width: halfWidth });
  if (options.company.phone) doc.text(`Phone: ${options.company.phone}`, { width: halfWidth, continued: true });
  if (options.company.email) doc.text(`Email: ${options.company.email}`, { align: 'right', width: halfWidth });
  if (options.company.website) doc.text(`Website: ${options.company.website}`, { width: halfWidth, continued: true });
  doc.moveDown(0.5);

  // Bill to section
  doc.font('Helvetica-Bold').fontSize(12).text('Bill To');
  doc.font('Helvetica').fontSize(10).text(invoice.customer.name);
  if (invoice.customer.address) doc.text(invoice.customer.address);
  if (invoice.customer.city || invoice.customer.state || invoice.customer.zipCode) {
    doc.text(`${invoice.customer.city || ''}${invoice.customer.city ? ', ' : ''}${invoice.customer.state || ''}${invoice.customer.zipCode ? ' ' + invoice.customer.zipCode : ''}`);
  }
  if (invoice.customer.country) doc.text(invoice.customer.country);
  if (invoice.customer.phone) doc.text(`Phone: ${invoice.customer.phone}`);
  if (invoice.customer.email) doc.text(`Email: ${invoice.customer.email}`);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).text('Invoice Items');
  doc.moveDown(0.25);

  // Table header
  const tableTop = doc.y;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Description', startX, tableTop, { width: halfWidth, continued: true });
  doc.text('Qty', startX + halfWidth * 0.65, tableTop, { width: halfWidth * 0.15, align: 'right', continued: true });
  doc.text('Unit Price', startX + halfWidth * 0.82, tableTop, { width: halfWidth * 0.18, align: 'right', continued: true });
  doc.text('Total', { align: 'right' });
  doc.moveDown(0.25);

  doc.font('Helvetica').fontSize(10);
  invoice.items.forEach((item) => {
    const rowTop = doc.y;
    doc.text(item.description, startX, rowTop, { width: halfWidth, continued: true });
    doc.text(String(item.quantity), startX + halfWidth * 0.65, rowTop, { width: halfWidth * 0.15, align: 'right', continued: true });
    doc.text(formatMoney(item.unitPrice), startX + halfWidth * 0.82, rowTop, { width: halfWidth * 0.18, align: 'right', continued: true });
    doc.text(formatMoney(item.total), { align: 'right' });
    doc.moveDown(0.25);
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
