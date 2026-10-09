import "server-only";
import { aepsRequest, AEPS_UNEXPECTED_ERROR } from "@/lib/server/aepsClient";
import { accountLabel, type ApiLevelBalance } from "@/lib/admin/apiBalance";
import type { PgTallyRow } from "@/lib/admin/pgTally";
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
  }));
  return { ok: true, rows };
}
