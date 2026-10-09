// PG tally (admin): card collections vs the wallet credits they should produce, as returned by
// GET /api/dashboard/admin/pg-tally. Source: vendor POST PgTallyReport?from=&to= — one row per
// collection with its status and how many times it was credited to the retailer's wallet.

export type PgTallyRow = {
  /** ISO local time, e.g. "2026-10-09T13:46:23.207". */
  createdDateTime: string;
  collectionId: string;
  referenceNumber: string;
  /** Retailer's login (mobile number). */
  userName: string;
  /** Retailer's name. */
  vendorName: string;
  /** Charged to the customer's card. */
  debitFromCard: number;
  charges: number;
  /** Credited to the retailer's wallet (card amount − charges). */
  amount: number;
  /** SUCCESS / PENDING / FAILED. */
  status: string;
  /** How many times this collection was credited to the wallet (should be 1 for SUCCESS, 0 otherwise). */
  walletCreditCount: number;
  walletCreditTime: string | null;
  /** Vendor says a status check (bpayStatusCheck_admin) can update this collection. */
  canRefresh: boolean;
  /**
   * Vendor's own "credited" flag (WalletCredited). Seen true on collections whose WalletCreditCount
   * is still 0, so it counts as credited on its own. null when the vendor doesn't send it.
   */
  walletCredited: boolean | null;
};

/** One settlement payout from a status check. The account number is masked to its last 4 digits. */
export type BpayPayout = {
  beneficiaryName: string;
  account: string;
  ifsc: string;
  mode: string;
  status: string;
  message: string;
  utr: string;
};

/** Result of an admin status check (vendor bpayStatusCheck_admin → data[0]), shown in the popup. */
export type BpayStatusCheck = {
  status: string;
  message: string;
  collectionId: string;
  utr: string;
  charge: number | null;
  gst: number | null;
  additionalCharge: number | null;
  payouts: BpayPayout[];
};

/** Whether a collection's wallet credit adds up. */
export type TallyCheck = "ok" | "not-credited" | "double-credited" | "pending" | "failed" | "wrongly-credited";

export function tallyCheck(row: PgTallyRow): TallyCheck {
  const status = row.status.toUpperCase();
  if (status === "SUCCESS") {
    if (row.walletCreditCount > 1) return "double-credited";
    if (row.walletCreditCount === 1 || row.walletCredited === true) return "ok";
    return "not-credited";
  }
  // A collection that didn't succeed should never have been credited.
  if (row.walletCreditCount > 0 || row.walletCredited === true) return "wrongly-credited";
  return status === "FAILED" ? "failed" : "pending";
}

/** Checks that need someone to look at them (money collected but not credited, or credited wrongly). */
export const isTallyIssue = (check: TallyCheck) =>
  check === "not-credited" || check === "double-credited" || check === "wrongly-credited";

export type PgTallyTotals = {
  count: number;
  success: number;
  pending: number;
  failed: number;
  issues: number;
  /** Charged to cards, successful collections only. */
  collected: number;
  /** Fees on successful collections. */
  charges: number;
  /** Credited to wallets, counting each credit (a double credit counts twice). */
  credited: number;
};

export type PgTallyGroup = { vendorName: string; userName: string; rows: PgTallyRow[]; totals: PgTallyTotals };

export function tallyTotals(rows: PgTallyRow[]): PgTallyTotals {
  const totals: PgTallyTotals = { count: 0, success: 0, pending: 0, failed: 0, issues: 0, collected: 0, charges: 0, credited: 0 };
  for (const row of rows) {
    const status = row.status.toUpperCase();
    totals.count += 1;
    if (status === "SUCCESS") {
      totals.success += 1;
      totals.collected += row.debitFromCard;
      totals.charges += row.charges;
    } else if (status === "FAILED") totals.failed += 1;
    else totals.pending += 1;
    if (isTallyIssue(tallyCheck(row))) totals.issues += 1;
    // A WalletCredited flag with no counted credit still means one credit.
    totals.credited += row.amount * Math.max(row.walletCreditCount, row.walletCredited ? 1 : 0);
  }
  return totals;
}

/** One group per retailer, largest amount collected first. Rows newest first. */
export function groupByRetailer(rows: PgTallyRow[]): PgTallyGroup[] {
  const byUser = new Map<string, PgTallyRow[]>();
  for (const row of rows) {
    const key = row.userName || row.vendorName;
    byUser.set(key, [...(byUser.get(key) ?? []), row]);
  }
  return [...byUser.values()]
    .map((groupRows) => {
      const sorted = [...groupRows].sort((a, b) => b.createdDateTime.localeCompare(a.createdDateTime));
      return { vendorName: sorted[0].vendorName, userName: sorted[0].userName, rows: sorted, totals: tallyTotals(sorted) };
    })
    .sort((a, b) => b.totals.collected - a.totals.collected);
}
