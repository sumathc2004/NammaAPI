// Admin day summary, as returned by GET /api/dashboard/admin/day-summary.
// Source: vendor POST TransferPgDaySummary?userName=&password=&from=&to= → one row per day.

export type DaySummaryPart = {
  count: number;
  success: number;
  /** Not finished yet: "in queue" for transfers, "pending" for PG and card. */
  waiting: number;
  amount: number;
  successAmount: number;
};

export type DaySummary = {
  transfers: DaySummaryPart;
  /** Payment gateway collections; `walletCredited` = how many were credited to wallets. */
  pg: DaySummaryPart & { walletCredited: number };
  card: DaySummaryPart;
};
