export function generateTrackingNumber(prefix: string = 'TAS', short: boolean = false): string {
  if (short) {
    // Short format: PREFIX-RANDOM6 (10 chars total)
    // Example: TAS-A3F7K2
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let random = '';
    for (let i = 0; i < 6; i++) {
      random += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}-${random}`;
  }
  
  // Long format: PREFIX-YYYYMMDD-RANDOM6-CHECK
  // Example: TAS-20250119-A3F7K2-X
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

  // Generate 6 random alphanumeric characters
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }

  const base = `${prefix}-${dateStr}-${random}`;
  const checksum = calculateChecksum(base);
  return `${base}-${checksum}`;
}

function calculateChecksum(input: string): string {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i);
  }
  const checkDigit = sum % 36;
  return checkDigit.toString(36).toUpperCase();
}

export function validateTrackingNumber(tracking: string): boolean {
  const pattern = /^([A-Z]{3})-(\d{8})-([A-Z0-9]{6})-([A-Z0-9])$/;
  const match = tracking.match(pattern);
  if (!match) return false;
  const [, prefix, date, random, check] = match;
  const base = `${prefix}-${date}-${random}`;
  const expectedCheck = calculateChecksum(base);
  return check === expectedCheck;
}
