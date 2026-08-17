// Invoice Generator for Warehouse Package Processing
import Invoice from '@/models/Invoice';
import { emailService } from '@/lib/email-service';
import { generatePaymentLink } from '@/lib/payment-service';

interface PackageData {
  trackingNumber: string;
  packageId?: string;
  userId: string;
  customer: any;
  weight: number;
  shipper: string;
  description: string;
  shippingCost: number;
  totalAmount: number;
  entryDate: Date;
}

interface InvoiceGenerationOptions {
  regularCharge?: number; // Manual regular charge
  customCharge?: number; // Manual custom charge
  currency?: string; // Currency for charges (default JMD)
  includeShipping?: boolean; // Whether to include shipping cost
}

export async function generateInvoiceForPackage(
  packageData: PackageData,
  options: InvoiceGenerationOptions = {}
) {
  try {
    console.log('[Invoice Generator] Starting invoice generation:', {
      trackingNumber: packageData.trackingNumber,
      totalAmount: packageData.totalAmount,
      options
    });

    const {
      trackingNumber,
      packageId,
      userId,
      customer,
      weight,
      shipper,
      description,
      shippingCost,
      totalAmount,
      entryDate
    } = packageData;

    const { regularCharge = 0, customCharge = 0, currency = 'JMD', includeShipping = false } = options;

    // Create invoice items
    const items = [];

    // Add regular charge if provided
    if (regularCharge > 0) {
      items.push({
        description: 'Regular Charge',
        quantity: 1,
        unitPrice: regularCharge,
        taxRate: 0,
        amount: regularCharge,
        taxAmount: 0,
        total: regularCharge,
        trackingNumber,
        serviceType: 'regular'
      });
    }

    // Add custom charge if provided
    if (customCharge > 0) {
      items.push({
        description: 'Custom Charge',
        quantity: 1,
        unitPrice: customCharge,
        taxRate: 0,
        amount: customCharge,
        taxAmount: 0,
        total: customCharge,
        trackingNumber,
        serviceType: 'custom'
      });
    }

    // Only add shipping cost if explicitly requested (disabled by default)
    if (includeShipping && shippingCost > 0) {
      items.push({
        description: `Shipping for ${trackingNumber}`,
        quantity: 1,
        unitPrice: shippingCost,
        taxRate: 0,
        amount: shippingCost,
        taxAmount: 0,
        total: shippingCost,
        trackingNumber,
        serviceType: 'shipping'
      });
    }

    if (items.length === 0) {
      console.error('[Invoice Generator] No items to invoice');
      return {
        success: false,
        error: 'No items to invoice. Please add Regular Charge and/or Custom Charge.'
      };
    }

    console.log('[Invoice Generator] Creating invoice with items:', items);

    // Create invoice
    const invoice = new Invoice({
      userId,
      customer: {
        id: customer._id ? customer._id.toString() : String(userId),
        name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'Customer',
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zipCode || '',
        country: customer.country || 'Jamaica'
      },
      items,
      status: 'sent',
      invoiceType: 'billing',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      paymentTerms: 7,
      currency: currency,
      exchangeRate: 1,
      notes: `Package ${trackingNumber} received on ${entryDate ? new Date(entryDate).toLocaleDateString() : new Date().toLocaleDateString()}`,
      tracking_number: trackingNumber,
      item_description: description,
      package: packageId || (packageData as any)._id,
      declared_value: 0 // No declared value for manual billing
    });

    // Calculate totals automatically via pre-save hook
    await invoice.save();

    console.log('[Invoice Generator] Invoice saved:', {
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice._id,
      total: invoice.total
    });

    // Generate payment link
    const paymentLink = generatePaymentLink(invoice._id.toString());

    // Update invoice with payment link
    (invoice as any).paymentLink = paymentLink;
    await invoice.save();

    console.log('[Invoice Generator] Payment link generated:', paymentLink);

    // Send email notification (fire and forget - don't block on email failures)
    emailService.sendInvoiceEmail({
      to: customer.email,
      customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email,
      invoiceNumber: invoice.invoiceNumber,
      trackingNumber,
      totalAmount: invoice.total,
      paymentLink,
      items: invoice.items,
      currency
    }).then((emailSuccess) => {
      console.log('[Invoice Generator] Email send result:', emailSuccess ? 'Success' : 'Failed');
    }).catch((emailError) => {
      console.error('[Invoice Generator] Email send error:', emailError);
    });

    return {
      success: true,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      paymentLink,
      totalAmount: invoice.total
    };

  } catch (error) {
    console.error('[Invoice Generator] Error generating invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
