// API-level balance shown on the admin page, as returned by GET /api/dashboard/admin/api-balance.
// Source: vendor POST getapiLevelbalance → { Status, Message, Data: { wallet, bul_XXXX…, diff } }.

export type ApiBalanceAccount = { key: string; label: string; amount: number };

export type ApiLevelBalance = {
  /** Platform (API-level) wallet balance. */
  wallet: number;
  /** Every other balance in the response, e.g. `bul_0080`, in the vendor's order. */
  accounts: ApiBalanceAccount[];
  /** Vendor-computed difference: wallet minus the sum of the accounts. */
  diff: number | null;
};

/** "bul_0080" -> "BUL 0080". The vendor hasn't documented what the prefixes stand for. */
export function accountLabel(key: string): string {
  return key.replace(/[_-]+/g, " ").trim().toUpperCase();
}
