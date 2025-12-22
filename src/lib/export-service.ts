// my-app/src/lib/export-service.ts
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export type ExportFormat = 'csv' | 'excel';

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  sheetName?: string;
}

export class ExportService {
  /**
   * Export data to CSV format
   */
  static toCSV(data: any[], filename: string): void {
    const csv = Papa.unparse(data);
    this.downloadFile(csv, `${filename}.csv`, 'text/csv');
  }

  /**
   * Export data to Excel format
   */
  static toExcel(data: any[], filename: string, sheetName: string = 'Sheet1'): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate buffer using buffer type to avoid memory allocation issues
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Create blob and download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    this.downloadBlob(blob, `${filename}.xlsx`);
  }

  /**
   * Export multiple sheets to Excel
   */
  static toExcelMultiSheet(
    sheets: Array<{ name: string; data: any[] }>,
    filename: string
  ): void {
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

  /**
   * Generic export method
   */
  static export(data: any[], options: ExportOptions): void {
    if (options.format === 'csv') {
      this.toCSV(data, options.filename);
    } else {
      this.toExcel(data, options.filename, options.sheetName);
    }
  }

  /**
   * Download file helper
   */
  private static downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    this.downloadBlob(blob, filename);
  }

  /**
   * Download blob helper
   */
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

  /**
   * Format date for export
   */
  static formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  /**
   * Prepare package data for export
   */
  static preparePackageData(packages: any[]): any[] {
    return packages.map(pkg => ({
      'Tracking Number': pkg.trackingNumber || pkg.tracking_number,
      'Customer Code': pkg.userCode || pkg.user_code,
      'Status': pkg.status,
      'Weight (kg)': pkg.weight || '',
      'Dimensions (L×W×H)': pkg.length && pkg.width && pkg.height 
        ? `${pkg.length}×${pkg.width}×${pkg.height}` 
        : '',
      'Branch': pkg.branch || '',
      'Description': pkg.description || '',
      'Shipper': pkg.shipper || '',
      'Created Date': this.formatDate(pkg.createdAt || pkg.created_at),
      'Updated Date': this.formatDate(pkg.updatedAt || pkg.updated_at),
    }));
  }

  /**
   * Prepare customer data for export
   */
  static prepareCustomerData(customers: any[]): any[] {
    return customers.map(cust => ({
      'Customer Code': cust.userCode || cust.user_code,
      'Full Name': cust.full_name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim(),
      'Email': cust.email,
      'Phone': cust.phone || '',
      'Branch': cust.branch || '',
      'Account Status': cust.accountStatus || cust.account_status || 'active',
      'Email Verified': cust.emailVerified || cust.email_verified ? 'Yes' : 'No',
      'Account Type': cust.accountType || cust.account_type || 'Basic',
      'Member Since': this.formatDate(cust.createdAt || cust.member_since),
    }));
  }

  /**
   * Prepare transaction data for export
   */
  static prepareTransactionData(transactions: any[]): any[] {
    return transactions.map(txn => ({
      'Transaction ID': txn.transactionId || txn.id,
      'Customer Code': txn.userCode || txn.user_code,
      'Type': txn.type,
      'Amount': txn.amount,
      'Currency': txn.currency || 'PKR',
      'Payment Method': txn.paymentMethod || txn.method,
      'Status': txn.status,
      'Reference': txn.reference || '',
      'Date': this.formatDate(txn.createdAt || txn.date),
    }));
  }

  /**
   * Prepare staff data for export
   */
  static prepareStaffData(staff: any[]): any[] {
    return staff.map(s => ({
      'Staff Code': s.userCode,
      'First Name': s.firstName,
      'Last Name': s.lastName,
      'Email': s.email,
      'Branch': s.branch || '',
      'Joined Date': this.formatDate(s.createdAt),
    }));
  }

  /**
   * Prepare broadcast data for export
   */
  static prepareBroadcastData(broadcasts: any[]): any[] {
    return broadcasts.map(b => ({
      'Title': b.title,
      'Body': b.body,
      'Channels': b.channels.join(', '),
      'Total Recipients': b.total_recipients || b.totalRecipients,
      'Portal Delivered': b.portal_delivered || b.portalDelivered,
      'Email Delivered': b.email_delivered || b.emailDelivered,
      'Email Failed': b.email_failed || b.emailFailed,
      'Scheduled At': this.formatDate(b.scheduled_at || b.scheduledAt),
      'Sent At': this.formatDate(b.sent_at || b.sentAt),
    }));
  }
}