/** What the vendor's live status check says about one transfer (client-safe; the server fills it in). */
export type TransferStatusCheck = {
  uniqueId: string;
  channel: string;
  amount: number | null;
  /** The vendor's India wall-clock time without a timezone, e.g. "2026-11-09T20:08:58.527". */
  txnTime: string;
  status: string;
  remarks: string;
  utr: string;
  canRefund: boolean;
  /** The vendor's `isAddQueue`: the transfer can be put back in the queue. */
  canEnqueue: boolean;
};
