import { generateInvoicePdf } from './pdfGenerator';
import { IInvoice } from '@/models/Invoice';

// Re-export the PDF generation function
export { generateInvoicePdf };

// Download PDF function
export function downloadPdf(filePath: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = filePath;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Open print window function
export function openPrintWindow(filePath: string): void {
  const printWindow = window.open(filePath, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// Get base64 from URL function
export async function getBase64FromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
