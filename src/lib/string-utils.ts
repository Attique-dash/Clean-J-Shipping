// src/lib/string-utils.ts
// Safe string utilities to prevent runtime errors

/**
 * Safely converts a value to lowercase string
 * Prevents TypeError when calling toLowerCase() on undefined/null
 * @param s - The value to convert to lowercase
 * @returns Lowercase string, or empty string if conversion fails
 */
export function safeLower(s: unknown): string {
  try {
    return String(s ?? "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Safely trims a string
 * @param s - The value to trim
 * @returns Trimmed string, or empty string if conversion fails
 */
export function safeTrim(s: unknown): string {
  try {
    return String(s ?? "").trim();
  } catch {
    return "";
  }
}

/**
 * Safely converts a value to string
 * @param s - The value to convert
 * @returns String representation, or empty string if conversion fails
 */
export function safeString(s: unknown): string {
  try {
    return String(s ?? "");
  } catch {
    return "";
  }
}
