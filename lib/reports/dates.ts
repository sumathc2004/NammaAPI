// Date helpers for report date ranges. Dates travel as ISO "yyyy-MM-dd" strings (the value of
// <input type="date">); lib/server/aepsReports.ts converts them to the vendor's format.

export const MAX_RANGE_DAYS = 366;

/**
 * Nothing dated before this day is ever shown. Enforced on the server (validateRange rejects an
 * earlier From date, and fetchReport drops older rows the vendor still returns); the date pickers
 * only mirror it. Changing it needs a code change and a deploy — no request can override it.
 */
export const REPORTS_START_DATE = "2026-10-05";

/** Local calendar date as "yyyy-MM-dd". */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's date in India as "yyyy-MM-dd", whatever timezone the server runs in. */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** "2026-10-05" → "05 Oct 2026" */
export function formatIsoDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Returns an error message, or null when `from`–`to` is a valid range. */
export function validateRange(from: string, to: string): string | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return "Choose a valid From and To date.";
  if (from < REPORTS_START_DATE) return `Reports are available from ${formatIsoDate(REPORTS_START_DATE)}.`;
  if (from > to) return "From date must be on or before To date.";
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > MAX_RANGE_DAYS) return `Choose a range of ${MAX_RANGE_DAYS} days or less.`;
  return null;
}
