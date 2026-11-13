// Dispute History (vendor bill/getMarkFailedWithDispute) — client-safe row type and helpers.

export type DisputeHistoryRow = {
  billPaidRefNo: string;
  amount: string;
  createdAt: string;
  mobileNumber: string;
  bankName: string;
  cardLast4: string;
  retailerName: string;
  storeName: string;
  disputeRaised: boolean;
  disputeStatus: string;
  disputeRaisedAt: string;
  disputeReason: string;
};

export const HISTORY_FILTERS = [
  { id: "all", label: "All" },
  { id: "disputed", label: "Disputed" },
  { id: "open", label: "Dispute open" },
  { id: "resolved", label: "Dispute resolved" },
  { id: "none", label: "No dispute" },
] as const;

export const isHistoryOpen = (row: DisputeHistoryRow) => row.disputeRaised && !/resolv|clos|done/i.test(row.disputeStatus);
export const isHistoryResolved = (row: DisputeHistoryRow) => row.disputeRaised && /resolv|clos|done/i.test(row.disputeStatus);

export function historyMatches(row: DisputeHistoryRow, filter: string): boolean {
  if (filter === "disputed") return row.disputeRaised;
  if (filter === "open") return isHistoryOpen(row);
  if (filter === "resolved") return isHistoryResolved(row);
  if (filter === "none") return !row.disputeRaised;
  return true;
}

/** Newest first by the payment's time (ISO-style strings sort as text). */
export const sortHistory = (rows: DisputeHistoryRow[]) => [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
