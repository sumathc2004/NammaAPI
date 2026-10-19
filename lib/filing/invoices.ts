// Client-safe helpers for the Filing page (invoices by month).

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Indian financial year ("26-27") that a calendar month falls in: April to March. */
export function financialYear(month: number, year: number): string {
  const start = month >= 4 ? year : year - 1;
  const two = (n: number) => String(n % 100).padStart(2, "0");
  return `${two(start)}-${two(start + 1)}`;
}

export type InvoiceQuery = { month: number; year: number; fy: string };

/** Validates raw query values; returns null when they aren't a real month/year/FY combination. */
export function parseInvoiceQuery(month: string | null, year: string | null, fy: string | null): InvoiceQuery | null {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  const expected = financialYear(m, y);
  if (fy && fy !== expected) return null;
  return { month: m, year: y, fy: expected };
}

export type InvoiceRow = Record<string, string>;

/** A vendor number string ("485.00") as a number; 0 when missing or not numeric. */
export function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const inr = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });

/** The month before today (India-agnostic: local clock), as month 1-12 plus its year. */
export function lastMonth(now = new Date()): { month: number; year: number } {
  const m = now.getMonth(); // 0-11; this month's index is last month's 1-based number
  return m === 0 ? { month: 12, year: now.getFullYear() - 1 } : { month: m, year: now.getFullYear() };
}

const CSV_COLUMNS: { key: string; header: string }[] = [
  { key: "InvoiceNumber", header: "Invoice Number" },
  { key: "StoreName", header: "Store" },
  { key: "ContactPerson", header: "Contact Person" },
  { key: "UserName", header: "Phone" },
  { key: "StoreAddress", header: "Address" },
  { key: "Month", header: "Month" },
  { key: "Year", header: "Year" },
  { key: "TransactionAmount", header: "Transaction Amount" },
  { key: "PgQuantity", header: "PG Quantity" },
  { key: "PgCharge", header: "PG Charge" },
  { key: "PgGST", header: "PG GST" },
  { key: "PayoutQuantity", header: "Payout Quantity" },
  { key: "PayoutCharge", header: "Payout Charge" },
  { key: "PayoutGST", header: "Payout GST" },
  { key: "NetAmount", header: "Net Amount" },
  { key: "GST", header: "GST" },
  { key: "TotalAmount", header: "Total Amount" },
  { key: "Status", header: "Status" },
];

function csvCell(value: string): string {
  // Text starting with = + - @ would run as a formula in Excel, so prefix it (CSV injection).
  const safe = /^[=+\-@]/.test(value) && Number.isNaN(Number(value)) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * The invoices as CSV that Excel opens directly: CRLF line endings, month shown by name, amounts as the
 * vendor sent them (plain numbers Excel can sum). The caller adds the UTF-8 byte order mark.
 */
export function toInvoicesCsv(rows: InvoiceRow[]): string {
  const lines = [CSV_COLUMNS.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(
      CSV_COLUMNS.map(({ key }) => {
        const value = row[key] ?? "";
        return csvCell(key === "Month" ? (MONTHS[num(value) - 1] ?? value) : value);
      }).join(","),
    );
  }
  return lines.join("\r\n");
}
