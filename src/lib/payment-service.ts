// Payment Service for generating secure payment links
import crypto from 'crypto';

export function generatePaymentLink(invoiceId: string): string {
  // Generate a secure token for the payment link
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  
  // Store the token in your database or cache with the invoiceId
  // For now, we'll create a link with the token and invoiceId
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.cleanjshipping.com';
  
  return `${baseUrl}/pay/${token}?invoice=${invoiceId}&t=${timestamp}`;
}

export function validatePaymentToken(token: string, invoiceId: string): boolean {
  // In a real implementation, you would:
  // 1. Look up the token in your database/cache
  // 2. Check if it's associated with the invoiceId
  // 3. Check if the token has expired (e.g., 7 days)
  // 4. Return true if valid, false otherwise
  
  // For now, we'll just do basic validation
  return !!(token && token.length === 64 && invoiceId);
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
}
