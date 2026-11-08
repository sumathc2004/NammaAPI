// Bulkpe CC transactions (admin): credit-card bill payments made through the Bulkpe BUL accounts, as returned by
// GET /api/dashboard/admin/cc-transactions. Source: vendor POST {CARDS_API_BASE_URL}/CreditCard/Statement, joined
// with Bill Payments (GetBillPaymentsDatewise) on the BBPS fetch ID for the card's last 4 digits, the mobile number
// and the shop — the statement itself carries none of those.

export type CcTxn = {
  /** Vendor transaction ID ("TRAREF00098871356"). */
  id: string;
  /** BBPS reference ("BBPSL000261321"). */
  reference: string;
  /** SUCCESS / PENDING / FAILED (the statement's status). */
  status: string;
  statementMessage: string;
  /** Paid to the card (bbpsAmount). */
  amount: number | null;
  /** Taken from the BUL account: amount + charges (statementAmount). */
  totalDebited: number | null;
  charge: number | null;
  gst: number | null;
  totalCharge: number | null;
  mode: string;
  remark: string;
  utr: string;
  /** "BUL 5512", from the vendor's `keyUsed` ("bpay_5512"). */
  bulAccount: string;
  bbpsStatus: string;
  bbpsMessage: string;
  npciRef: string;
  billerId: string;
  /** The card's bank, from `billerName` ("HDFC Credit Card"). */
  bank: string;
  billerCategory: string;
  fetchId: string;
  merchantReference: string;
  /** ISO UTC. */
  createdAt: string;
  updatedAt: string;
  bbpsCreatedAt: string;
  bbpsUpdatedAt: string;
  /** Last 4 digits only ("•••• 4321"): card numbers never reach the browser in full. "" until joined. */
  card: string;
  mobile: string;
  /** The retailer's login (mobile number) and shop, from Bill Payments. */
  retailer: string;
  shop: string;
  /** The vendor's `refund` object, sent on failed payments that were refunded; null otherwise. */
  refund: CcRefund | null;
};

export type CcRefund = {
  status: string;
  message: string;
  amount: number | null;
  charge: number | null;
  gst: number | null;
  /** ISO UTC. */
  refundedAt: string;
};

/** Amount + charges + GST given back on a refund. */
export function ccRefundTotal(refund: CcRefund): number | null {
  if (refund.amount === null) return null;
  return Math.round((refund.amount + (refund.charge ?? 0) + (refund.gst ?? 0)) * 100) / 100;
}

export type CcTxnsResponse = {
  /** Every transaction kept on the server, newest first. */
  entries: CcTxn[];
  /** How many rows the vendor's last answer had (it sometimes answers with part of the list, or none). */
  received: number;
  updatedAt: string;
  /** Set when the vendor didn't answer and the list shown is the last one received. */
  warning?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The headline amount: what was paid to the card, else the total debited. */
export const ccAmount = (txn: CcTxn) => txn.amount ?? txn.totalDebited ?? 0;

/** Charges + GST on a payment (₹2.36), or null when the vendor didn't say. */
export function ccFee(txn: CcTxn): number | null {
  if (txn.totalCharge !== null) return txn.totalCharge;
  if (txn.totalDebited !== null && txn.amount !== null) return round2(txn.totalDebited - txn.amount);
  return null;
}
