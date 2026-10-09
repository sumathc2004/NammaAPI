import "server-only";
import { aepsRequest, AEPS_UNEXPECTED_ERROR } from "@/lib/server/aepsClient";
import { accountLabel, type ApiLevelBalance } from "@/lib/admin/apiBalance";
import type { BpayStatusCheck, PgTallyRow } from "@/lib/admin/pgTally";
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
