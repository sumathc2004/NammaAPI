import type { DashboardSectionId } from "@/lib/data/dashboardNav";
import type { ColumnSlot } from "@/lib/reports/table";

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

export const reportLayouts: Partial<Record<DashboardSectionId, ColumnSlot[]>> = {
  "wallet-ledger": ledgerColumns,
};
