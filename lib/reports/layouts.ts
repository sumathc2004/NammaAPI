import type { DashboardSectionId } from "@/lib/data/dashboardNav";
import { isRefreshableTransfer, type ColumnSlot, type ReportRow } from "@/lib/reports/table";

// Fixed column layouts for report sections, in display order. Each slot lists the vendor field
// names it accepts (lowercased, separators removed), most specific first. Sections without a
// layout show every non-empty field the vendor returns.

const ledgerColumns: ColumnSlot[] = [
  {
    id: "dateTime",
    label: "Date & Time",
    kind: "date",
    priority: 5,
    keys: [
      /^(datetime|transactiondatetime|txndatetime|entrydatetime)$/,
      /^(transactiondate|txndate|entrydate|createdon|createddate|addeddate|adddate|date|trandate)$/,
      /date|createdon/,
    ],
    appendKeys: [/^(time|transactiontime|txntime|entrytime|trantime)$/],
  },
  {
    id: "type",
    label: "Type",
    kind: "text",
    priority: 6,
    keys: [
      /^(type|txntype|transactiontype|trantype|servicetype|service|servicename|category|mode|txnmode|purpose)$/,
      /type|service/,
    ],
  },
  {
    id: "narration",
    label: "Narration",
    kind: "text",
    priority: 4,
    keys: [/narration/, /^(description|desc|remarks?|particulars?|details?)$/, /remark|particular|description|detail|comment/],
  },
  {
    id: "amount",
    label: "Amount",
    kind: "amount",
    priority: 3,
    keys: [/^(amount|amt|txnamount|transactionamount|txnamt|transactionamt|tranamount)$/, /amount|amt/],
    exclude: /bal|opening|closing|charge|commission|fee|tds|gst/,
  },
  {
    id: "crdr",
    label: "Cr/Dr",
    kind: "entryType",
    priority: 1,
    keys: [/^(crdr|drcr|crordr|drorcr|crdrtype|drcrtype|entrytype)$/],
    matchEntryValues: true,
  },
  {
    id: "closingBalance",
    label: "Closing Balance",
    kind: "amount",
    priority: 2,
    keys: [/closing|balanceafter|afterbalance|closebal/, /^(balance|bal|currentbalance|currentbal|runningbalance)$/],
    exclude: /opening/,
  },
];

// AEPS GetTxnsByDate: timestamp, transactiontype (mapped to a name server-side), adhaarnumber
// (masked server-side), mobilenumber (the user's own — not shown), amount, userCreditAmount,
// userCB, remarks, UTR.
const aepsColumns: ColumnSlot[] = [
  { id: "dateTime", label: "Date & Time", kind: "date", priority: 1, keys: [/^timestamp$/, /date|time/] },
  { id: "type", label: "Type", kind: "text", priority: 2, keys: [/^transactiontype$/, /type/] },
  { id: "aadhaar", label: "Aadhaar", kind: "text", priority: 3, keys: [/a+dh?a+r/], hideBelow: "lg" },
  { id: "amount", label: "Amount", kind: "amount", priority: 4, keys: [/^amount$/] },
  { id: "credited", label: "Credited", kind: "amount", tone: "credit", priority: 5, keys: [/^usercreditamount$/, /credit/] },
  // What the vendor's "userCB" means isn't documented; labelled as sent.
  { id: "userCb", label: "User CB", kind: "amount", priority: 6, keys: [/^usercb$/], hideBelow: "xl" },
  { id: "remarks", label: "Remarks", kind: "text", priority: 7, keys: [/remark|narration|description/] },
  { id: "utr", label: "UTR", kind: "text", priority: 8, keys: [/^utr$/, /rrn|reference/], hideBelow: "xl" },
];

// PG GetLinksByDate (card payment collections): createdDateTime, custName, card ("•••• 5968", last 4
// digits, built server-side), DebitFromCard, Charges, amountCreditToBank, settlementType, status,
// referenceNumber. IDs, the user's own number and always-empty fields are left out.
const pgColumns: ColumnSlot[] = [
  { id: "dateTime", label: "Date & Time", kind: "date", priority: 1, keys: [/^createddatetime$/, /date|time/] },
  { id: "customer", label: "Customer", kind: "text", priority: 2, keys: [/^custname$/, /holdername|customer/] },
  { id: "card", label: "Card", kind: "text", priority: 3, keys: [/^card$/] },
  { id: "amount", label: "Amount", kind: "amount", priority: 4, keys: [/^debitfromcard$/] },
  { id: "charges", label: "Charges", kind: "amount", priority: 5, keys: [/^charges$/], hideBelow: "lg" },
  { id: "credited", label: "Credited", kind: "amount", tone: "credit", priority: 6, keys: [/^amountcredittobank$/] },
  { id: "settlement", label: "Settlement", kind: "text", priority: 7, keys: [/^settlementtype$/], hideBelow: "xl" },
  { id: "status", label: "Status", kind: "status", priority: 8, keys: [/^status$/] },
  { id: "reference", label: "Reference", kind: "text", priority: 9, keys: [/^referencenumber$/], hideBelow: "xl" },
];

// Transfer report (transfer/report): time, Amount, BeneficiaryAccntNumber, BeneficiaryName,
// BeneficiaryIFSCcode, UTR, SenderMobileNumber, StoreName (always the user's own), Channel (the
// vendor's payout partner — not shown), TxnStatus ("Refunded" set server-side), dequeue, CanRefund,
// Remarks, UniqueTxnId.
// IDs and numbers use format "code" (monospace, never broken mid-number); names wrap between words only.
const transferColumns: ColumnSlot[] = [
  { id: "dateTime", label: "Date & Time", kind: "date", priority: 1, keys: [/^time$/, /date|time/] },
  { id: "txnId", label: "Txn ID", kind: "text", format: "code", priority: 2, keys: [/^uniquetxnid$/, /txnid/], hideBelow: "lg" },
  { id: "sender", label: "Sender", kind: "text", format: "code", priority: 3, keys: [/^sendermobilenumber$/, /sender/], hideBelow: "2xl" },
  { id: "beneficiary", label: "Beneficiary", kind: "text", format: "words", priority: 4, keys: [/^beneficiaryname$/, /benef.*name/] },
  {
    id: "account",
    label: "Account",
    kind: "text",
    format: "code",
    priority: 5,
    keys: [/^beneficiaryaccntnumber$/, /acc(ou)?nt/],
    sub: { label: "IFSC", keys: [/ifsc/] },
    hideBelow: "xl",
  },
  { id: "amount", label: "Amount", kind: "amount", priority: 6, keys: [/^amount$/] },
  { id: "utr", label: "UTR", kind: "text", format: "code", priority: 7, keys: [/^utr$/], hideBelow: "xl" },
  { id: "status", label: "Status", kind: "status", priority: 8, keys: [/^txnstatus$/, /status/] },
  { id: "remarks", label: "Remarks", kind: "text", format: "words", priority: 9, keys: [/^remarks?$/], hideBelow: "2xl" },
];

export const reportLayouts: Partial<Record<DashboardSectionId, ColumnSlot[]>> = {
  transfer: transferColumns,
  "wallet-ledger": ledgerColumns,
  "aeps-reports": aepsColumns,
  "pg-reports": pgColumns,
};

/** A tab above a report that shows only the rows it matches (no `match` = every row). */
export type ReportViewTab = { id: string; label: string; emptyText?: string; match?: (row: ReportRow) => boolean };

const isYes = (value = "") => /^(yes|y|true|1)$/i.test(value.trim());

/** Transfer statuses that mean "not processed yet". */
const QUEUED_STATUS = /^(queued?|in ?queue|pending|initiated|processing|in ?process|on ?hold|hold)$/i;

// Transfer tabs. Queue: TxnStatus "in queue" (seen live; shown as "In Queue"), plus "dequeue: true"
// as a guess (not documented by the vendor). Refundable: CanRefund "yes" (confirmed).
const transferViews: ReportViewTab[] = [
  { id: "all", label: "All" },
  {
    id: "queue",
    label: "Queue",
    emptyText: "No transfers in the queue for this period.",
    match: (row) => isYes(row.dequeue) || QUEUED_STATUS.test(row.TxnStatus ?? ""),
  },
  {
    id: "refundable",
    label: "Refundable",
    emptyText: "No refundable transfers for this period.",
    match: (row) => isYes(row.CanRefund),
  },
  {
    id: "needs-refresh",
    label: "Refresh",
    emptyText: "No transfers waiting on a UTR for this period.",
    match: isRefreshableTransfer,
  },
];

export const reportViews: Partial<Record<DashboardSectionId, ReportViewTab[]>> = {
  transfer: transferViews,
};
