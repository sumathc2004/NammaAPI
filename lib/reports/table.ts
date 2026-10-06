// Report data as returned by /api/dashboard/report, plus formatting rules for displaying it.
// Columns come from the vendor's field names, so formatting is inferred from names and values.

export type ReportRow = Record<string, string>;
export type ReportTable = { columns: string[]; rows: ReportRow[] };

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
  hideBelow?: "lg" | "xl";
};

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
export function formatDate(value: string): string {
  const date = parseDate(value);
  if (!date) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(hasTimeOfDay(date) && { hour: "numeric", minute: "2-digit" }),
  });
}

/**
 * Text for a Date & Time cell. Vendors may send a date-only field plus a separate time — or a
 * second field that already holds the full date and time; show the most complete one once.
 */
export function dateCellText(column: ColumnInfo, row: ReportRow): string {
  const primary = row[column.key] ?? "";
  const extra = column.extraKey ? (row[column.extraKey] ?? "") : "";
  if (!extra) return formatDate(primary);

  const primaryDate = parseDate(primary);
  const extraDate = parseDate(extra);
  if (extraDate) {
    // The second field is itself a full date: show whichever of the two carries a real time.
    const useExtra = hasTimeOfDay(extraDate) || !primaryDate || !hasTimeOfDay(primaryDate);
    return formatDate(useExtra ? extra : primary);
  }
  if (primaryDate && hasTimeOfDay(primaryDate)) return formatDate(primary);

  // A time-only field ("17:46:26", "5:46 PM"): put it on the primary date and format both together.
  const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(extra.trim());
  if (primaryDate && time) {
    const [, hour, minute, second = "0", meridiem] = time;
    let h = Number(hour) % (meridiem ? 12 : 24);
    if (meridiem?.toUpperCase() === "PM") h += 12;
    const combined = new Date(primaryDate);
    combined.setHours(h, Number(minute), Number(second));
    return combined.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  }
  return [formatDate(primary), extra].filter(Boolean).join(", ");
}

/** Sum of a numeric column across rows. */
export function sumColumn(rows: ReportRow[], key: string): number {
  return rows.reduce((total, row) => total + (Number((row[key] ?? "").replace(/,/g, "")) || 0), 0);
}

/** CSV text for the given rows, with human-readable headers. */
export function toCsv(columns: ColumnInfo[], rows: ReportRow[]): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = columns.map((c) => escape(c.label)).join(",");
  const cell = (row: ReportRow, c: ColumnInfo) => (c.kind === "date" ? dateCellText(c, row) : cellValue(c, row));
  const body = rows.map((row) => columns.map((c) => escape(cell(row, c))).join(","));
  return [header, ...body].join("\n");
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
  hideBelow?: "lg" | "xl";
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

  const assigned = new Map<string, { key: string; extraKey?: string; altKey?: string }>();
  for (const slot of [...slots].sort((a, b) => a.priority - b.priority)) {
    let key = findField(slot.keys, slot.exclude);
    if (!key && slot.matchEntryValues) {
      key = available().find((k) => valuesOf(k).every((v) => ENTRY_TYPES.has(v.toLowerCase())));
    }
    if (!key) continue;
    used.add(key);
    const extraKey = slot.appendKeys ? findField(slot.appendKeys) : undefined;
    if (extraKey) used.add(extraKey);

    // Separate credit/debit amount fields (e.g. CrAmount + DrAmount) become one Amount column.
    let altKey: string | undefined;
    if (slot.kind === "amount" && /^(cr|credit)/.test(normalizeKey(key))) {
      altKey = findField([/^(dr|debit)(amount|amt)?$/, /^(dr|debit).*(amount|amt)/]);
      if (altKey) used.add(altKey);
    }
    assigned.set(slot.id, { key, extraKey, altKey });
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
      },
    ];
  });
}
