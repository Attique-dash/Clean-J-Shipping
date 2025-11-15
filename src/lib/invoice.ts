import { InvoiceItem } from '@/types';

// This makes sure the file is only executed on the client side
const isClient = typeof window !== 'undefined';

export interface InvoiceData {
  client: {
    company: string;
    address: string;
    zip: string;
    city: string;
    country: string;
  };
  sender: {
    company: string;
    address: string;
    zip: string;
    city: string;
    country: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  logo?: string;
}

export async function generateInvoicePdf(invoiceData: Partial<InvoiceData>) {
  if (!isClient) {
    throw new Error('generateInvoicePdf can only be called on the client side');
  }

  try {
    // Dynamically import easyinvoice to avoid SSR issues
    const easyinvoice = (await import('easyinvoice')).default;
    
    // Default data that can be overridden
    const defaultData: InvoiceData = {
      client: {
        company: 'Client Company',
        address: '123 Client St',
        zip: '12345',
        city: 'Client City',
        country: 'Client Country',
      },
      sender: {
        company: 'Your Company Name',
        address: '456 Business Ave',
        zip: '67890',
        city: 'Business City',
        country: 'Business Country',
      },
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceDate: new Date().toLocaleDateString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      items: [
        {
          name: 'Product or Service',
          quantity: 1,
          price: 0,
          total: 0,
        },
      ],
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: 'Thank you for your business!',
      logo: '',
    };

    // Merge default data with provided data
    const data = { ...defaultData, ...invoiceData };

    // Generate the invoice
    const result = await easyinvoice.createInvoice(data);
    return result.pdf;
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw new Error('Failed to generate invoice');
  }
}

export function downloadPdf(pdfData: string, filename: string = 'invoice') {
  if (!isClient) return;
  
  const link = document.createElement('a');
  link.href = pdfData;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function openPrintWindow(pdfData: string) {
  if (!isClient) return;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Invoice</title>
          <style>
            body { margin: 0; padding: 20px; }
            iframe { width: 100%; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${pdfData}" onload="window.focus(); window.print();"></iframe>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

export async function getBase64FromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return '';
  }
}
