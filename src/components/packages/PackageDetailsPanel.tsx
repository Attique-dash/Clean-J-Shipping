'use client';

import { Package, User, Truck } from 'lucide-react';
import type { KcdPackageRecord } from '@/types/kcd-package';
import {
  formatPackageAmount,
  getCustomerDisplayName,
  getPackageStatusLabel,
} from '@/lib/package-format';

type Props = {
  pkg: KcdPackageRecord;
  getStatusBadgeClass?: (pkg: KcdPackageRecord) => string;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-sm text-gray-600 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right break-words">{value}</span>
    </div>
  );
}

function hasSenderInfo(pkg: KcdPackageRecord): boolean {
  return Boolean(
    pkg.senderName ||
      pkg.senderEmail ||
      pkg.senderPhone ||
      pkg.senderAddress ||
      pkg.senderCountry
  );
}

export default function PackageDetailsPanel({
  pkg,
  getStatusBadgeClass,
}: Props) {
  const statusClass =
    getStatusBadgeClass?.(pkg) ?? 'bg-purple-100 text-purple-800';
  const weightLbs = pkg.weightLbs ?? pkg.Weight ?? 0;
  const currency = pkg.pricePaidCurrency || 'USD';
  const formatAmount = (amount: number) => formatPackageAmount(amount, currency);
  const dimUnit = pkg.dimensionUnit || 'cm';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Package
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          <DetailRow label="Tracking" value={<span className="font-mono">{pkg.TrackingNumber}</span>} />
          <DetailRow
            label="Status"
            value={
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClass}`}>
                {getPackageStatusLabel(pkg)}
              </span>
            }
          />
          <DetailRow label="Mailbox / User code" value={pkg.UserCode || 'N/A'} />
          <DetailRow label="Customer" value={getCustomerDisplayName(pkg)} />
          <DetailRow label="Email" value={pkg.customerEmail || 'N/A'} />
          <DetailRow label="Phone" value={pkg.customerPhone || 'N/A'} />
          <DetailRow label="Weight" value={`${Number(weightLbs).toFixed(2)} lb`} />
          <DetailRow label="Service mode" value={(pkg.serviceMode || 'air').toUpperCase()} />
          <DetailRow
            label="Entry date"
            value={
              pkg.EntryDate
                ? new Date(pkg.EntryDate).toLocaleDateString()
                : 'N/A'
            }
          />
          <DetailRow label="Branch" value={pkg.Branch || 'N/A'} />
          <DetailRow label="Shipper" value={pkg.Shipper || 'N/A'} />
          <DetailRow label="Description" value={pkg.Description || 'N/A'} />
          <DetailRow label="Item description" value={pkg.itemDescription || 'N/A'} />
          <DetailRow label="Pieces" value={String(pkg.Pieces ?? 1)} />
          <DetailRow
            label="Dimensions (L×W×H)"
            value={`${pkg.Length ?? 0} × ${pkg.Width ?? 0} × ${pkg.Height ?? 0} ${dimUnit}`}
          />
          {pkg.specialInstructions ? (
            <DetailRow
              label="Special instructions"
              value={pkg.specialInstructions}
            />
          ) : null}
        </div>
      </div>

      {hasSenderInfo(pkg) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-600" />
            Sender Information
          </h4>
          <div className="grid gap-2 md:grid-cols-2">
            <DetailRow label="Name" value={pkg.senderName || 'N/A'} />
            <DetailRow label="Email" value={pkg.senderEmail || 'N/A'} />
            <DetailRow label="Phone" value={pkg.senderPhone || 'N/A'} />
            <DetailRow label="Country" value={pkg.senderCountry || 'N/A'} />
            <DetailRow
              label="Address"
              value={
                [pkg.senderAddress, pkg.senderCity, pkg.senderState, pkg.senderZipCode]
                  .filter(Boolean)
                  .join(', ') || 'N/A'
              }
            />
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-emerald-600" />
          Payment
        </h4>
        <div className="grid gap-2 md:grid-cols-2">
          <DetailRow label="Currency" value={currency} />
          <DetailRow label="Item value" value={formatAmount(pkg.itemValueUsd ?? 0)} />
          <DetailRow label="Total due" value={formatAmount(pkg.totalAmount ?? 0)} />
          <DetailRow label="Amount paid" value={formatAmount(pkg.amountPaid ?? 0)} />
          <DetailRow
            label="Balance"
            value={formatAmount(
              Math.max(0, (pkg.totalAmount ?? 0) - (pkg.amountPaid ?? 0))
            )}
          />
          <DetailRow
            label="Payment status"
            value={<span className="capitalize">{pkg.paymentStatus || 'pending'}</span>}
          />
          <DetailRow
            label="Payment method"
            value={<span className="capitalize">{pkg.paymentMethod || 'N/A'}</span>}
          />
          <DetailRow label="Invoice status" value={pkg.invoiceStatus || 'pending'} />
        </div>
      </div>
    </div>
  );
}
