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
  package: { trackingNumber: string; userCode?: string };
  invoiceType: 'billing';
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

    const itemValueLocal = asNumber(
      packageData.itemValueUSD ?? packageData.itemValue ?? packageData.value ?? payment.itemValueUsd
    );
    const totalFromPackage = asNumber(packageData.totalAmount ?? payment.totalAmountUsd);
    const weightLbs = asNumber(
      packageData.Weight ?? packageData.weightLbs ?? packageData.weight
    );
    const weightKg = weightLbs > 0 ? weightLbs / 2.20462 : 0;
    const itemDescription =
      asString(packageData.itemDescription) ||
      asString(packageData.Description || packageData.description) ||
      'Package contents';

    const itemValueUSD =
      invoiceCurrency === 'USD'
        ? itemValueLocal
        : CurrencyService.isSupported(invoiceCurrency)
          ? CurrencyService.toUSD(itemValueLocal, invoiceCurrency)
          : itemValueLocal;

    const invoiceItems: BillingInvoicePayload['items'] = [];
    let invoiceTotal = totalFromPackage;

    if (invoiceCurrency === 'JMD') {
      const cost = CurrencyService.calculateTotalPackageCost(itemValueUSD, weightKg, 'JMD');

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
          description: `Customs duty (${itemValueUSD > 100 ? '15%' : '0%'} of item value)`,
          quantity: 1,
          unitPrice: cost.customsDutyJMD,
          taxRate: 0,
          amount: cost.customsDutyJMD,
          taxAmount: 0,
          total: cost.customsDutyJMD,
        });
      }
      if (invoiceTotal <= 0) invoiceTotal = cost.totalJMD;
    } else {
      const shippingUsd = calcShippingCostUsd(weightLbs);
      const shippingLocal = CurrencyService.fromUSD(shippingUsd, invoiceCurrency);

      if (itemValueLocal > 0) {
        invoiceItems.push({
          description: `Item value (${itemDescription})`,
          quantity: 1,
          unitPrice: itemValueLocal,
          taxRate: 0,
          amount: itemValueLocal,
          taxAmount: 0,
          total: itemValueLocal,
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
      if (invoiceTotal <= 0) {
        invoiceTotal = itemValueLocal + shippingLocal;
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
      package: {
        trackingNumber,
        userCode: user.userCode,
      },
      invoiceType: 'billing',
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
    await Invoice.findByIdAndUpdate(billingId, {
      $set: {
        currency: payload.currency,
        subtotal: payload.subtotal,
        total: payload.total,
        balanceDue: Math.max(0, payload.total - asNumber(packageDoc.amountPaid)),
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
