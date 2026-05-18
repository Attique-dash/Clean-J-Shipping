import type { KcdPackage } from '@/types/kcd-package';

export interface KcdCustomer {
  UserCode: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  Branch: string;
  MailboxNumber: string;
  Address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export function toKcdCustomer(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  userCode?: string;
  branch?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } | null;
}): KcdCustomer {
  const rawCode = (user.userCode || '').trim().toUpperCase();
  const mailbox = rawCode.startsWith('CLEAN-')
    ? rawCode
    : rawCode
      ? `CLEAN-${rawCode.replace(/^CLEAN-?/i, '')}`
      : '';

  const addr = user.address || {};

  return {
    UserCode: rawCode || mailbox,
    FirstName: user.firstName || '',
    LastName: user.lastName || '',
    Email: user.email || '',
    Phone: user.phone || '',
    Branch: user.branch || 'Kingston',
    MailboxNumber: mailbox || rawCode,
    Address: {
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.zipCode || '',
      country: addr.country || 'Jamaica',
    },
  };
}

export function toKcdCustomerArray(
  users: Parameters<typeof toKcdCustomer>[0][]
): KcdCustomer[] {
  return users.map(toKcdCustomer);
}
