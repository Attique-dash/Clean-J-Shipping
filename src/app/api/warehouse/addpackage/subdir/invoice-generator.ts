// Invoice Generator for Warehouse Package Processing
import Invoice from '@/models/Invoice';
import { emailService } from '@/lib/email-service';
import { generatePaymentLink } from '@/lib/payment-service';

interface PackageData {
  trackingNumber: string;
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
  goodsCost?: number; // Cost of items from Amazon/eBay
  goodsDescription?: string; // Description of goods
  includeShipping?: boolean; // Whether to include shipping cost
}

export async function generateInvoiceForPackage(
  packageData: PackageData,
  options: InvoiceGenerationOptions = {}
) {
  try {
    const {
      trackingNumber,
      userId,
      customer,
      weight,
      shipper,
      description,
      shippingCost,
      totalAmount,
      entryDate
    } = packageData;

    const { goodsCost = 0, goodsDescription = '', includeShipping = true } = options;

    // Create invoice items
    const items = [];

    // Add goods cost if provided
    if (goodsCost > 0) {
      items.push({
        description: goodsDescription || `Goods from ${shipper}`,
        quantity: 1,
        unitPrice: goodsCost,
        taxRate: 0,
        amount: goodsCost,
        taxAmount: 0,
        total: goodsCost,
        trackingNumber,
        serviceType: 'goods'
      });
    }

    // Add shipping cost
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

    // Create invoice
    const invoice = new Invoice({
      userId,
      customer: {
        id: customer._id.toString(),
        name: `${customer.firstName} ${customer.lastName}`,
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
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      paymentTerms: 7,
      currency: 'JMD',
      exchangeRate: 1,
      notes: `Package ${trackingNumber} received on ${entryDate.toLocaleDateString()}`,
      tracking_number: trackingNumber,
      item_description: description,
      declared_value: goodsCost
    });

    // Calculate totals automatically via pre-save hook
    await invoice.save();

    // Generate payment link
    const paymentLink = generatePaymentLink(invoice._id.toString());

    // Update invoice with payment link
    (invoice as any).paymentLink = paymentLink;
    await invoice.save();

    // Send email notification
    await emailService.sendInvoiceEmail({
      to: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`,
      invoiceNumber: invoice.invoiceNumber,
      trackingNumber,
      totalAmount: invoice.total,
      paymentLink,
      items: invoice.items
    });

    return {
      success: true,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      paymentLink,
      totalAmount: invoice.total
    };

  } catch (error) {
    console.error('Error generating invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
