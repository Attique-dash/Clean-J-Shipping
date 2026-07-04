import { CurrencyService } from '@/lib/currency-service';
import {
  calcShippingCostUsd,
  getPackagePaymentCurrency,
  parsePackagePayments,
} from '@/lib/package-format';

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function isUsdCurrency(currency: string | undefined): boolean {
  return typeof currency === 'string' && currency.trim().toUpperCase() === 'USD';
}

export type BillingInvoicePayload = {
  userId: unknown;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  invoiceType: 'billing';
  tracking_number: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
    taxAmount: number;
    total: number;
  }>;
  notes: string;
  issueDate: string;
  dueDate: string;
};

/** Build billing invoice data from a package document */
export function buildBillingInvoicePayload(
  packageData: Record<string, unknown>,
  user: {
    _id: unknown;
    userCode?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  },
  trackingNumber: string
): BillingInvoicePayload | null {
  try {
    const payment = parsePackagePayments(
      asString(packageData.PackagePayments || packageData.packagePayments),
      packageData
    );
    const currency = getPackagePaymentCurrency(packageData, payment);
    const invoiceCurrency = CurrencyService.isSupported(currency) ? currency : 'JMD';
    const isPackageCurrencyUsd = isUsdCurrency(currency);

    // Use parsed payment values from the package metadata. Those values are
    // treated as USD only when the package currency is USD.
    const weightLbs = asNumber(
      packageData.Weight ?? packageData.weightLbs ?? packageData.weight
    );
    const itemValue = asNumber(payment.itemValueUsd);
    const shippingAmount = asNumber(payment.shippingCostUsd) || calcShippingCostUsd(weightLbs);
    const totalFromPackage = asNumber(payment.totalAmountUsd) || (itemValue > 0 ? itemValue + shippingAmount : shippingAmount);
    const weightKg = weightLbs > 0 ? weightLbs / 2.20462 : 0;
    const itemDescription =
      asString(packageData.itemDescription) ||
      asString(packageData.Description || packageData.description) ||
      'Package contents';

    const invoiceItems: BillingInvoicePayload['items'] = [];
    let invoiceTotal = 0;

    if (isPackageCurrencyUsd && invoiceCurrency === 'JMD') {
      const cost = CurrencyService.calculateTotalPackageCost(itemValue, weightKg, 'JMD');

      if (cost.itemValueJMD > 0) {
        invoiceItems.push({
          description: `Item value (${itemDescription})`,
          quantity: 1,
          unitPrice: cost.itemValueJMD,
          taxRate: 0,
          amount: cost.itemValueJMD,
          taxAmount: 0,
          total: cost.itemValueJMD,
        });
      }
      if (cost.shippingCostJMD > 0) {
        invoiceItems.push({
          description: `Shipping charges (${weightLbs.toFixed(1)} lbs)`,
          quantity: 1,
          unitPrice: cost.shippingCostJMD,
          taxRate: 0,
          amount: cost.shippingCostJMD,
          taxAmount: 0,
          total: cost.shippingCostJMD,
        });
      }
      if (cost.customsDutyJMD > 0) {
        invoiceItems.push({
          description: `Customs duty (${itemValue > 100 ? '15%' : '0%'} of item value)`,
          quantity: 1,
          unitPrice: cost.customsDutyJMD,
          taxRate: 0,
          amount: cost.customsDutyJMD,
          taxAmount: 0,
          total: cost.customsDutyJMD,
        });
      }

      invoiceTotal = cost.totalJMD;
    } else {
      const itemLocal = isPackageCurrencyUsd ? CurrencyService.fromUSD(itemValue, invoiceCurrency) : itemValue;
      const shippingLocal = isPackageCurrencyUsd ? CurrencyService.fromUSD(shippingAmount, invoiceCurrency) : shippingAmount;

      if (itemLocal > 0) {
        invoiceItems.push({
          description: `Item value (${itemDescription})`,
          quantity: 1,
          unitPrice: itemLocal,
          taxRate: 0,
          amount: itemLocal,
          taxAmount: 0,
          total: itemLocal,
        });
      }
      if (shippingLocal > 0) {
        invoiceItems.push({
          description: `Shipping charges (${weightLbs.toFixed(1)} lbs)`,
          quantity: 1,
          unitPrice: shippingLocal,
          taxRate: 0,
          amount: shippingLocal,
          taxAmount: 0,
          total: shippingLocal,
        });
      }

      if (totalFromPackage > 0) {
        invoiceTotal = isPackageCurrencyUsd ? CurrencyService.fromUSD(totalFromPackage, invoiceCurrency) : totalFromPackage;
      } else {
        invoiceTotal = itemLocal + shippingLocal;
      }
    }

    if (invoiceTotal <= 0 && invoiceItems.length === 0) {
      return null;
    }

    const subtotal = invoiceItems.reduce((sum, i) => sum + i.total, 0);

    return {
      userId: user._id,
      customer: {
        id: String(user._id),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
      },
      invoiceType: 'billing',
      tracking_number: trackingNumber,
      currency: invoiceCurrency,
      subtotal: subtotal || invoiceTotal,
      taxTotal: 0,
      discountAmount: 0,
      total: invoiceTotal > 0 ? invoiceTotal : subtotal,
      amountPaid: 0,
      balanceDue: invoiceTotal > 0 ? invoiceTotal : subtotal,
      items: invoiceItems.length > 0 ? invoiceItems : [
        {
          description: `Package charges (${trackingNumber})`,
          quantity: 1,
          unitPrice: invoiceTotal,
          taxRate: 0,
          amount: invoiceTotal,
          taxAmount: 0,
          total: invoiceTotal,
        },
      ],
      notes: `Auto-generated billing invoice for package ${trackingNumber}`,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error('buildBillingInvoicePayload error:', error);
    return null;
  }
}

type BillingInvoiceUser = Parameters<typeof buildBillingInvoicePayload>[1];

/**
 * Create a billing invoice linked to a Package document (MongoDB ObjectId ref).
 * Uses .save() so pre-save generates invoiceNumber and totals.
 */
export async function createBillingInvoiceForPackage(
  packageDoc: Record<string, unknown> & { _id: unknown },
  user: BillingInvoiceUser,
  trackingNumber: string
): Promise<{ _id: unknown; invoiceNumber: string } | null> {
  const payload = buildBillingInvoicePayload(packageDoc, user, trackingNumber);
  if (!payload) return null;

  try {
    const Invoice = (await import('@/models/Invoice')).default;
    const invoice = new Invoice({
      userId: payload.userId,
      customer: payload.customer,
      package: packageDoc._id,
      tracking_number: payload.tracking_number,
      invoiceType: payload.invoiceType,
      currency: payload.currency,
      subtotal: payload.subtotal,
      taxTotal: payload.taxTotal,
      discountAmount: payload.discountAmount,
      total: payload.total,
      amountPaid: payload.amountPaid,
      balanceDue: payload.balanceDue,
      items: payload.items,
      notes: payload.notes,
      issueDate: new Date(payload.issueDate),
      dueDate: new Date(payload.dueDate),
      status: 'sent',
    });
    await invoice.save();
    return { _id: invoice._id, invoiceNumber: invoice.invoiceNumber };
  } catch (error) {
    console.error('createBillingInvoiceForPackage error:', error);
    return null;
  }
}

/** Update linked billing invoice when package amounts change */
export async function syncBillingInvoiceForPackage(
  packageDoc: Record<string, unknown>,
  user: {
    _id: unknown;
    userCode?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  },
  trackingNumber: string
): Promise<boolean> {
  const billingId = asString(packageDoc.billingInvoiceId);
  if (!billingId) return false;

  const payload = buildBillingInvoicePayload(packageDoc, user, trackingNumber);
  if (!payload) return false;

  try {
    const Invoice = (await import('@/models/Invoice')).default;
    // Determine amount paid in invoice currency using parsed package payments
    const payment = parsePackagePayments(asString(packageDoc.PackagePayments || packageDoc.packagePayments), packageDoc);
    const amountPaidUsd = asNumber(payment.amountPaidUsd);
    const paymentCurrency = getPackagePaymentCurrency(packageDoc, payment);
    const isPackageCurrencyUsd = isUsdCurrency(paymentCurrency);
    const amountPaidLocal = amountPaidUsd > 0
      ? isPackageCurrencyUsd
        ? CurrencyService.fromUSD(amountPaidUsd, payload.currency)
        : amountPaidUsd
      : asNumber(packageDoc.amountPaid ?? 0);

    await Invoice.findByIdAndUpdate(billingId, {
      $set: {
        currency: payload.currency,
        subtotal: payload.subtotal,
        total: payload.total,
        amountPaid: amountPaidLocal,
        balanceDue: Math.max(0, payload.total - amountPaidLocal),
        items: payload.items,
        updatedAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error('syncBillingInvoiceForPackage error:', error);
    return false;
  }
}
