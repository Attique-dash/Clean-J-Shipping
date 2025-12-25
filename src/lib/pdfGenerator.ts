import PDFDocument from 'pdfkit';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { format } from 'date-fns';
import { IInvoice } from '@/models/Invoice';

const UPLOAD_DIR = join(process.cwd(), 'public/invoices');

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

  // Add content to PDF
  doc.fontSize(20).text('Invoice', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`);
  doc.text(`Issue Date: ${format(new Date(invoice.issueDate), 'MMM dd, yyyy')}`);
  doc.text(`Due Date: ${format(new Date(invoice.dueDate), 'MMM dd, yyyy')}`);
  doc.moveDown();
  
  // Customer info
  doc.fontSize(14).text('Bill To:', { underline: true });
  doc.fontSize(12).text(invoice.customer.name);
  doc.text(invoice.customer.email);
  doc.moveDown();
  
  // Items table
  doc.fontSize(14).text('Items:', { underline: true });
  doc.moveDown();
  
  let total = 0;
  invoice.items.forEach((item) => {
    doc.fontSize(12).text(`${item.description} - ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    }).format(item.total)}`);
    total += item.total;
  });
  
  doc.moveDown();
  doc.fontSize(14).text(`Total: ${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency || 'USD',
  }).format(total)}`, { align: 'right' });
  
  // Finalize the PDF
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

// Helper function to generate an invoice and return the URL
export async function generateInvoicePdfUrl(invoice: IInvoice, company: GeneratePdfOptions['company'], signatureUrl?: string): Promise<string> {
  const result = await generateInvoicePdf({
    invoice,
    company,
    signatureUrl
  });
  return `/invoices/${result.fileName}`;
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
