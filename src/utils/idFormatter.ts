/**
 * Format IDs to be shorter and more readable
 * Takes the first 8 characters and last 4 characters of an ID
 */
export function formatId(id: string | undefined | null): string {
  if (!id) return 'N/A';
  if (id.length <= 12) return id;
  return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
}

/**
 * Format tracking number or user code to be shorter
 */
export function formatTrackingNumber(tracking: string | undefined | null): string {
  if (!tracking) return 'N/A';
  if (tracking.length <= 12) return tracking;
  return `${tracking.substring(0, 8)}...${tracking.substring(tracking.length - 4)}`;
}

/**
 * Format user code to be shorter
 */
export function formatUserCode(userCode: string | undefined | null): string {
  if (!userCode) return 'N/A';
  // User codes are usually shorter, but if they're long, truncate
  if (userCode.length <= 10) return userCode;
  return `${userCode.substring(0, 6)}...${userCode.substring(userCode.length - 4)}`;
}

