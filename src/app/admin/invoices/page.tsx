import { Metadata } from 'next';
import InvoiceClient from './InvoiceClient';

export const metadata: Metadata = {
  title: 'Invoice Generator | Admin Dashboard',
  description: 'Generate and manage invoices',
};

export default function InvoicesPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <InvoiceClient />
    </div>
  );
}