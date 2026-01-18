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
        doc.addImage(logoDataUrl, 15, 8, 30, 30);
      }

      // Company Info
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('Clean J Shipping', pageWidth - 20, 15, { align: 'right' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Kingston, Jamaica', pageWidth - 20, 25, { align: 'right' });
      doc.text('Phone: +1-876-XXX-XXXX', pageWidth - 20, 30, { align: 'right' });
      doc.text('Email: info@cleanjshipping.com', pageWidth - 20, 35, { align: 'right' });

      // Invoice Details
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('INVOICE', 20, yPos);
      yPos += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, yPos);
      yPos += 8;
      doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 20, yPos);
      yPos += 8;
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, yPos);
      yPos += 8;
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, yPos);
      yPos += 15;

      // Customer Information
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, pageWidth - 40, 50, 'F');
      yPos += 10;

      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', 30, yPos);
      yPos += 10;

      doc.setFont('helvetica', 'normal');
      doc.text(invoice.customer?.name || 'N/A', 30, yPos);
      yPos += 6;
      doc.text(invoice.customer?.email || 'N/A', 30, yPos);
      yPos += 6;
      doc.text(invoice.customer?.address || 'N/A', 30, yPos);
      yPos += 6;
      doc.text(invoice.customer?.phone || 'N/A', 30, yPos);
      yPos += 15;

      // Items Table Header
      doc.setFillColor(15, 77, 138);
      doc.rect(20, yPos, pageWidth - 40, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION', 30, yPos + 10);
      doc.text('QTY', 120, yPos + 10);
      doc.text('UNIT PRICE', 180, yPos + 10);
      doc.text('AMOUNT', 250, yPos + 10);
      yPos += 25;

      // Items Table Content
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item) => {
          const description = item.description || 'Service';
          const quantity = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice) || 0;
          const amount = Number(item.amount) || 0;
          
          doc.text(description, 30, yPos);
          doc.text(quantity.toString(), 120, yPos);
          doc.text(formatMoney(unitPrice), 180, yPos);
          doc.text(formatMoney(amount), 250, yPos);
          yPos += 8;
        });
      } else {
        doc.text('No items found', 30, yPos);
        yPos += 8;
      }
      yPos += 10;

      // Summary Section
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, pageWidth - 40, 80, 'F');
      yPos += 10;

      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY', 30, yPos);
      yPos += 15;

      doc.setFont('helvetica', 'normal');
      doc.text(`Subtotal: ${formatMoney(invoice.subtotal || 0)}`, 30, yPos);
      yPos += 8;
      doc.text(`Tax Total: ${formatMoney(invoice.taxTotal || 0)}`, 30, yPos);
      yPos += 8;
      doc.text(`Discount: ${formatMoney(invoice.discountAmount || 0)}`, 30, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Amount: ${formatMoney(invoice.total || 0)}`, 30, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Amount Paid: ${formatMoney(invoice.amountPaid || 0)}`, 30, yPos);
      yPos += 8;
      doc.text(`Balance Due: ${formatMoney(invoice.balanceDue || 0)}`, 30, yPos);
      yPos += 15;

      // Notes Section
      if (invoice.notes) {
        doc.text('Notes:', 15, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 30);
        doc.text(notesLines, 15, yPos);
        yPos += 8;
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

  static async toInvoicePDFBuffer(invoice: {
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
  }, filename: string): Promise<Buffer> {
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
        doc.addImage(logoDataUrl, 15, 8, 30, 30);
      }

      // Company Info
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('Clean J Shipping', pageWidth - 20, 15, { align: 'right' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Kingston, Jamaica', pageWidth - 20, 25, { align: 'right' });
      doc.text('Phone: +1-876-XXX-XXXX', pageWidth - 20, 30, { align: 'right' });
      doc.text('Email: info@cleanjshipping.com', pageWidth - 20, 35, { align: 'right' });

      // Invoice Details
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('INVOICE', 20, yPos);
      yPos += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, yPos);
      yPos += 8;
      doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 20, yPos);
      yPos += 8;
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, yPos);
      yPos += 8;
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, yPos);
      yPos += 15;

      // Customer Information
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, pageWidth - 40, 50, 'F');
      yPos += 10;

      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', 30, yPos);
      yPos += 10;

      doc.setFont('helvetica', 'normal');
      doc.text(invoice.customer?.name || 'N/A', 30, yPos);
      yPos += 6;
      doc.text(invoice.customer?.email || 'N/A', 30, yPos);
      yPos += 6;
      doc.text(invoice.customer?.address || 'N/A', 30, yPos);
      yPos += 6;
      doc.text(invoice.customer?.phone || 'N/A', 30, yPos);
      yPos += 15;

      // Items Table Header
      doc.setFillColor(15, 77, 138);
      doc.rect(20, yPos, pageWidth - 40, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION', 30, yPos + 10);
      doc.text('QTY', 120, yPos + 10);
      doc.text('UNIT PRICE', 180, yPos + 10);
      doc.text('AMOUNT', 250, yPos + 10);
      yPos += 25;

      // Items Table Content
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item) => {
          const description = item.description || 'Service';
          const quantity = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice) || 0;
          const amount = Number(item.amount) || 0;
          
          doc.text(description, 30, yPos);
          doc.text(quantity.toString(), 120, yPos);
          doc.text(formatMoney(unitPrice), 180, yPos);
          doc.text(formatMoney(amount), 250, yPos);
          yPos += 8;
        });
      } else {
        doc.text('No items found', 30, yPos);
        yPos += 8;
      }
      yPos += 10;

      // Summary Section
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, pageWidth - 40, 80, 'F');
      yPos += 10;

      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY', 30, yPos);
      yPos += 15;

      doc.setFont('helvetica', 'normal');
      doc.text(`Subtotal: ${formatMoney(invoice.subtotal || 0)}`, 30, yPos);
      yPos += 8;
      doc.text(`Tax Total: ${formatMoney(invoice.taxTotal || 0)}`, 30, yPos);
      yPos += 8;
      doc.text(`Discount: ${formatMoney(invoice.discountAmount || 0)}`, 30, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Amount: ${formatMoney(invoice.total || 0)}`, 30, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Amount Paid: ${formatMoney(invoice.amountPaid || 0)}`, 30, yPos);
      yPos += 8;
      doc.text(`Balance Due: ${formatMoney(invoice.balanceDue || 0)}`, 30, yPos);
      yPos += 15;

      // Notes Section
      if (invoice.notes) {
        doc.text('Notes:', 15, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 30);
        doc.text(notesLines, 15, yPos);
        yPos += 8;
      }
      
      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
      
      // Return as Buffer instead of saving
      return Buffer.from(doc.output('arraybuffer'));
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}