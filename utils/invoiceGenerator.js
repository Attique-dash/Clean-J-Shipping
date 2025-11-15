import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateInvoice(shipment) {
  return new Promise((resolve, reject) => {
    try {
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }
      
      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(shipment._id).slice(-8).toUpperCase()}`;
      const filename = `${invoiceNumber}.pdf`;
      const filepath = path.join(invoicesDir, filename);
      
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      
      // Company Header
      doc.fontSize(24)
         .text('CLEAN J SHIPPING', 50, 50, { align: 'left' });
      
      doc.fontSize(10)
         .text('Kingston, Jamaica', 50, 80)
         .text('Phone: +1-876-XXX-XXXX', 50, 95)
         .text('Email: info@cleanjshipping.com', 50, 110)
         .text('www.cleanjshipping.com', 50, 125);
      
      // Invoice Details (Right Side)
      doc.fontSize(20)
         .text('INVOICE', 400, 50);
      
      doc.fontSize(10)
         .text(`Invoice #: ${invoiceNumber}`, 400, 80)
         .text(`Date: ${new Date().toLocaleDateString()}`, 400, 95)
         .text(`Tracking #: ${shipment.trackingNumber}`, 400, 110)
         .text(`Due Date: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}`, 400, 125);
      
      // Bill To Section
      doc.fontSize(12)
         .text('BILL TO:', 50, 170, { underline: true });
      
      doc.fontSize(10)
         .text(shipment.sender?.name || 'N/A', 50, 190)
         .text(shipment.sender?.email || 'N/A', 50, 205)
         .text(shipment.sender?.phone || 'N/A', 50, 220)
         .text(shipment.sender?.address || 'N/A', 50, 235);
      
      // Ship To Section
      doc.fontSize(12)
         .text('SHIP TO:', 300, 170, { underline: true });
      
      doc.fontSize(10)
         .text(shipment.receiver?.name || 'N/A', 300, 190)
         .text(shipment.receiver?.email || 'N/A', 300, 205)
         .text(shipment.receiver?.phone || 'N/A', 300, 220)
         .text(shipment.receiver?.address || 'N/A', 300, 235);
      
      // Separator Line
      doc.moveTo(50, 270).lineTo(550, 270).stroke();
      
      // Table Header
      doc.fontSize(11)
         .text('DESCRIPTION', 50, 290, { bold: true })
         .text('QTY', 300, 290)
         .text('RATE', 380, 290)
         .text('AMOUNT', 480, 290);
      
      doc.moveTo(50, 305).lineTo(550, 305).stroke();
      
      // Line Items
      let yPos = 320;
      
      // Shipping Fee
      doc.fontSize(10)
         .text(`Shipping Fee (${shipment.weight || 0}kg)`, 50, yPos)
         .text('1', 300, yPos)
         .text(`$${(shipment.shippingCost || 0).toFixed(2)}`, 380, yPos)
         .text(`$${(shipment.shippingCost || 0).toFixed(2)}`, 480, yPos);
      
      yPos += 20;
      
      // Insurance (if applicable)
      if (shipment.insuranceCost > 0) {
        doc.text('Insurance Coverage', 50, yPos)
           .text('1', 300, yPos)
           .text(`$${shipment.insuranceCost.toFixed(2)}`, 380, yPos)
           .text(`$${shipment.insuranceCost.toFixed(2)}`, 480, yPos);
        yPos += 20;
      }
      
      // Customs Fee (if applicable)
      if (shipment.customsFee > 0) {
        doc.text('Customs & Duties', 50, yPos)
           .text('1', 300, yPos)
           .text(`$${shipment.customsFee.toFixed(2)}`, 380, yPos)
           .text(`$${shipment.customsFee.toFixed(2)}`, 480, yPos);
        yPos += 20;
      }
      
      // Subtotal Line
      yPos += 10;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 15;
      
      // Totals
      const subtotal = (shipment.shippingCost || 0) + 
                      (shipment.insuranceCost || 0) + 
                      (shipment.customsFee || 0);
      const tax = subtotal * 0.15; // 15% tax
      const total = subtotal + tax;
      
      doc.fontSize(10)
         .text('Subtotal:', 380, yPos)
         .text(`$${subtotal.toFixed(2)}`, 480, yPos);
      
      yPos += 20;
      doc.text('Tax (15%):', 380, yPos)
         .text(`$${tax.toFixed(2)}`, 480, yPos);
      
      yPos += 20;
      doc.fontSize(12)
         .text('TOTAL:', 380, yPos, { bold: true })
         .text(`$${total.toFixed(2)}`, 480, yPos);
      
      // Payment Info
      yPos += 50;
      doc.fontSize(11)
         .text('PAYMENT INFORMATION', 50, yPos, { underline: true });
      
      yPos += 20;
      doc.fontSize(9)
         .text(`Payment Status: ${(shipment.paymentStatus || 'pending').toUpperCase()}`, 50, yPos)
         .text(`Payment Method: ${shipment.paymentMethod || 'Pending'}`, 50, yPos + 15);
      
      // Terms & Conditions
      yPos += 60;
      doc.fontSize(10)
         .text('TERMS & CONDITIONS', 50, yPos, { underline: true });
      
      yPos += 20;
      doc.fontSize(8)
         .text('• Payment is due within 30 days of invoice date', 50, yPos)
         .text('• Late payments may incur additional fees', 50, yPos + 12)
         .text('• For questions, contact: info@cleanjshipping.com', 50, yPos + 24);
      
      // Footer
      doc.fontSize(10)
         .text('Thank you for your business!', 50, 700, { align: 'center' });
      
      doc.fontSize(8)
         .text('This is a computer-generated invoice and does not require a signature.', 50, 720, { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({
          number: invoiceNumber,
          filename,
          filepath,
          url: `/invoices/${filename}`,
          total: total.toFixed(2)
        });
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

export { generateInvoice };
