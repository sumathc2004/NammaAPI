// Bill payment disputes (vendor /api/bill/getDisputes) — client-safe helpers. The vendor's row shape isn't
// documented (the list was empty when this was written), so fields are found by normalized name and every
// field the vendor sends is kept for the "All fields" view.

export type DisputeRow = Record<string, string>;

/** Statuses the page filters by. The vendor's own words: a raised dispute is OPEN, an admin sets it RESOLVED. */
export const DISPUTE_FILTERS = [
  { id: "OPEN", label: "Open" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "ALL", label: "All" },
] as const;

const normalize = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The value of the first field whose normalized name matches one of the patterns. */
function pick(row: DisputeRow, ...patterns: RegExp[]): string {
  for (const pattern of patterns) {
    for (const [key, value] of Object.entries(row)) {
      if (value && pattern.test(normalize(key))) return value;
    }
  }
  return "";
}

export type DisputeView = {
  id: string;
  uniqueId: string;
  userName: string;
  reason: string;
  billPaidRefNo: string;
  status: string;
  adminRemarks: string;
  createdAt: string;
};

export function disputeView(row: DisputeRow): DisputeView {
  return {
    id: pick(row, /^id$/, /^disputeid$/),
    uniqueId: pick(row, /^uniqueid$/),
    userName: pick(row, /^username$/, /^mobilenumber$/, /^mobile$/),
    reason: pick(row, /^reason$/, /^description$/),
    billPaidRefNo: pick(row, /^billpaidrefno$/),
    status: pick(row, /^status$/, /^disputestatus$/),
    adminRemarks: pick(row, /^adminremarks$/, /^remarks$/),
    createdAt: pick(row, /^createdat$/, /^createddate$/, /^createdon$/, /^raisedat$/, /^createddatetime$/, /^date$/),
  };
}

export const isOpenDispute = (status: string) => /^open/i.test(status.trim());
