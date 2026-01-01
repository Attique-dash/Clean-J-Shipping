// src/lib/export-service.ts
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  sheetName?: string;
}

export class ExportService {
  static toCSV(data: Record<string, unknown>[], filename: string): void {
    const csv = Papa.unparse(data);
    this.downloadFile(csv, `${filename}.csv`, 'text/csv');
  }

  private static readBlobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private static async fetchImageAsDataUrl(path: string): Promise<string | null> {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await this.readBlobAsDataUrl(blob);
    } catch {
      return null;
    }
  }

  static toExcel(data: Record<string, unknown>[], filename: string, sheetName: string = 'Sheet1'): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    this.downloadBlob(blob, `${filename}.xlsx`);
  }

  static toExcelMultiSheet(sheets: Array<{ name: string; data: Record<string, unknown>[] }>, filename: string): void {
    const workbook = XLSX.utils.book_new();
    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    this.downloadBlob(blob, `${filename}.xlsx`);
  }

  private static downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    this.downloadBlob(blob, filename);
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  static formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /**
   * Generate simple invoice PDF - completely rewritten without autoTable
   */
  static async toInvoicePDF(invoice: {
    invoiceNumber: string;
    issueDate: string | Date;
    dueDate: string | Date;
    status: string;
    customer?: {
      name?: string;
      email?: string;
      address?: string;
      phone?: string;
    };
    items?: Array<{
      description?: string;
      quantity?: number;
      unitPrice?: number;
      taxRate?: number;
      amount?: number;
      taxAmount?: number;
      total?: number;
      trackingNumber?: string;
    }>;
    subtotal?: number;
    taxTotal?: number;
    discountAmount?: number;
    total?: number;
    amountPaid?: number;
    balanceDue?: number;
    notes?: string;
    currency?: string;
    package?: {
      trackingNumber?: string;
      userCode?: string;
    };
  }, filename: string): Promise<void> {
    try {
      const currency = (invoice.currency || 'JMD').toUpperCase();
      const moneyFormatter = new Intl.NumberFormat(currency === 'JMD' ? 'en-JM' : 'en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'symbol',
      });
      const formatMoney = (amount: number) => {
        try {
          return moneyFormatter.format(amount);
        } catch {
          return `${currency} ${amount.toFixed(2)}`;
        }
      };

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Company Header
      doc.setFillColor(15, 77, 138);
      doc.rect(0, 0, pageWidth, 52, 'F');

      const logoDataUrl = await this.fetchImageAsDataUrl('/images/Logo.png');
      if (logoDataUrl) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, 12, 22, 22, 3, 3, 'F');
        doc.addImage(logoDataUrl, 'PNG', 15, 13, 20, 20);
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('CLEAN J SHIPPING', logoDataUrl ? 40 : 15, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Professional Logistics Services', logoDataUrl ? 40 : 15, 32);
      doc.text('info@cleanshipping.com | 1 (876) 578-5945', logoDataUrl ? 40 : 15, 39);
      
      // Invoice Title and Number
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - 15, 23, { align: 'right' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`#${invoice.invoiceNumber}`, pageWidth - 15, 31, { align: 'right' });
      
      // Status
      doc.setFontSize(10);
      doc.text(`Status: ${(invoice.status || 'draft').toUpperCase()}`, pageWidth - 15, 39, { align: 'right' });

      doc.setDrawColor(230, 143, 25);
      doc.setLineWidth(2);
      doc.line(0, 52, pageWidth, 52);
      
      yPos = 60;
      
      // Customer Information
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 15, yPos);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos += 8;
      doc.text(invoice.customer?.name || 'N/A', 15, yPos);
      
      yPos += 6;
      doc.text(invoice.customer?.email || '', 15, yPos);
      
      if (invoice.customer?.phone) {
        yPos += 6;
        doc.text(invoice.customer.phone, 15, yPos);
      }
      
      if (invoice.customer?.address) {
        yPos += 6;
        const addressLines = doc.splitTextToSize(invoice.customer.address, pageWidth - 30);
        doc.text(addressLines, 15, yPos);
        yPos += addressLines.length * 5;
      }
      
      // Package Information (if available)
      if (invoice.package?.trackingNumber) {
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Package Information:', 15, yPos);
        
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.text(`Tracking Number: ${invoice.package.trackingNumber}`, 15, yPos);
        
        if (invoice.package.userCode) {
          yPos += 6;
          doc.text(`Customer Code: ${invoice.package.userCode}`, 15, yPos);
        }
      }
      
      // Invoice Details
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Details:', 15, yPos);
      
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Issue Date: ${this.formatDate(invoice.issueDate)}`, 15, yPos);
      
      yPos += 6;
      doc.text(`Due Date: ${this.formatDate(invoice.dueDate)}`, 15, yPos);
      
      yPos += 6;
      doc.text(`Currency: ${currency}`, 15, yPos);
      
      // Items Section
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Items:', 15, yPos);
      
      yPos += 8;
      
      // Table headers
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F');
      doc.setFontSize(9);
      const descX = 20;
      const qtyX = 120;
      const priceX = 145;
      const totalX = pageWidth - 20;
      doc.text('Description', descX, yPos);
      doc.text('Qty', qtyX, yPos, { align: 'right' });
      doc.text('Price', priceX, yPos, { align: 'right' });
      doc.text('Total', totalX, yPos, { align: 'right' });
      
      yPos += 8;
      
      // Table rows
      doc.setFont('helvetica', 'normal');
      const items = invoice.items || [];
      if (items.length === 0) {
        doc.text('No items', 20, yPos);
        yPos += 8;
      } else {
        items.forEach((item, idx) => {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          if (idx % 2 === 1) {
            doc.setFillColor(250, 250, 250);
            doc.rect(15, yPos - 4.5, pageWidth - 30, 8, 'F');
          }

          const description = item.description || 'Service';
          const descriptionLines = doc.splitTextToSize(description, 90);
          const quantity = (item.quantity ?? 1).toString();
          const price = formatMoney(item.unitPrice || 0);
          const lineTotal = formatMoney(item.total || 0);

          doc.text(descriptionLines, descX, yPos);
          doc.text(quantity, qtyX, yPos, { align: 'right' });
          doc.text(price, priceX, yPos, { align: 'right' });
          doc.text(lineTotal, totalX, yPos, { align: 'right' });

          yPos += Math.max(8, descriptionLines.length * 5);
        });
      }
      
      // Summary Section
      yPos += 15;
      const summaryX = pageWidth - 80;
      
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(summaryX, yPos - 6, 65, 68, 3, 3, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Summary:', summaryX + 5, yPos);
      
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', summaryX + 5, yPos);
      doc.text(formatMoney(invoice.subtotal || 0), summaryX + 60, yPos, { align: 'right' });
      
      yPos += 8;
      doc.text('Tax:', summaryX + 5, yPos);
      doc.text(formatMoney(invoice.taxTotal || 0), summaryX + 60, yPos, { align: 'right' });
      
      if (invoice.discountAmount && invoice.discountAmount > 0) {
        yPos += 8;
        doc.text('Discount:', summaryX + 5, yPos);
        doc.text(`-${formatMoney(invoice.discountAmount)}`, summaryX + 60, yPos, { align: 'right' });
      }
      
      yPos += 8;
      doc.setLineWidth(0.5);
      doc.line(summaryX + 5, yPos, summaryX + 60, yPos);
      
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Total:', summaryX + 5, yPos);
      doc.text(formatMoney(invoice.total || 0), summaryX + 60, yPos, { align: 'right' });
      
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(34, 197, 94);
      doc.text('Paid:', summaryX + 5, yPos);
      doc.text(formatMoney(invoice.amountPaid || 0), summaryX + 60, yPos, { align: 'right' });

      yPos += 8;
      doc.setTextColor(239, 68, 68);
      doc.text('Balance Due:', summaryX + 5, yPos);
      doc.text(formatMoney(invoice.balanceDue || 0), summaryX + 60, yPos, { align: 'right' });
      
      // Notes
      if (invoice.notes) {
        yPos += 20;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Notes:', 15, yPos);
        
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 30);
        doc.text(notesLines, 15, yPos);
      }
      
      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
      
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Data preparation methods with type assertions
  static preparePackageData(packages: Record<string, unknown>[]): Record<string, unknown>[] {
    return packages.map((pkg: Record<string, unknown>) => ({
      'Tracking Number': pkg.trackingNumber || pkg.tracking_number,
      'Customer Code': pkg.userCode || pkg.user_code,
      'Status': pkg.status,
      'Weight (kg)': pkg.weight || '',
      'Dimensions': pkg.length && pkg.width && pkg.height 
        ? `${pkg.length}×${pkg.width}×${pkg.height}` 
        : '',
      'Branch': pkg.branch || '',
      'Description': pkg.description || '',
      'Created Date': this.formatDate((pkg.createdAt || pkg.created_at) as string | Date | null | undefined),
    }));
  }

  static prepareCustomerData(customers: Record<string, unknown>[]): Record<string, unknown>[] {
    return customers.map((cust: Record<string, unknown>) => ({
      'Customer Code': cust.userCode || cust.user_code,
      'Full Name': cust.full_name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim(),
      'Email': cust.email,
      'Phone': cust.phone || '',
      'Branch': cust.branch || '',
      'Member Since': this.formatDate((cust.createdAt || cust.member_since) as string | Date | null | undefined),
    }));
  }

  static prepareTransactionData(transactions: Record<string, unknown>[]): Record<string, unknown>[] {
    return transactions.map((txn: Record<string, unknown>) => ({
      'Transaction ID': txn.transactionId || txn.id,
      'Customer Code': txn.userCode || txn.user_code,
      'Type': txn.type,
      'Amount': txn.amount,
      'Currency': txn.currency || 'PKR',
      'Payment Method': txn.paymentMethod || txn.method,
      'Status': txn.status,
      'Date': this.formatDate((txn.createdAt || txn.date) as string | Date | null | undefined),
    }));
  }
}