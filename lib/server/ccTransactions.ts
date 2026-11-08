import "server-only";
import { aepsRequest, AEPS_UNEXPECTED_ERROR } from "@/lib/server/aepsClient";
import type { CcTxn, CcTxnsResponse } from "@/lib/admin/ccTransactions";

export type CcTxnsResult = { ok: true; data: CcTxnsResponse } | { ok: false; error: string };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const toNumber = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/,/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Calendar day in India ("2026-11-07") of a vendor UTC timestamp, or null when it doesn't parse. */
function indiaDay(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

/**
 * The credit-card payments received so far, by transaction ID (per server instance). The vendor's endpoint answers
 * a call made soon after another with part of the list, or none, so each answer is merged in rather than replacing
 * what we have: an empty answer never empties the drawer, and a payment's later status overwrites its earlier one.
 */
const cache = new Map<string, CcTxn>();
let updatedAt: string | null = null;
let inFlight: Promise<CcTxnsResult> | null = null;
const CACHE_MAX = 5000;
/** Bill Payments is searched for card details only this far back. */
const JOIN_DAYS = 31;

/**
 * Admin-only: the Bulkpe credit-card bill payments. Vendor `POST {CARDS_API_BASE_URL}/CreditCard/Statement` (no
 * body, no credentials — our route's admin check is the only gate; plain HTTP to a bare IP). Answers
 * `{ status: "success", statuscode: 200, message, data: [{ transactionId, reference, statementStatus,
 * statementMessage, statementAmount, statementCharge, statementGst, paymentMode, remark, utr, createdAt, updatedAt,
 * keyUsed: "bpay_5512", bbpsStatus, bbpsMessage, bbpsAmount, bbpsCharge, bbpsGst, totalCharge, npciRef, billerId,
 * billerName, billerCategory, fetchId, merchantReference, bbpsCreatedAt, bbpsUpdatedAt }] }` — about the last week,
 * in ~20 s; it ignores any date in the body. Only one vendor call runs at a time: a second request waits for it.
 */
export function fetchCcTransactions(): Promise<CcTxnsResult> {
  inFlight ??= load().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function load(): Promise<CcTxnsResult> {
  const result = await aepsRequest("CreditCard/Statement", {}, { api: "cards", method: "POST", prefer: "json", timeoutMs: 50_000 });
  let received = 0;
  let warning: string | undefined;
  const body = result.ok && result.body && typeof result.body === "object" ? (result.body as Record<string, unknown>) : null;

  if (!body || !Array.isArray(body.data)) {
    if (result.ok) {
      console.error(`CreditCard/Statement did not return a list (keys: ${body ? Object.keys(body).join(",") : typeof result.body}).`);
    }
    if (cache.size === 0) return { ok: false, error: result.ok ? AEPS_UNEXPECTED_ERROR : result.error };
    warning = "The payments service didn't answer this time, so this is the last list it sent.";
  } else {
    const rows = (body.data as Record<string, unknown>[]).map(toCcTxn).filter((txn) => txn.id);
    received = rows.length;
    for (const row of rows) {
      const known = cache.get(row.id);
      // A fresh row has no card details (they come from Bill Payments): keep the ones already joined.
      cache.set(
        row.id,
        known && (known.card || known.mobile)
          ? { ...row, card: row.card || known.card, mobile: row.mobile || known.mobile, retailer: known.retailer, shop: known.shop }
          : row,
      );
    }
    updatedAt = new Date().toISOString();
  }

  await addCardDetails();

  const entries = [...cache.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const old of entries.slice(CACHE_MAX)) cache.delete(old.id);
  const kept = entries.slice(0, CACHE_MAX);
  // Counts only, never values.
  console.info(`CreditCard/Statement: ${received} rows received, ${kept.length} kept, ${kept.filter((t) => t.card).length} with card details.`);
  return { ok: true, data: { entries: kept, received, updatedAt: updatedAt ?? new Date().toISOString(), ...(warning && { warning }) } };
}

function toCcTxn(r: Record<string, unknown>): CcTxn {
  const key = /(\d+)\s*$/.exec(text(r.keyUsed))?.[1];
  // Not sent today; picked up (last 4 digits only) if the vendor adds a card number field.
  const cardField = Object.entries(r).find(([name]) => /card.*(no|num)|maskedcard/i.test(name))?.[1];
  const last4 = text(cardField).replace(/\D/g, "").slice(-4);
  return {
    id: text(r.transactionId),
    reference: text(r.reference),
    // `status` / `amount` / `message`: the endpoint's first version, before it added the BBPS fields.
    status: (text(r.statementStatus) || text(r.status) || text(r.bbpsStatus) || "PENDING").toUpperCase(),
    statementMessage: text(r.statementMessage) || text(r.message),
    amount: toNumber(r.bbpsAmount),
    totalDebited: toNumber(r.statementAmount) ?? toNumber(r.amount),
    charge: toNumber(r.bbpsCharge),
    gst: toNumber(r.bbpsGst),
    totalCharge: toNumber(r.totalCharge),
    mode: text(r.paymentMode),
    remark: text(r.remark),
    utr: text(r.utr),
    bulAccount: key ? `BUL ${key}` : text(r.keyUsed),
    bbpsStatus: text(r.bbpsStatus).toUpperCase(),
    bbpsMessage: text(r.bbpsMessage),
    npciRef: text(r.npciRef),
    billerId: text(r.billerId),
    bank: text(r.billerName),
    billerCategory: text(r.billerCategory),
    fetchId: text(r.fetchId),
    merchantReference: text(r.merchantReference),
    createdAt: text(r.createdAt),
    updatedAt: text(r.updatedAt),
    bbpsCreatedAt: text(r.bbpsCreatedAt),
    bbpsUpdatedAt: text(r.bbpsUpdatedAt),
    card: last4.length === 4 ? `•••• ${last4}` : "",
    mobile: text(r.mobileNumber) || text(r.MobileNumber),
    retailer: "",
    shop: "",
    refund: toRefund(r.refund),
  };
}

/** `refund: { refundStatus, refundMessage, refundAmount, refundCharge, refundGst, refundedAt }` on refunded payments. */
function toRefund(value: unknown): CcTxn["refund"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  const refund = {
    status: text(r.refundStatus).toUpperCase(),
    message: text(r.refundMessage),
    amount: toNumber(r.refundAmount),
    charge: toNumber(r.refundCharge),
    gst: toNumber(r.refundGst),
    refundedAt: text(r.refundedAt),
  };
  return refund.amount === null && !refund.refundedAt && !refund.status ? null : refund;
}

/**
 * The statement has no card, mobile or shop, but Bill Payments does: vendor `GET {CLIENT_API_BASE_URL}/APIClient/
 * GetBillPaymentsDatewise?fromDate=&toDate=` without `userName` returns every retailer's bill payments, and its
 * `bpay_billFetchId` is the statement's `fetchId` (195 of 197 matched, with the amount and biller agreeing on every
 * one). One call covers the days of the payments still missing details; best effort — a failure leaves them blank.
 * `fullCardNumber` is read only for its last 4 digits and never kept.
 */
async function addCardDetails(): Promise<void> {
  const oldest = new Date(Date.now() - JOIN_DAYS * 86_400_000).toISOString();
  const missing = [...cache.values()].filter((t) => t.fetchId && !t.card && !t.mobile && t.createdAt >= oldest);
  const days = missing.map((t) => indiaDay(t.createdAt)).filter((day): day is string => day !== null).sort();
  if (days.length === 0) return;

  const result = await aepsRequest(
    "APIClient/GetBillPaymentsDatewise",
    { fromDate: days[0], toDate: days[days.length - 1] },
    { api: "client", prefer: "json", timeoutMs: 30_000 },
  );
  if (!result.ok) return;
  const body = result.body as Record<string, unknown> | unknown[] | null;
  const list = Array.isArray(body) ? body : body && Array.isArray(body.data) ? (body.data as unknown[]) : [];

  const byFetchId = new Map<string, Record<string, unknown>>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (text(row.bpay_billFetchId)) byFetchId.set(text(row.bpay_billFetchId), row);
  }
  for (const txn of missing) {
    const bill = byFetchId.get(txn.fetchId);
    if (!bill) continue;
    const last4 = (text(bill.accountNO) || text(bill.fullCardNumber)).replace(/\D/g, "").slice(-4);
    cache.set(txn.id, {
      ...txn,
      card: last4.length === 4 ? `•••• ${last4}` : txn.card,
      mobile: text(bill.MobileNumber) || txn.mobile,
      retailer: text(bill.username),
      shop: text(bill.StoreName) || text(bill.VendorName),
    });
  }
}
