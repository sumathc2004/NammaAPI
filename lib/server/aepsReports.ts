import "server-only";
import { aepsRequest } from "@/lib/server/aepsClient";
import type { DashboardSectionId } from "@/lib/data/dashboardNav";
import { REPORTS_START_DATE, toIsoDate } from "@/lib/reports/dates";
import { parseDate, type ReportRow, type ReportTable } from "@/lib/reports/table";
import type { SessionCredentials } from "@/lib/server/session";

type ReportEndpoint = {
  /** Path under the API's base URL (AEPS_API_BASE_URL by default). */
  endpoint: string;
  /** Vendor API: "aeps" (default) or "client" (CLIENT_API_BASE_URL, see aepsRequest). */
  api?: "aeps" | "client";
  /** HTTP method. Default: GET. */
  method?: "GET" | "POST";
  /** Vendor controller when it isn't "aeps", e.g. "BpPayment" (see aepsRequest). */
  controller?: string;
  /** Response format to request; the newer endpoints return JSON arrays. Default: XML. */
  prefer?: "xml" | "json";
  /** Query parameters. Identity always comes from the session, never from the browser. */
  params: (credentials: SessionCredentials, fromDate: string, toDate: string) => Record<string, string>;
  /** Optional clean-up of rows before they leave the server (e.g. masking personal data). */
  transform?: (row: ReportRow) => ReportRow;
};

/** Ledger and transfer endpoints: …?UserName=&Password=&FromDate=&ToDate= */
const credentialParams: ReportEndpoint["params"] = (credentials, fromDate, toDate) => ({
  UserName: credentials.userName,
  Password: credentials.password,
  FromDate: toVendorDate(fromDate),
  ToDate: toVendorDate(toDate),
});

/** AEPS transaction type codes → readable names; unknown codes are shown as sent. */
const AEPS_TRANSACTION_TYPES: Record<string, string> = {
  CW: "Cash Withdrawal",
  BE: "Balance Enquiry",
  MS: "Mini Statement",
  AP: "Aadhaar Pay",
  CD: "Cash Deposit",
};

/** Report endpoints that take only the account's mobile number (no password) plus the date range. */
const mobileNumberParams: ReportEndpoint["params"] = (credentials, fromDate, toDate) => ({
  fromDate: toVendorDate(fromDate),
  toDate: toVendorDate(toDate),
  mobileNumber: credentials.userName,
});

/** "wallet_24Hours" → "Wallet 24 Hours" */
function readableCode(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Transfer remarks for a refunded transfer: "Refunded/Oct  6 2026  3:47PM" (the vendor still sends
 * TxnStatus "success", UTR "-" and a UniqueTxnId ending in "R1" for these).
 */
const REFUNDED_REMARK = /^refunded\s*\/\s*(.*)$/i;

/** "Oct  6 2026  3:47PM" → "6 Oct 2026, 3:47 pm"; anything else is returned with spaces tidied. */
function readableVendorTimestamp(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  const match = /^([A-Za-z]{3}) (\d{1,2}) (\d{4}) (\d{1,2}:\d{2}) ?([AP]M)$/i.exec(text);
  return match ? `${match[2]} ${match[1]} ${match[3]}, ${match[4]} ${match[5].toLowerCase()}` : text;
}

/** "123456789012" → "XXXX XXXX 9012". Aadhaar numbers must never be shown (or sent to the browser) in full. */
function maskAadhaar(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `XXXX XXXX ${digits.slice(-4)}` : value;
}

/**
 * Vendor endpoint behind each dashboard section that is a date-range report.
 * To connect another section: add it here, add app/api/dashboard/<section>/route.ts calling
 * handleReportRequest(), and render <ReportView> on its page.
 */
const REPORT_ENDPOINTS: Partial<Record<DashboardSectionId, ReportEndpoint>> = {
  // POST {CLIENT_API_BASE_URL}/transfer/report?UserName=&Password=&FromDate=&ToDate= — JSON array of
  // transfers; HTTP 401 "Invalid username or password" for wrong credentials, [] for an empty range.
  transfer: {
    endpoint: "transfer/report",
    api: "client",
    method: "POST",
    prefer: "json",
    params: credentialParams,
    transform: (row) => {
      const next = { ...row };
      // "success" / "in queue" → "Success" / "In Queue".
      if (next.TxnStatus) next.TxnStatus = readableCode(next.TxnStatus.toLowerCase());
      // A refunded transfer moved no money: show it as Refunded (so totals skip it), with when.
      const refund = REFUNDED_REMARK.exec(row.Remarks ?? "");
      if (refund) {
        next.TxnStatus = "Refunded";
        next.Remarks = refund[1] ? `Refunded on ${readableVendorTimestamp(refund[1])}` : "Refunded";
      } else if (next.Remarks && /^[A-Z][A-Z ]+$/.test(next.Remarks)) {
        // "COMPLETED" → "Completed"
        next.Remarks = next.Remarks[0] + next.Remarks.slice(1).toLowerCase();
      }
      // No bank UTR yet: refunded rows send "-", queued ones repeat their own UniqueTxnId.
      if (next.UTR === "-" || (next.UTR && next.UTR === next.UniqueTxnId)) next.UTR = "";
      // Names arrive as "Mrs_SUMA_D".
      if (next.BeneficiaryName) next.BeneficiaryName = next.BeneficiaryName.replace(/_+/g, " ").trim();
      return next;
    },
  },
  "credit-ledger": { endpoint: "GetWalletTransactions_swallet", params: credentialParams },
  "wallet-ledger": { endpoint: "GetWalletTransactions", params: credentialParams },
  // GET GetTxnsByDate?fromDate=&toDate=&mobileNumber= — no password. The number is always the
  // logged-in account's (from the session), so one user can't look up another's transactions.
  "aeps-reports": {
    endpoint: "GetTxnsByDate",
    prefer: "json",
    params: mobileNumberParams,
    transform: (row) => {
      const next = { ...row };
      for (const key of Object.keys(next)) {
        if (/a+dh?a+r/i.test(key) && next[key]) next[key] = maskAadhaar(next[key]);
        if (/^transactiontype$/i.test(key)) next[key] = AEPS_TRANSACTION_TYPES[next[key].toUpperCase()] ?? next[key];
      }
      return next;
    },
  },
  // GET .../api/BpPayment/GetLinksByDate?fromDate=&toDate=&mobileNumber= — card payment collections
  // (JSON array). No password; the number comes from the session, as above.
  "pg-reports": {
    endpoint: "GetLinksByDate",
    controller: "BpPayment",
    prefer: "json",
    params: mobileNumberParams,
    transform: (row) => {
      const next = { ...row };
      // Card shown as "•••• 5968" (last 4 digits only, no card type).
      const last4 = (row.CardNumber ?? "").replace(/\D/g, "").slice(-4);
      if (last4) next.card = `•••• ${last4}`;
      if (next.settlementType) next.settlementType = readableCode(next.settlementType);
      return next;
    },
  },
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

export type ReportResult =
  | { ok: true; table: ReportTable }
  | { ok: false; error: string; unavailable: boolean; sessionExpired?: boolean };

export async function fetchReport(
  section: DashboardSectionId,
  credentials: SessionCredentials,
  fromDate: string,
  toDate: string,
): Promise<ReportResult> {
  const config = REPORT_ENDPOINTS[section];
  if (!config) return { ok: false, error: "This report isn't available yet.", unavailable: false };
  const { endpoint } = config;

  const result = await aepsRequest(endpoint, config.params(credentials, fromDate, toDate), {
    api: config.api,
    method: config.method,
    controller: config.controller,
    prefer: config.prefer,
  });
  if (!result.ok) {
    // The client API answers a wrong username/password with HTTP 401.
    if (result.status === 401) {
      return { ok: false, error: "Your session has expired. Please log in again.", unavailable: false, sessionExpired: true };
    }
    return { ok: false, error: result.error, unavailable: true };
  }

  const records = findRecords(result.body);
  if (!records) {
    // No list in the response: either simply no entries, or a vendor error message.
    const message = findMessage(result.body);
    if (
      !message ||
      /^success/i.test(message) ||
      NO_RECORDS_MESSAGE.test(message) ||
      // The ledger endpoints answer { MESSAGE: "Failed", data: nil } for a range with no entries.
      (/^failed$/i.test(message) && hasEmptyDataField(result.body))
    ) {
      return { ok: true, table: { columns: [], rows: [] } };
    }
    if (CREDENTIALS_REJECTED_MESSAGE.test(message)) {
      // Seen when the stored password no longer works (e.g. changed since login).
      return { ok: false, error: "Your session has expired. Please log in again.", unavailable: false, sessionExpired: true };
    }
    // Safe to log: the vendor's message and response shape, never credentials or row values.
    console.warn(`AEPS ${endpoint} returned "${message}" (response keys: ${describeShape(result.body)}).`);
    return { ok: false, error: message, unavailable: false };
  }

  const raw = toTable(records);
  const transformed = config.transform ? raw.rows.map(config.transform) : raw.rows;
  // Never pass on anything dated before REPORTS_START_DATE, whatever range the vendor returned.
  // Rows without a readable date are dropped too: when in doubt, don't show it.
  const rows = transformed.filter((row) => {
    const date = rowDate(row);
    return date !== null && date >= REPORTS_START_DATE;
  });
  if (process.env.NODE_ENV === "development" && rows.length < transformed.length) {
    console.info(`AEPS ${endpoint}: hid ${transformed.length - rows.length} rows dated before ${REPORTS_START_DATE} or undated.`);
  }
  // A transform can add fields (e.g. PG's combined "card"); include them as columns too.
  const columns = [...raw.columns];
  for (const row of rows) for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key);
  const table: ReportTable = { columns, rows };
  if (process.env.NODE_ENV === "development") {
    // Field names only (no values), to help map columns in lib/reports/layouts.ts.
    console.info(`AEPS ${endpoint} fields: ${table.columns.join(", ")}`);
  }
  return { ok: true, table };
}

/**
 * A row's calendar date as "yyyy-MM-dd": the first date/time field that parses. Vendor times carry
 * no timezone, so they're read and compared as the vendor's own (Indian) wall-clock dates.
 */
function rowDate(row: ReportRow): string | null {
  for (const [key, value] of Object.entries(row)) {
    if (!value || !/date|time/i.test(key)) continue;
    const date = parseDate(value);
    if (date) return toIsoDate(date);
  }
  return null;
}

/** Vendor messages that mean "nothing in this period" rather than an error. */
const NO_RECORDS_MESSAGE = /no\s*(record|data|transaction|entr)|not\s*found|record\s*not|empty/i;

/** What the ledger endpoints return for a wrong UserName/Password (observed: "Cannot find table 0."). */
const CREDENTIALS_REJECTED_MESSAGE = /cannot find table/i;

type Json = Record<string, unknown>;

/** True when the response has a `data` field that is null/empty (XML `<data i:nil="true"/>` parses to ""). */
function hasEmptyDataField(node: unknown, depth = 0): boolean {
  if (!isRecord(node) || depth > 2) return false;
  for (const [key, value] of Object.entries(node)) {
    if (/^data$/i.test(key)) {
      return (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0) ||
        (isRecord(value) && Object.keys(value).length === 0)
      );
    }
  }
  return Object.values(node).some((value) => hasEmptyDataField(value, depth + 1));
}

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
