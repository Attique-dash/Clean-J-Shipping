// src/lib/invoice.ts
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';

const isClient = typeof window !== "undefined";

export interface InvoiceData {
  client: {
    company: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
  };
  sender: {
    company: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
  };
  information: {
    number: string;
    date: string;
    'due-date': string;
  };
  products: Array<{
    quantity: number;
    description: string;
    'tax-rate': number;
    price: number;
  }>;
  'bottom-notice'?: string;
  settings: {
    currency: string;
  };
  logo?: string;
}

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f4d8a',
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#0f4d8a',
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 20,
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#0f4d8a',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 9,
    color: '#6b7280',
  },
});

// Create PDF Document Component
const InvoiceDocument = ({ data }: { data: InvoiceData }) => {
  const calculateSubtotal = () => {
    return data.products.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateTax = () => {
    return data.products.reduce((sum, item) => {
      const itemTotal = item.quantity * item.price;
      return sum + (itemTotal * item['tax-rate'] / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.settings.currency || 'USD',
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text>#{data.information.number}</Text>
          </View>
          <View>
            <Text>Date: {data.information.date}</Text>
            <Text>Due: {data.information['due-date']}</Text>
          </View>
        </View>

        {/* Sender & Client Info */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={styles.section}>
            <Text style={styles.label}>From:</Text>
            <Text>{data.sender.company}</Text>
            <Text>{data.sender.address}</Text>
            <Text>{data.sender.city}, {data.sender.zip}</Text>
            <Text>{data.sender.country}</Text>
            {data.sender.email && <Text>{data.sender.email}</Text>}
            {data.sender.phone && <Text>{data.sender.phone}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Bill To:</Text>
            <Text>{data.client.company}</Text>
            <Text>{data.client.address}</Text>
            <Text>{data.client.city}, {data.client.zip}</Text>
            <Text>{data.client.country}</Text>
            {data.client.email && <Text>{data.client.email}</Text>}
            {data.client.phone && <Text>{data.client.phone}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
            <Text style={styles.tableCell}>Qty</Text>
            <Text style={styles.tableCell}>Price</Text>
            <Text style={styles.tableCell}>Tax</Text>
            <Text style={styles.tableCell}>Total</Text>
          </View>

          {/* Table Rows */}
          {data.products.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.description}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.price)}</Text>
              <Text style={styles.tableCell}>{item['tax-rate']}%</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.quantity * item.price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
          <View style={{ width: 200 }}>
            <View style={styles.row}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(calculateSubtotal())}</Text>
            </View>
            <View style={styles.row}>
              <Text>Tax:</Text>
              <Text>{formatCurrency(calculateTax())}</Text>
            </View>
            <View style={[styles.row, { borderTopWidth: 2, borderTopColor: '#0f4d8a', paddingTop: 5, marginTop: 5 }]}>
              <Text style={{ fontWeight: 'bold', fontSize: 12 }}>Total:</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 12, color: '#0f4d8a' }}>
                {formatCurrency(calculateTotal())}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Notice */}
        {data['bottom-notice'] && (
          <View style={styles.footer}>
            <Text>{data['bottom-notice']}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

// Get the invoice generator functions
const getInvoiceGenerator = () => {
  if (!isClient) {
    return {
      generateInvoicePdf: () => Promise.reject(new Error('Cannot generate PDF on server side')),
      downloadPdf: () => {},
      openPrintWindow: () => {},
      getBase64FromUrl: () => Promise.reject(new Error('Cannot process images on server side'))
    };
  }

  return {
    async generateInvoicePdf(invoiceData: Partial<InvoiceData>) {
      try {
        const defaultData: InvoiceData = {
          client: {
            company: 'Client Company',
            address: '123 Client St',
            zip: '12345',
            city: 'Client City',
            country: 'USA',
          },
          sender: {
            company: 'Your Company',
            address: '456 Business Ave',
            zip: '67890',
            city: 'Business City',
            country: 'USA',
          },
          information: {
            number: 'INV-001',
            date: new Date().toISOString().split('T')[0],
            'due-date': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          products: [],
          settings: {
            currency: 'USD',
          },
        };

        const data = { ...defaultData, ...invoiceData } as InvoiceData;
        
        // Generate PDF blob
        const blob = await pdf(<InvoiceDocument data={data} />).toBlob();
        
        // Convert to base64 data URL
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error generating invoice:', error);
        throw error;
      }
    },

    downloadPdf(pdfData: string, filename = "invoice") {
      const link = document.createElement("a");
      link.href = pdfData;
      link.download = `${filename}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    openPrintWindow(pdfData: string) {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(`
          <html>
            <head><title>Print Invoice</title></head>
            <body style="margin: 0; padding: 0;">
              <iframe src="${pdfData}" style="width: 100%; height: 100vh; border: none;"></iframe>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        win.document.close();
      }
    },

    async getBase64FromUrl(url: string): Promise<string> {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  };
};

// Export the functions
export const invoice = getInvoiceGenerator();