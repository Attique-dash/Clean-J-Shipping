import { chromium } from 'playwright-chromium';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
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
  const { invoice, company, signatureUrl } = options;
  
  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
  const filePath = join(UPLOAD_DIR, fileName);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    }).format(amount);
  };

  // Generate HTML for the invoice
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-logo { max-width: 200px; max-height: 100px; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { margin: 0; color: #2c3e50; }
        .invoice-info { margin-bottom: 30px; }
        .company-info, .client-info { margin-bottom: 30px; }
        .company-info h2, .client-info h2 { margin-top: 0; color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background-color: #f8f9fa; text-align: left; padding: 10px; border: 1px solid #dee2e6; }
        .items-table td { padding: 10px; border: 1px solid #dee2e6; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals { float: right; width: 300px; margin-top: 20px; }
        .totals table { width: 100%; border-collapse: collapse; }
        .totals td { padding: 8px; border: 1px solid #dee2e6; }
        .totals tr:last-child { font-weight: bold; font-size: 1.1em; }
        .notes { margin-top: 30px; clear: both; }
        .signature { margin-top: 50px; text-align: right; }
        .signature img { max-width: 200px; max-height: 100px; }
        .status { 
          display: inline-block; 
          padding: 5px 10px; 
          border-radius: 3px; 
          font-weight: bold; 
          text-transform: capitalize;
          background-color: ${getStatusColor(invoice.status)};
          color: white;
        }
        .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-logo">
          ${company.logoUrl ? `<img src="${company.logoUrl}" alt="${company.name}" style="max-width: 100%; height: auto;">` : ''}
        </div>
        <div class="invoice-title">
          <h1>INVOICE</h1>
          <p>#${invoice.invoiceNumber}</p>
          <p>Status: <span class="status">${invoice.status}</span></p>
        </div>
      </div>

      <div class="invoice-info">
        <div style="display: flex; justify-content: space-between;">
          <div class="company-info" style="flex: 1; margin-right: 20px;">
            <h2>From</h2>
            <p><strong>${company.name}</strong></p>
            <p>${company.address}</p>
            <p>${company.city}, ${company.state} ${company.zip}</p>
            <p>${company.country}</p>
            <p>Phone: ${company.phone}</p>
            <p>Email: ${company.email}</p>
            ${company.website ? `<p>Website: ${company.website}</p>` : ''}
            ${company.taxId ? `<p>Tax ID: ${company.taxId}</p>` : ''}
          </div>
          
          <div class="client-info" style="flex: 1;">
            <h2>Bill To</h2>
            <p><strong>${invoice.customer.name}</strong></p>
            <p>${invoice.customer.address}</p>
            <p>${invoice.customer.city}, ${invoice.customer.country}</p>
            ${invoice.customer.email ? `<p>Email: ${invoice.customer.email}</p>` : ''}
            ${invoice.customer.phone ? `<p>Phone: ${invoice.customer.phone}</p>` : ''}
            ${invoice.customer.taxId ? `<p>Tax ID: ${invoice.customer.taxId}</p>` : ''}
          </div>
          
          <div style="flex: 1; margin-left: 20px;">
            <h2>Invoice Details</h2>
            <p><strong>Issue Date:</strong> ${format(new Date(invoice.issueDate), 'MMM dd, yyyy')}</p>
            <p><strong>Due Date:</strong> ${format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</p>
            ${invoice.paymentTerms ? `<p><strong>Payment Terms:</strong> Net ${invoice.paymentTerms} days</p>` : ''}
            ${invoice.currency ? `<p><strong>Currency:</strong> ${invoice.currency} ${invoice.exchangeRate && invoice.exchangeRate !== 1 ? `(Rate: ${invoice.exchangeRate})` : ''}</p>` : ''}
            
            ${invoice.package ? `
              <div style="margin-top: 20px;">
                <h3>Package Details</h3>
                <p><strong>Tracking #:</strong> ${invoice.package.tracking_number}</p>
                <p><strong>User Code:</strong> ${invoice.package.user_code}</p>
                ${invoice.package.weight ? `<p><strong>Weight:</strong> ${invoice.package.weight} kg</p>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th class="text-right">Quantity</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Tax Rate</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.description}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${formatCurrency(item.unitPrice)}</td>
              <td class="text-right">${item.taxRate}%</td>
              <td class="text-right">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
          </tr>
          ${invoice.discountAmount > 0 ? `
            <tr>
              <td>Discount (${invoice.discount?.type === 'percentage' ? `${invoice.discount?.value}%` : 'Fixed'}):</td>
              <td class="text-right">-${formatCurrency(invoice.discountAmount)}</td>
            </tr>
          ` : ''}
          <tr>
            <td>Tax:</td>
            <td class="text-right">${formatCurrency(invoice.taxTotal)}</td>
          </tr>
          <tr>
            <td><strong>Total:</strong></td>
            <td class="text-right"><strong>${formatCurrency(invoice.total)}</strong></td>
          </tr>
          ${invoice.amountPaid > 0 ? `
            <tr>
              <td>Amount Paid:</td>
              <td class="text-right">-${formatCurrency(invoice.amountPaid)}</td>
            </tr>
            <tr>
              <td><strong>Balance Due:</strong></td>
              <td class="text-right"><strong>${formatCurrency(invoice.balanceDue)}</strong></td>
            </tr>
          ` : ''}
        </table>
      </div>

      ${invoice.notes ? `
        <div class="notes">
          <h3>Notes</h3>
          <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      ${invoice.terms ? `
        <div class="terms">
          <h3>Terms & Conditions</h3>
          <p>${invoice.terms.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      ${invoice.paymentInstructions ? `
        <div class="payment-instructions">
          <h3>Payment Instructions</h3>
          <p>${invoice.paymentInstructions.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      ${signatureUrl ? `
        <div class="signature">
          <p>Authorized Signature</p>
          <img src="${signatureUrl}" alt="Signature" style="max-width: 200px;">
          <p>${invoice.signature?.signedBy || 'Authorized Representative'}</p>
          <p>${invoice.signature?.signedAt ? format(new Date(invoice.signature.signedAt), 'MMM dd, yyyy') : ''}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>${company.name} | ${company.website || ''} | ${company.email || ''}</p>
      </div>
    </body>
    </html>
  `;

  // Generate PDF using Playwright
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set content and wait for any resources to load
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  // Generate PDF
  const pdf = await page.pdf({
    path: filePath,
    format: 'A4',
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    printBackground: true,
  });

  await browser.close();
  
  // Save the file
  await writeFile(filePath, pdf);

  return {
    filePath,
    fileName,
    url: `/invoices/${fileName}`
  };
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return '#10b981'; // green-500
    case 'sent':
      return '#3b82f6'; // blue-500
    case 'overdue':
      return '#ef4444'; // red-500
    case 'cancelled':
      return '#6b7280'; // gray-500
    case 'draft':
    default:
      return '#9ca3af'; // gray-400
  }
}

// Helper function to generate an invoice and return the URL
export async function generateInvoicePdfUrl(invoice: IInvoice, company: any, signatureUrl?: string): Promise<string> {
  const { url } = await generateInvoicePdf({
    invoice,
    company,
    signatureUrl
  });
  return url;
}

// Helper function to send invoice email
export async function sendInvoiceEmail(
  to: string,
  subject: string,
  invoiceNumber: string,
  pdfPath: string,
  companyName: string
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
