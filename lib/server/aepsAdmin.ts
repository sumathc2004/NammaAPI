import "server-only";
import { aepsRequest, AEPS_UNEXPECTED_ERROR } from "@/lib/server/aepsClient";
import { accountLabel, type ApiLevelBalance } from "@/lib/admin/apiBalance";
import type { BpayStatusCheck, PgTallyRow } from "@/lib/admin/pgTally";
import type { DaySummary } from "@/lib/admin/daySummary";
import type { BulkpeEntry, BulkpeStatementPage } from "@/lib/admin/bulkpeStatement";
import { REPORTS_START_DATE } from "@/lib/reports/dates";
import type { SessionCredentials } from "@/lib/server/session";

export type ApiBalanceResult = { ok: true; balance: ApiLevelBalance } | { ok: false; error: string };

const toNumber = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/,/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Admin-only: `POST getapiLevelbalance?UserName=&Password=` (POST, parameters in the query string).
 * Response: { Status: true, Message: "Success", Data: { wallet, bul_0080, …, diff } }.
 */
export async function fetchApiLevelBalance(credentials: SessionCredentials): Promise<ApiBalanceResult> {
  const result = await aepsRequest(
    "getapiLevelbalance",
    { UserName: credentials.userName, Password: credentials.password },
    { method: "POST", prefer: "json" },
  );
  if (!result.ok) return result;

  const body = (result.body ?? {}) as { Status?: unknown; Message?: unknown; Data?: unknown };
  const message = typeof body.Message === "string" ? body.Message.trim() : "";
  if (body.Status !== true && !/^success/i.test(message)) {
    return { ok: false, error: message || AEPS_UNEXPECTED_ERROR };
  }

  const data = body.Data && typeof body.Data === "object" ? (body.Data as Record<string, unknown>) : null;
  const wallet = toNumber(data?.wallet);
  if (!data || wallet === null) {
    console.error("AEPS getapiLevelbalance returned no usable wallet balance.");
    return { ok: false, error: AEPS_UNEXPECTED_ERROR };
  }

  const accounts = Object.entries(data)
    .filter(([key]) => key !== "wallet" && key !== "diff")
    .flatMap(([key, value]) => {
      const amount = toNumber(value);
      return amount === null ? [] : [{ key, label: accountLabel(key), amount }];
    });

  return { ok: true, balance: { wallet, accounts, diff: toNumber(data.diff) } };
}

export type PgTallyResult = { ok: true; rows: PgTallyRow[] } | { ok: false; error: string };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

/**
 * Admin-only: `POST PgTallyReport?from=yyyy-MM-dd&to=yyyy-MM-dd` (GET returns HTTP 405). JSON array,
 * one row per card collection: { createdDateTime, collectionId, referenceNumber, userName, vendorName,
 * Amount, DebitFromCard, Charges, collectionStatus, PaymentStatus, WalletTxnStatus, WalletCreditTime,
 * WalletClosingTime, WalletClosingBalance, WalletCreditCount, CanRefresh }. Needs no credentials, so
 * none are sent; the route in front of it is what restricts it to admins.
 */
export async function fetchPgTally(from: string, to: string): Promise<PgTallyResult> {
  const result = await aepsRequest("PgTallyReport", { from, to }, { method: "POST", prefer: "json" });
  if (!result.ok) return result;
  if (!Array.isArray(result.body)) {
    console.error("AEPS PgTallyReport did not return a list.");
    return { ok: false, error: AEPS_UNEXPECTED_ERROR };
  }

  const rows = (result.body as Record<string, unknown>[]).map((r) => ({
    createdDateTime: text(r.createdDateTime),
    collectionId: text(r.collectionId),
    referenceNumber: text(r.referenceNumber),
    userName: text(r.userName),
    vendorName: text(r.vendorName) || text(r.userName),
    debitFromCard: toNumber(r.DebitFromCard) ?? 0,
    charges: toNumber(r.Charges) ?? 0,
    amount: toNumber(r.Amount) ?? 0,
    status: text(r.PaymentStatus) || text(r.collectionStatus) || "PENDING",
    walletCreditCount: toNumber(r.WalletCreditCount) ?? 0,
    walletCreditTime: text(r.WalletCreditTime) || null,
    canRefresh: r.CanRefresh === true || /^(true|1|yes)$/i.test(text(r.CanRefresh)),
    walletCredited:
      r.WalletCredited === undefined || r.WalletCredited === null
        ? null
        : r.WalletCredited === true || /^(true|1|yes)$/i.test(text(r.WalletCredited)),
  }));
  return { ok: true, rows };
}

export type BpayStatusResult = { ok: true; check: BpayStatusCheck } | { ok: false; error: string };

/** "1064274317" -> "••••4317": payout account numbers are never sent to the browser in full. */
const maskAccount = (value: string) => (value.length > 4 ? `••••${value.slice(-4)}` : value);

/**
 * Admin-only: `POST bpayStatusCheck_admin?referenceNumber=&pgOrderId=` — asks the vendor to re-check
 * one card collection (the vendor's CanRefresh flag says when that's useful). Vendor signature:
 * [HttpPost] bpayStatusCheck_admin(string referenceNumber, string pgOrderId), where referenceNumber is
 * the NPPG… reference and pgOrderId the collection ID; parameters in the query string. Confirmed
 * response: { status: "true", statusCode: "200", total: "1", data: [{ collectionId, charge, gst,
 * additionalCharge, status, message, utr, payouts: [{ accountNumber, ifsc, beneficiaryName, status,
 * message, paymentMode, utr, holderName }] }] }. All values are strings.
 */
export async function checkBpayStatus(referenceNumber: string, pgOrderId: string): Promise<BpayStatusResult> {
  const result = await aepsRequest("bpayStatusCheck_admin", { referenceNumber, pgOrderId }, { method: "POST", prefer: "json" });
  if (!result.ok) return result;

  const body = (result.body && typeof result.body === "object" ? result.body : {}) as Record<string, unknown>;
  const records = Array.isArray(body.data) ? (body.data as Record<string, unknown>[]) : [];
  const record = records[0];
  // "true" has been seen as a string; accept a real boolean too.
  const statusOk = body.status === true || /^true$/i.test(text(body.status));
  if (!statusOk || !record) {
    // Status, code and message only — never the payout account details.
    console.warn(
      `AEPS bpayStatusCheck_admin not ok: status=${JSON.stringify(body.status)} statusCode=${JSON.stringify(body.statusCode)} ` +
        `message=${JSON.stringify(text(body.message) || text(body.Message))} records=${records.length} ` +
        `recordStatus=${JSON.stringify(record?.status)} recordMessage=${JSON.stringify(record?.message)} keys=${Object.keys(body).join(",")}`,
    );
    const message = text(body.message) || text(body.Message) || text(record?.message);
    return { ok: false, error: message || (record ? "The status check failed." : "No record found for this reference.") };
  }

  const payouts = (Array.isArray(record.payouts) ? (record.payouts as Record<string, unknown>[]) : []).map((payout) => ({
    beneficiaryName: text(payout.beneficiaryName) || text(payout.holderName),
    account: maskAccount(text(payout.accountNumber)),
    ifsc: text(payout.ifsc),
    mode: text(payout.paymentMode),
    status: text(payout.status),
    message: text(payout.message),
    utr: text(payout.utr),
  }));
  return {
    ok: true,
    check: {
      status: text(record.status),
      message: text(record.message),
      collectionId: text(record.collectionId),
      utr: text(record.utr),
      charge: toNumber(record.charge),
      gst: toNumber(record.gst),
      additionalCharge: toNumber(record.additionalCharge),
      payouts,
    },
  };
}

export type DaySummaryResult = { ok: true; summary: DaySummary } | { ok: false; error: string };

/**
 * Admin-only: `POST TransferPgDaySummary?userName=&password=&from=yyyy-MM-dd&to=yyyy-MM-dd`
 * (GET returns 405; parameters in the query string, lower-case userName/password). JSON array,
 * one row per day: { ReportDate, TransferCount, TransferSuccessCount, TransferQueueCount,
 * TransferAmount, TransferSuccessAmount, PgCount, PgSuccessCount, PgPendingCount, PgAmount,
 * PgSuccessAmount, WalletCreditedCount, CardCount, CardSuccessCount, CardPendingCount, CardAmount,
 * CardSuccessAmount } — all numbers. Rows are summed, so a range of days works too.
 */
export async function fetchDaySummary(credentials: SessionCredentials, from: string, to: string): Promise<DaySummaryResult> {
  const result = await aepsRequest(
    "TransferPgDaySummary",
    { userName: credentials.userName, password: credentials.password, from, to },
    { method: "POST", prefer: "json" },
  );
  if (!result.ok) return result;
  if (!Array.isArray(result.body)) {
    console.error("AEPS TransferPgDaySummary did not return a list.");
    return { ok: false, error: AEPS_UNEXPECTED_ERROR };
  }

  const rows = result.body as Record<string, unknown>[];
  const sum = (key: string) => rows.reduce((total, row) => total + (toNumber(row[key]) ?? 0), 0);
  return {
    ok: true,
    summary: {
      transfers: {
        count: sum("TransferCount"),
        success: sum("TransferSuccessCount"),
        waiting: sum("TransferQueueCount"),
        amount: sum("TransferAmount"),
        successAmount: sum("TransferSuccessAmount"),
      },
      pg: {
        count: sum("PgCount"),
        success: sum("PgSuccessCount"),
        waiting: sum("PgPendingCount"),
        amount: sum("PgAmount"),
        successAmount: sum("PgSuccessAmount"),
        walletCredited: sum("WalletCreditedCount"),
      },
      card: {
        count: sum("CardCount"),
        success: sum("CardSuccessCount"),
        waiting: sum("CardPendingCount"),
        amount: sum("CardAmount"),
        successAmount: sum("CardSuccessAmount"),
      },
    },
  };
}

export type BulkpeStatementResult = { ok: true; statement: BulkpeStatementPage } | { ok: false; error: string };

/** Calendar day in India ("2026-10-21") of a vendor UTC timestamp, or null when it doesn't parse. */
function indiaDay(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

/**
 * Admin-only: `GET {CLIENT_API_BASE_URL}/APIClient/GetBulkpeStatement?pageNo=N` — the platform's
 * Bulkpe account statement, newest first, 150 entries per page. Response: { status: "true", page,
 * count, data: [{ transaction_id, reference_id, beneficiaryName, account_number, ifsc, amount,
 * payment_mode, payment_remark, statusDescription, status, utr, holderName, type, charge, gst,
 * settelment_amount, closing_balance, createdAt, updatedAt, … , token }] }.
 *
 * The vendor endpoint needs no credentials (anyone with the URL can read the whole statement), so
 * the role check on our route is the only gate. Only the fields below reach the browser: the
 * virtual-account fields and the full account number are dropped here. `token` is the code of the
 * BUL account the entry went through ("8539" → the "BUL 8539" card in the API level balance).
 */
export async function fetchBulkpeStatement(page: number): Promise<BulkpeStatementResult> {
  const result = await aepsRequest("APIClient/GetBulkpeStatement", { pageNo: String(page) }, { api: "client", prefer: "json" });
  if (!result.ok) return result;

  const body = (result.body && typeof result.body === "object" ? result.body : {}) as Record<string, unknown>;
  if (!Array.isArray(body.data)) {
    console.error(`AEPS GetBulkpeStatement did not return a list (keys: ${Object.keys(body).join(",")}).`);
    return { ok: false, error: AEPS_UNEXPECTED_ERROR };
  }

  const all: BulkpeEntry[] = (body.data as Record<string, unknown>[]).map((r) => {
    const account = text(r.account_number);
    return {
      id: text(r.transaction_id) || text(r.transcation_id),
      reference: text(r.reference_id),
      type: text(r.type),
      mode: text(r.payment_mode),
      amount: toNumber(r.amount) ?? 0,
      charge: toNumber(r.charge) ?? 0,
      gst: toNumber(r.gst) ?? 0,
      settlementAmount: toNumber(r.settelment_amount),
      closingBalance: toNumber(r.closing_balance),
      status: text(r.status).toUpperCase() || "PENDING",
      statusDescription: text(r.statusDescription),
      utr: text(r.utr),
      // Names arrive as "Mr_SHYAM_S".
      beneficiaryName: text(r.beneficiaryName).replace(/_+/g, " ").trim(),
      holderName: text(r.holderName),
      account: maskAccount(account),
      ifsc: text(r.ifsc),
      remark: text(r.payment_remark),
      bulAccount: text(r.token) ? `BUL ${text(r.token)}` : "",
      createdAt: text(r.createdAt),
      updatedAt: text(r.updatedAt),
    };
  });

  // Same rule as every report: nothing before the start date (or without a readable date) is shown.
  const entries = all.filter((entry) => {
    const day = indiaDay(entry.createdAt);
    return day !== null && day >= REPORTS_START_DATE;
  });
  const pageSize = toNumber(body.count) ?? 150;
  // An older page can exist only if this one was full and nothing in it was cut off by the start date.
  const hasMore = all.length > 0 && all.length >= pageSize && entries.length === all.length;
  return { ok: true, statement: { page, entries, hasMore } };
}
