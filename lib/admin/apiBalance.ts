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

/** The BUL accounts (`bul_0080` …). Super-access accounts see only these. */
export const isBulAccount = (key: string) => /^bul/i.test(key);

/** The only BUL accounts a super-access login may see: the last four digits of `bul_0724`, `bul_5512`, `bul_6633` and `bul_6752`. */
export const SUPER_ACCESS_BUL_CODES = ["0724", "5512", "6633", "6752"];

export const isSuperAccessBul = (key: string) => {
  const code = /^bul\D*(\d+)$/i.exec(key.trim())?.[1];
  return code !== undefined && SUPER_ACCESS_BUL_CODES.includes(code);
};

/** "bul_0080" -> "BUL 0080". The vendor hasn't documented what the prefixes stand for. */
export function accountLabel(key: string): string {
  return key.replace(/[_-]+/g, " ").trim().toUpperCase();
}

/** One saved snapshot of the platform balances: the vendor's getApiLevelBalance history (newest first). */
export type BalanceSnapshot = {
  id: number;
  /** The vendor's wall-clock time (India), "yyyy-MM-ddTHH:mm:ss.fff" — it carries no timezone. */
  at: string;
  wallet: number;
  diff: number | null;
  /** Every other balance in the snapshot (lower-case key such as `bul_0080` or `pending`), in the vendor's order. */
  accounts: ApiBalanceAccount[];
};

export type SnapshotChange = { key: string; label: string; delta: number };

/** What moved between an older snapshot and the next one: the API wallet and every balance, never the difference itself. */
export function snapshotChanges(newer: BalanceSnapshot, older: BalanceSnapshot): SnapshotChange[] {
  const round = (n: number) => Math.round(n * 100) / 100;
  const changes: SnapshotChange[] = [];
  const walletDelta = round(newer.wallet - older.wallet);
  if (walletDelta !== 0) changes.push({ key: "wallet", label: "API WALLET", delta: walletDelta });
  const before = new Map(older.accounts.map((a) => [a.key, a.amount]));
  for (const account of newer.accounts) {
    const delta = round(account.amount - (before.get(account.key) ?? 0));
    if (delta !== 0) changes.push({ key: account.key, label: account.label, delta });
  }
  return changes;
}
