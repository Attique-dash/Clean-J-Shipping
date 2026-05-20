/** KCD/Tasoko external codes (EPXUUYE) and internal mailbox codes (CLEAN-0007) */
export const KCD_USER_CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{1,29}$/;

export const KCD_USER_CODE_MESSAGE =
  'User code must be 2–30 characters (letters, numbers, hyphens), e.g. CLEAN-0033 or EPXUUYE';

/** Broader than legacy 2–3 char TLD regex — accepts .com, .local, etc. */
export const KCD_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidKcdEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return v.length > 0 && KCD_EMAIL_REGEX.test(v);
}
