// Report data as returned by /api/dashboard/report, plus formatting rules for displaying it.
// Columns come from the vendor's field names, so formatting is inferred from names and values.

export type ReportRow = Record<string, string>;
export type ReportTable = { columns: string[]; rows: ReportRow[] };

/** The vendor's per-transaction transfer actions (shared by the client UI and the server routes). */
export type TransferAction = "dequeue" | "enqueue" | "refund";

export type ColumnKind = "amount" | "date" | "entryType" | "status" | "text";
export type AmountTone = "credit" | "debit" | "neutral";

export type ColumnInfo = {
  key: string;
  label: string;
  kind: ColumnKind;
  tone: AmountTone;
  /** Amount columns: colour each row by this Cr/Dr column instead of a fixed tone. */
  toneKey?: string;
  /** Date columns: a separate time field shown after the date. */
  extraKey?: string;
  /** Amount columns built from separate fields: `key` is the credit field, this is the debit field. */
  altKey?: string;
  /** Hide this column in the table below this breakpoint (it stays in mobile cards, search and CSV). */
  hideBelow?: "lg" | "xl" | "2xl";
  /** A second field shown under the value (e.g. IFSC under the account number); its own column in CSV. */
  subKey?: string;
  subLabel?: string;
  /** "code": IDs and numbers, in monospace and never broken across lines. "words": wraps only between words. */
  format?: TextFormat;
};

export type TextFormat = "code" | "words";

/** Header text: "Account / IFSC" for a column with a second field. */
export const columnTitle = (column: ColumnInfo) => (column.subLabel ? `${column.label} / ${column.subLabel}` : column.label);

// Transfer-row flags: the vendor has sent the same concept under more than one field spelling
// (CanRefund vs canbeRefund, dequeue vs AddToqueue vs dequeueEnable), so these match by the
// field's normalized name rather than a fixed key — missing a spelling silently shows a tab as
// always-empty instead of erroring.
const isYes = (value = "") => /^(yes|y|true|1)$/i.test(value.trim());
const normalizeFieldName = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

function rowFlag(row: ReportRow, names: string[]): boolean {
  return Object.keys(row).some((key) => names.includes(normalizeFieldName(key)) && isYes(row[key]));
}

/** Transfer statuses that mean "not processed yet". */
const QUEUED_STATUS = /^(queued?|in ?queue|pending|initiated|processing|in ?process|on ?hold|hold)$/i;

/**
 * Transfer statuses that are final: such a row is never "in the queue", whatever its queue flag
 * says (the vendor leaves the flag set on refunded rows, e.g. the "…R1" refund records).
 */
const FINISHED_STATUS = /^(success(ful)?|failed?|failure|refunded|reversed|cancelled|dequeued)$/i;

/** Transfer only: eligible for a refund (CanRefund "yes", confirmed; also seen as canbeRefund). */
export const isRefundableTransfer = (row: ReportRow) => rowFlag(row, ["canrefund", "canberefund"]);

/**
 * Transfer only: queued for processing — seen live as TxnStatus "In Queue", or a dequeue/queue
 * flag. A refundable row has already left the queue (it was dequeued), even though the vendor's
 * status text can still say "In Queue", so refundable wins.
 */
export const isQueuedTransfer = (row: ReportRow) =>
  !isRefundableTransfer(row) &&
  !FINISHED_STATUS.test(row.TxnStatus ?? "") &&
  (rowFlag(row, ["dequeue", "addtoqueue", "dequeueenable"]) || QUEUED_STATUS.test(row.TxnStatus ?? ""));

/** Transfer only: the vendor still says "In Queue" for a row that is refundable — shown as Refundable instead. */
export const hasStaleQueuedStatus = (row: ReportRow) =>
  isRefundableTransfer(row) && QUEUED_STATUS.test(row.TxnStatus ?? "");

// Placeholder values the vendor sends instead of a real bank UTR — not just a blank field.
const IMPROPER_UTR = /^(-|0+|n\/?a|null|nil|pending|tbd|na)$/i;

/** A real bank UTR is exactly 12 digits; anything else (blank, placeholder, wrong length) isn't proper. */
export function isProperUtr(utr: string | undefined): boolean {
  const value = (utr ?? "").trim();
  if (!value || IMPROPER_UTR.test(value)) return false;
  return /^\d{12}$/.test(value);
}

/**
 * Transfer only: worth a manual re-check — the vendor's own canRefresh flag when it sends one,
 * otherwise Success with no (or no valid) UTR yet.
 */
export const isRefreshableTransfer = (row: ReportRow) =>
  rowFlag(row, ["canrefresh"]) || (row.TxnStatus === "Success" && !isProperUtr(row.UTR));

/**
 * Transfer only: best-effort local update after a successful Dequeue/Enqueue/Refund, so the row's
 * badge and buttons change immediately — the vendor's action endpoints return only a status
 * message, not the row's new data, and re-fetching the report may lag behind the action.
 */
export function applyTransferActionPatch(action: TransferAction, row: ReportRow): ReportRow {
  const next = { ...row };
  const clear = (names: string[]) => {
    for (const key of Object.keys(next)) if (names.includes(normalizeFieldName(key))) next[key] = "";
  };
  if (action === "dequeue") {
    clear(["dequeue", "addtoqueue", "dequeueenable"]);
    next.TxnStatus = "Dequeued";
  } else if (action === "enqueue") {
    clear(["canrefund", "canberefund"]);
    next.TxnStatus = "In Queue";
  } else {
    clear(["canrefund", "canberefund"]);
    next.TxnStatus = "Refunded";
  }
  return next;
}

/** Transfer only: the vendor's internal id for this row (field name varies), used by row actions like dequeue. */
export function transferRowId(row: ReportRow): string | undefined {
  const key = Object.keys(row).find((k) => normalizeFieldName(k) === "id");
  const value = key ? row[key]?.trim() : undefined;
  return value || undefined;
}

const isZero = (value: string) => !value || Number(value.replace(/,/g, "")) === 0;

/** The value shown in a cell: for a combined credit/debit Amount, whichever of the two is non-zero. */
export function cellValue(column: ColumnInfo, row: ReportRow): string {
  const value = row[column.key] ?? "";
  if (column.altKey && isZero(value) && !isZero(row[column.altKey] ?? "")) return row[column.altKey] ?? "";
  return value;
}

/** Whether an amount cell is a credit or a debit: from the row's Cr/Dr field, the credit/debit field it came from, or the column. */
export function amountTone(column: ColumnInfo, row: ReportRow): AmountTone {
  if (column.toneKey) {
    const marker = (row[column.toneKey] ?? "").toLowerCase();
    return marker.startsWith("c") ? "credit" : marker.startsWith("d") ? "debit" : "neutral";
  }
  if (column.altKey) {
    if (!isZero(row[column.key] ?? "")) return "credit";
    if (!isZero(row[column.altKey] ?? "")) return "debit";
    return "neutral";
  }
  return column.tone;
}

const AMOUNT_KEY = /amount|amt|balance|bal$|credit|debit|charge|commission|fee|tds|gst|^cr$|^dr$/i;
const DATE_KEY = /date|time/i;
const CREDIT_KEY = /credit|^cr|cramount|cr_?amt/i;
const DEBIT_KEY = /debit|^dr|dramount|dr_?amt/i;
const ENTRY_TYPES = new Set(["cr", "dr", "credit", "debit"]);
const STATUSES = new Set(["success", "successful", "failed", "failure", "pending", "processing", "cancelled", "refunded", "reversed"]);

const isNumeric = (value: string) => /^-?\d+(\.\d+)?$/.test(value.replace(/,/g, ""));

/** "TransactionDate" / "txn_date" / "CRAmount" -> "Transaction Date" / "Txn Date" / "CR Amount" */
export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

/** Decides how each column is displayed; drops columns that are empty in every row. */
export function describeColumns(table: ReportTable): ColumnInfo[] {
  return table.columns
    .map((key) => {
      const values = table.rows.map((row) => row[key] ?? "").filter(Boolean);
      return { key, values };
    })
    .filter(({ values }) => values.length > 0)
    .map(({ key, values }) => {
      let kind: ColumnKind = "text";
      if (values.every((v) => ENTRY_TYPES.has(v.toLowerCase()))) kind = "entryType";
      else if (values.every((v) => STATUSES.has(v.toLowerCase()))) kind = "status";
      else if (AMOUNT_KEY.test(key) && values.every(isNumeric)) kind = "amount";
      else if (DATE_KEY.test(key) && values.some((v) => parseDate(v))) kind = "date";

      const tone: AmountTone =
        kind !== "amount" || /balance|bal$/i.test(key) ? "neutral" : CREDIT_KEY.test(key) ? "credit" : DEBIT_KEY.test(key) ? "debit" : "neutral";

      return { key, label: humanizeKey(key), kind, tone };
    });
}

/** ISO ("2026-10-03T14:05:00"), .NET JSON ("/Date(1759480500000)/") and .NET en-US ("10/3/2026 5:46:26 PM") dates. */
export function parseDate(value: string): Date | null {
  const dotNet = /^\/Date\((-?\d+)/.exec(value);
  if (dotNet) return new Date(Number(dotNet[1]));

  // A bare "yyyy-MM-dd" is a calendar date; JS would read it as UTC midnight (5:30 am in India).
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // .NET en-US DateTime.ToString(): "10/3/2026 5:46:26 PM" = month/day/year (the vendor's format;
  // confirmed against live data where 10/3/2026 was 3 October).
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i.exec(value.trim());
  if (us) {
    const [, month, day, year, hour = "0", minute = "0", second = "0", meridiem] = us;
    let h = Number(hour) % (meridiem ? 12 : 24);
    if (meridiem?.toUpperCase() === "PM") h += 12;
    const date = new Date(Number(year), Number(month) - 1, Number(day), h, Number(minute), Number(second));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

const hasTimeOfDay = (date: Date) => date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;

export function formatAmount(value: string): string {
  const amount = Number(value.replace(/,/g, ""));
  if (!value || Number.isNaN(amount)) return value;
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

/** "03 Oct 2026, 5:46 pm" — the time is left out when it's exactly midnight (a date-only value). */
function showDate(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(hasTimeOfDay(date) && { hour: "numeric", minute: "2-digit" }),
  });
}

export function formatDate(value: string): string {
  const date = parseDate(value);
  return date ? showDate(date) : value;
}

/**
 * The date in a Date & Time cell, or its raw text when it can't be parsed. Vendors may send a
 * date-only field plus a separate time — or a second field that already holds the full date and
 * time; use the most complete one.
 */
function dateCellValue(column: ColumnInfo, row: ReportRow): Date | string {
  const primary = row[column.key] ?? "";
  const extra = column.extraKey ? (row[column.extraKey] ?? "") : "";
  const primaryDate = parseDate(primary);
  if (!extra) return primaryDate ?? primary;

  const extraDate = parseDate(extra);
  if (extraDate) {
    // The second field is itself a full date: use whichever of the two carries a real time.
    if (primaryDate && hasTimeOfDay(primaryDate) && !hasTimeOfDay(extraDate)) return primaryDate;
    return extraDate;
  }
  if (primaryDate && hasTimeOfDay(primaryDate)) return primaryDate;

  // A time-only field ("17:46:26", "5:46 PM"): put it on the primary date.
  const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(extra.trim());
  if (primaryDate && time) {
    const [, hour, minute, second = "0", meridiem] = time;
    let h = Number(hour) % (meridiem ? 12 : 24);
    if (meridiem?.toUpperCase() === "PM") h += 12;
    const combined = new Date(primaryDate);
    combined.setHours(h, Number(minute), Number(second));
    return combined;
  }
  return [formatDate(primary), extra].filter(Boolean).join(", ");
}

/** Text for a Date & Time cell, shown once even when the vendor splits or repeats it. */
export function dateCellText(column: ColumnInfo, row: ReportRow): string {
  const value = dateCellValue(column, row);
  return typeof value === "string" ? value : showDate(value);
}

/** Sum of a numeric column across rows. */
export function sumColumn(rows: ReportRow[], key: string): number {
  return rows.reduce((total, row) => total + (Number((row[key] ?? "").replace(/,/g, "")) || 0), 0);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-06 13:35" (or "2026-10-06" at midnight): a form Excel reads as a real, sortable date. */
function csvDate(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return hasTimeOfDay(date) ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

/** A CSV cell written so Excel shows it as intended (the caller still applies CSV quoting). */
function csvCell(column: ColumnInfo, row: ReportRow): string {
  if (column.kind === "date") {
    const value = dateCellValue(column, row);
    return typeof value === "string" ? csvText(value) : csvDate(value);
  }
  const value = cellValue(column, row);
  // Amounts exactly as the vendor sent them, minus thousands separators: a plain number Excel can
  // sum, never rounded, so Excel totals match the dashboard's.
  if (column.kind === "amount" && isNumeric(value)) return value.replace(/,/g, "");
  return csvText(value);
}

function csvText(value: string): string {
  // Long digit-only IDs (UTR, reference numbers) or ones with a leading zero: Excel would turn
  // them into numbers, keeping 15 significant digits ("6.10261E+20") and dropping leading zeros.
  // The ="…" form makes Excel keep them as text.
  if (/^\d{12,}$/.test(value) || /^0\d+$/.test(value)) return `="${value}"`;
  // Names and remarks come from outside data; a value starting with = + - @ would run as a
  // formula in Excel (CSV injection), so a leading apostrophe makes it plain text.
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

/**
 * CSV text for the given rows, with human-readable headers, laid out for Excel: dates as
 * yyyy-MM-dd HH:mm, amounts as plain unrounded numbers, long IDs kept as text, formulas neutralised,
 * CRLF line endings. The caller adds the UTF-8 byte order mark when saving it as a file.
 */
export function toCsv(columns: ColumnInfo[], rows: ReportRow[]): string {
  const escape = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // A column with a second field (Account + IFSC) becomes two CSV columns.
  const header = columns.flatMap((c) => (c.subLabel ? [c.label, c.subLabel] : [c.label])).map(escape).join(",");
  const body = rows.map((row) =>
    columns
      .flatMap((c) => (c.subKey ? [csvCell(c, row), csvText(row[c.subKey] ?? "")] : [csvCell(c, row)]))
      .map(escape)
      .join(","),
  );
  return [header, ...body].join("\r\n");
}

/** One column of a fixed report layout, matched to whichever vendor field fits it. */
export type ColumnSlot = {
  id: string;
  label: string;
  kind: ColumnKind;
  /** Lower = matched earlier, so specific slots claim fields before broad ones. */
  priority: number;
  /** Patterns tried in order against the field name, lowercased with separators removed. */
  keys: RegExp[];
  /** Field names this slot must never take. */
  exclude?: RegExp;
  /** Also match a field whose values are all Cr/Dr markers, whatever its name. */
  matchEntryValues?: boolean;
  /** For dates: a separate time field to append, if the vendor splits date and time. */
  appendKeys?: RegExp[];
  /** Fixed colour/summary role for an amount column (e.g. "credit" → green, counted in Total credit). */
  tone?: AmountTone;
  /** Hide this column in the table on narrower screens, so the table never needs to scroll sideways. */
  hideBelow?: "lg" | "xl" | "2xl";
  /** A second field shown under this one (e.g. IFSC under Account), matched like `keys`. */
  sub?: { label: string; keys: RegExp[] };
  /** How text is set: see ColumnInfo["format"]. */
  format?: TextFormat;
};

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Columns in the order of `slots`, each mapped to the best-matching vendor field. Returns null
 * when fewer than `minMatches` slots match, so the caller can fall back to showing every field.
 */
export function layoutColumns(table: ReportTable, slots: ColumnSlot[], minMatches = 3): ColumnInfo[] | null {
  const valuesOf = (key: string) => table.rows.map((row) => row[key] ?? "").filter(Boolean);
  const used = new Set<string>();
  const available = () => table.columns.filter((key) => !used.has(key) && valuesOf(key).length > 0);

  const findField = (patterns: RegExp[], exclude?: RegExp) => {
    for (const pattern of patterns) {
      const hit = available().find((key) => pattern.test(normalizeKey(key)) && !exclude?.test(normalizeKey(key)));
      if (hit) return hit;
    }
    return undefined;
  };

  const assigned = new Map<string, { key: string; extraKey?: string; altKey?: string; subKey?: string }>();
  for (const slot of [...slots].sort((a, b) => a.priority - b.priority)) {
    let key = findField(slot.keys, slot.exclude);
    if (!key && slot.matchEntryValues) {
      key = available().find((k) => valuesOf(k).every((v) => ENTRY_TYPES.has(v.toLowerCase())));
    }
    if (!key) continue;
    used.add(key);
    const extraKey = slot.appendKeys ? findField(slot.appendKeys) : undefined;
    if (extraKey) used.add(extraKey);
    const subKey = slot.sub ? findField(slot.sub.keys) : undefined;
    if (subKey) used.add(subKey);

    // Separate credit/debit amount fields (e.g. CrAmount + DrAmount) become one Amount column.
    let altKey: string | undefined;
    if (slot.kind === "amount" && /^(cr|credit)/.test(normalizeKey(key))) {
      altKey = findField([/^(dr|debit)(amount|amt)?$/, /^(dr|debit).*(amount|amt)/]);
      if (altKey) used.add(altKey);
    }
    assigned.set(slot.id, { key, extraKey, altKey, subKey });
  }

  if (assigned.size < minMatches) return null;

  const entryKey = slots.find((s) => s.kind === "entryType" && assigned.has(s.id));
  const toneKey = entryKey ? assigned.get(entryKey.id)?.key : undefined;

  return slots.flatMap((slot) => {
    const match = assigned.get(slot.id);
    if (!match) return [];
    const isMovement = slot.kind === "amount" && !/balance/i.test(slot.label);
    return [
      {
        key: match.key,
        label: slot.label,
        kind: slot.kind,
        tone: slot.tone ?? ("neutral" as const),
        ...(isMovement && toneKey && { toneKey }),
        ...(match.extraKey && { extraKey: match.extraKey }),
        ...(match.altKey && { altKey: match.altKey }),
        ...(slot.hideBelow && { hideBelow: slot.hideBelow }),
        ...(match.subKey && slot.sub && { subKey: match.subKey, subLabel: slot.sub.label }),
        ...(slot.format && { format: slot.format }),
      },
    ];
  });
}
