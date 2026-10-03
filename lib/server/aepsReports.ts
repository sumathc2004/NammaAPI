import "server-only";
import { aepsRequest } from "@/lib/server/aepsClient";
import type { DashboardSectionId } from "@/lib/data/dashboardNav";
import type { ReportRow, ReportTable } from "@/lib/reports/table";
import type { SessionCredentials } from "@/lib/server/session";

/**
 * Vendor endpoint behind each dashboard section that is a date-range report. Each is called as
 * GET {AEPS_API_BASE_URL}/{endpoint}?UserName=&Password=&FromDate=&ToDate=
 * To connect another section: add it here, add app/api/dashboard/<section>/route.ts calling
 * handleReportRequest(), and render <ReportView> on its page.
 */
const REPORT_ENDPOINTS: Partial<Record<DashboardSectionId, string>> = {
  "credit-ledger": "GetWalletTransactions_swallet",
  "wallet-ledger": "GetWalletTransactions",
};

/**
 * Date format the vendor expects for FromDate/ToDate. Not documented yet — ISO is what .NET
 * binds most reliably. Switch to "dd/MM/yyyy" or "MM/dd/yyyy" here if the vendor needs it.
 */
const VENDOR_DATE_FORMAT: "yyyy-MM-dd" | "dd/MM/yyyy" | "MM/dd/yyyy" | "dd-MM-yyyy" = "yyyy-MM-dd";

function toVendorDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  switch (VENDOR_DATE_FORMAT) {
    case "dd/MM/yyyy":
      return `${d}/${m}/${y}`;
    case "MM/dd/yyyy":
      return `${m}/${d}/${y}`;
    case "dd-MM-yyyy":
      return `${d}-${m}-${y}`;
    default:
      return isoDate;
  }
}

export type ReportResult = { ok: true; table: ReportTable } | { ok: false; error: string; unavailable: boolean };

export async function fetchReport(
  section: DashboardSectionId,
  credentials: SessionCredentials,
  fromDate: string,
  toDate: string,
): Promise<ReportResult> {
  const endpoint = REPORT_ENDPOINTS[section];
  if (!endpoint) return { ok: false, error: "This report isn't available yet.", unavailable: false };

  const result = await aepsRequest(endpoint, {
    UserName: credentials.userName,
    Password: credentials.password,
    FromDate: toVendorDate(fromDate),
    ToDate: toVendorDate(toDate),
  });
  if (!result.ok) return { ok: false, error: result.error, unavailable: true };

  const records = findRecords(result.body);
  if (!records) {
    // No list in the response: either simply no entries, or a vendor error message.
    const message = findMessage(result.body);
    if (!message || /^success/i.test(message) || NO_RECORDS_MESSAGE.test(message)) {
      return { ok: true, table: { columns: [], rows: [] } };
    }
    // Safe to log: the vendor's message and response shape, never credentials or row values.
    console.warn(`AEPS ${endpoint} returned "${message}" (response keys: ${describeShape(result.body)}).`);
    return { ok: false, error: message, unavailable: false };
  }

  const table = toTable(records);
  if (process.env.NODE_ENV === "development") {
    // Field names only (no values), to help map columns in lib/reports/layouts.ts.
    console.info(`AEPS ${endpoint} fields: ${table.columns.join(", ")}`);
  }
  return { ok: true, table };
}

/** Vendor messages that mean "nothing in this period" rather than an error. */
const NO_RECORDS_MESSAGE = /no\s*(record|data|transaction|entr)|not\s*found|record\s*not|empty/i;

type Json = Record<string, unknown>;

/** Tag/key names of the top two levels, e.g. "Response{MESSAGE,Status}" — for logs, no values. */
function describeShape(node: unknown): string {
  if (!isRecord(node)) return Array.isArray(node) ? `array(${node.length})` : typeof node;
  return Object.entries(node)
    .map(([key, value]) => (isRecord(value) ? `${key}{${Object.keys(value).join(",")}}` : key))
    .join(",");
}

const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Finds the list of transaction records anywhere in the response, whatever the vendor's wrapper
 * names are: a JSON array, or the repeated elements inside an XML <ArrayOf…> root.
 */
function findRecords(node: unknown, depth = 0): Json[] | null {
  if (depth > 6) return null;

  if (Array.isArray(node)) {
    if (node.length > 0 && node.every(isRecord)) return node;
    return null;
  }
  if (!isRecord(node)) return null;

  for (const value of Object.values(node)) {
    const found = Array.isArray(value) ? findRecords(value, depth + 1) : null;
    if (found) return found;
  }

  // XML with exactly one entry: <ArrayOfX><X>…</X></ArrayOfX> parses to an object, not an array.
  for (const [key, value] of Object.entries(node)) {
    if (/^ArrayOf/i.test(key) && isRecord(value)) {
      const children = Object.values(value).flatMap((child) => (Array.isArray(child) ? child : [child]));
      const records = children.filter(isRecord);
      if (records.length > 0) return records;
    }
  }

  for (const value of Object.values(node)) {
    const found = isRecord(value) ? findRecords(value, depth + 1) : null;
    if (found) return found;
  }
  return null;
}

function findMessage(node: unknown, depth = 0): string | null {
  if (!isRecord(node) || depth > 2) return null;
  for (const [key, value] of Object.entries(node)) {
    if (/^message$/i.test(key) && typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(node)) {
    const found = findMessage(value, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Flattens records into string cells; nested objects/arrays are skipped. Column order follows the vendor's. */
function toTable(records: Json[]): ReportTable {
  const columns: string[] = [];
  const rows: ReportRow[] = records.map((record) => {
    const row: ReportRow = {};
    for (const [key, value] of Object.entries(record)) {
      let cell: string | undefined;
      if (value === null || value === undefined) cell = "";
      else if (typeof value === "string") cell = value.trim();
      else if (typeof value === "number" || typeof value === "boolean") cell = String(value);
      if (cell === undefined) continue;
      row[key] = cell;
      if (!columns.includes(key)) columns.push(key);
    }
    return row;
  });
  return { columns, rows };
}
