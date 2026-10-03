// Field-level checks shared by every form and by the API, so client and server agree.

export const MAX_EMAIL_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS_PATTERN = /^[0-9+\-\s()]+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value);
}

/** Accepts common formats ("+91 98765 43210", "080-1234 5678") holding 7–15 digits (E.164 maximum). */
export function isValidPhone(value: string): boolean {
  if (!PHONE_CHARS_PATTERN.test(value)) return false;
  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15;
}

/** Trims and collapses internal whitespace (including newlines) for single-line fields. */
export function normalizeLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Strips formatting and an optional country code (+91) or trunk prefix (0) down to a bare 10-digit number. */
export function normalizeIndianMobile(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** Indian mobile numbers are 10 digits starting 6–9 (TRAI numbering plan). */
export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));
}
