// Bulkpe statement (admin): every movement on the platform's Bulkpe payout account — payouts out
// (Debit) and money in (Credit) — with the balance after each, as returned by
// GET /api/dashboard/admin/bulkpe-statement?page=N. Source: vendor
// GET {CLIENT_API_BASE_URL}/APIClient/GetBulkpeStatement?pageNo=N, newest first, 150 per page.

export type BulkpeEntry = {
  /** Vendor transaction ID ("TRAREF00098555412"). */
  id: string;
  /** Our reference: the transfer's unique ID for payouts, the PG collection ("NPPG003504") for money in. */
  reference: string;
  /** "Credit" (money in) or "Debit" (payout). */
  type: string;
  /** IMPS / NEFT / … */
  mode: string;
  amount: number;
  charge: number;
  gst: number;
  /** Amount + charge + GST: what the payout took from the account. */
  settlementAmount: number | null;
  /** Account balance after this entry. */
  closingBalance: number | null;
  /** SUCCESS / PENDING / FAILED. */
  status: string;
  /** The bank's message, e.g. "npci:12 Rejected by npci - Transaction could not be processed". */
  statusDescription: string;
  utr: string;
  /** Name as entered for the payout ("Mr SHYAM S"). */
  beneficiaryName: string;
  /** Name the bank returned for the account, when it did. */
  holderName: string;
  /** Last 4 digits only ("••••7401"): payout account numbers never reach the browser in full. */
  account: string;
  ifsc: string;
  remark: string;
  /** The BUL account the entry went through ("BUL 8539"), from the vendor's `token`; "" when not sent. */
  bulAccount: string;
  /** ISO UTC, e.g. "2026-10-21T08:55:00.564Z". */
  createdAt: string;
  updatedAt: string;
};

export type BulkpeStatementPage = {
  page: number;
  entries: BulkpeEntry[];
  /** Whether an older page may exist. */
  hasMore: boolean;
};

export const isCredit = (entry: BulkpeEntry) => /^credit$/i.test(entry.type);

/** Joins newly loaded entries into the list: newest first, one row per transaction (the newer copy wins). */
export function mergeEntries(current: BulkpeEntry[], incoming: BulkpeEntry[]): BulkpeEntry[] {
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  for (const entry of incoming) byId.set(entry.id, entry);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Money in and out across the entries that went through (SUCCESS). */
export function statementTotals(entries: BulkpeEntry[]): { moneyIn: number; moneyOut: number } {
  let moneyIn = 0;
  let moneyOut = 0;
  for (const entry of entries) {
    if (!/^success$/i.test(entry.status)) continue;
    if (isCredit(entry)) moneyIn += entry.amount;
    else moneyOut += entry.amount;
  }
  return { moneyIn, moneyOut };
}
