// Date helpers for report date ranges. Dates travel as ISO "yyyy-MM-dd" strings (the value of
// <input type="date">); lib/server/aepsReports.ts converts them to the vendor's format.

export const MAX_RANGE_DAYS = 366;

export const datePresets = [
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
] as const;

export type DatePresetId = (typeof datePresets)[number]["id"];

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

/** Range covering the last `days` days, ending today (local time). */
export function rangeForDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Returns an error message, or null when `from`–`to` is a valid range. */
export function validateRange(from: string, to: string): string | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return "Choose a valid From and To date.";
  if (from > to) return "From date must be on or before To date.";
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > MAX_RANGE_DAYS) return `Choose a range of ${MAX_RANGE_DAYS} days or less.`;
  return null;
}
