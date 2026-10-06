"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { getDashboardSection, type DashboardSectionId } from "@/lib/data/dashboardNav";
import { clearDemoSession } from "@/lib/auth/demoSession";
import { datePresets, rangeForDays, toIsoDate, validateRange } from "@/lib/reports/dates";
import { DatePicker } from "@/components/dashboard/DatePicker";
import {
  amountTone,
  cellValue,
  dateCellText,
  describeColumns,
  formatAmount,
  formatDate,
  layoutColumns,
  sumColumn,
  toCsv,
  type ColumnInfo,
  type ReportRow,
  type ReportTable,
} from "@/lib/reports/table";
import { reportLayouts } from "@/lib/reports/layouts";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 50;

type Range = { from: string; to: string };
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; sessionExpired: boolean }
  | { status: "ready"; table: ReportTable };

/** Fetches a report from our API. Credentials never leave the server: they're in the session cookie. */
async function loadReport(section: DashboardSectionId, range: Range): Promise<LoadState> {
  try {
    const query = new URLSearchParams({ fromDate: range.from, toDate: range.to });
    const response = await fetch(`/api/dashboard/${section}?${query}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.table) {
      return {
        status: "error",
        message: data?.error || "We couldn't load this report. Please try again.",
        sessionExpired: response.status === 401,
      };
    }
    return { status: "ready", table: data.table };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again.", sessionExpired: false };
  }
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-status-success-bg text-status-success",
  successful: "bg-status-success-bg text-status-success",
  failed: "bg-status-failed-bg text-status-failed",
  failure: "bg-status-failed-bg text-status-failed",
  pending: "bg-status-pending-bg text-status-pending",
  processing: "bg-status-processing-bg text-status-processing",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
  refunded: "bg-status-cancelled-bg text-status-cancelled",
  reversed: "bg-status-cancelled-bg text-status-cancelled",
};

/** Hides a column in the table below its breakpoint (it still appears in mobile cards, search and CSV). */
const HIDE_BELOW: Record<NonNullable<ColumnInfo["hideBelow"]>, string> = {
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

/** Long single tokens such as reference numbers or IDs ("061026131023036730741"). */
const isCode = (value: string) => /^[A-Za-z0-9_-]{12,}$/.test(value) && /\d/.test(value);

/**
 * Renders one value by column kind. `variant="table"` keeps rows narrow so the table never needs
 * to scroll sideways: dates stack (date over time), text wraps, long codes use small monospace.
 */
function Cell({ column, row, variant = "card" }: { column: ColumnInfo; row: ReportRow; variant?: "table" | "card" }) {
  const value = cellValue(column, row);
  if (!value) return <span className="text-text-secondary/40">—</span>;

  switch (column.kind) {
    case "amount": {
      const amount = Number(value.replace(/,/g, ""));
      const tone = amountTone(column, row);
      const toneClass =
        amount === 0
          ? "text-text-secondary"
          : tone === "credit"
            ? "text-status-success"
            : tone === "debit"
              ? "text-status-failed"
              : "text-text-primary";
      return <span className={cn("font-medium tabular-nums", toneClass)}>{formatAmount(value)}</span>;
    }
    case "date": {
      const text = dateCellText(column, row);
      const [day, time] = text.split(", ");
      if (variant === "table" && time) {
        return (
          <span className="block whitespace-nowrap tabular-nums">
            <span className="block text-text-primary">{day}</span>
            <span className="block text-xs text-text-secondary">{time}</span>
          </span>
        );
      }
      return <span className="tabular-nums text-text-secondary">{text}</span>;
    }
    case "entryType": {
      const isCredit = /^c/i.test(value);
      return (
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold uppercase",
            isCredit ? "bg-status-success-bg text-status-success" : "bg-status-failed-bg text-status-failed",
          )}
        >
          {value.length <= 2 ? value.toUpperCase() : value}
        </span>
      );
    }
    case "status":
      return (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase",
            STATUS_STYLES[value.toLowerCase()] ?? "bg-brand-light text-text-secondary",
          )}
        >
          {value}
        </span>
      );
    default:
      if (variant === "table" && isCode(value)) {
        return <span className="font-mono text-xs text-text-secondary wrap-anywhere">{value}</span>;
      }
      return (
        <span className={cn("wrap-anywhere", variant === "table" && "line-clamp-2")} title={variant === "table" ? value : undefined}>
          {value}
        </span>
      );
  }
}

type CardLayout = {
  title?: ColumnInfo;
  date?: ColumnInfo;
  amount?: ColumnInfo;
  /** Shown beside the amount: Cr/Dr and/or status badges. */
  badges: ColumnInfo[];
  /** Label/value rows: label left, value right. */
  details: ColumnInfo[];
  /** Long IDs (references, UTRs), shown small in the card footer. */
  codes: ColumnInfo[];
};

/** Picks where each column goes on a mobile card. */
function planCard(columns: ColumnInfo[], table: ReportTable | null): CardLayout {
  const rows = table?.rows ?? [];
  const isBalance = (c: ColumnInfo) => /balance|\bbal\b/i.test(c.label);
  const amount =
    columns.find((c) => c.kind === "amount" && (c.toneKey || c.altKey)) ??
    columns.find((c) => c.kind === "amount" && !isBalance(c));
  const date = columns.find((c) => c.kind === "date");
  const badges = columns.filter((c) => c.kind === "entryType" || c.kind === "status");

  const textColumns = columns.filter((c) => c.kind === "text");
  const avgLength = (c: ColumnInfo) =>
    rows.length ? rows.reduce((sum, row) => sum + (row[c.key]?.length ?? 0), 0) / rows.length : 0;
  const title =
    textColumns.find((c) => /narration|description|remark|particular|customer/i.test(c.label)) ??
    [...textColumns].sort((a, b) => avgLength(b) - avgLength(a))[0];

  const isCodeColumn = (c: ColumnInfo) =>
    c.kind === "text" && rows.some((row) => row[c.key]) && rows.every((row) => !row[c.key] || isCode(row[c.key]));

  const placed = new Set([title, date, amount, ...badges].filter(Boolean));
  const remaining = columns.filter((c) => !placed.has(c));
  return {
    title,
    date,
    amount,
    badges,
    details: remaining.filter((c) => !isCodeColumn(c)),
    codes: remaining.filter(isCodeColumn),
  };
}

/** "Reference" -> "Ref" for the compact card footer. */
const footerLabel = (label: string) => (/^reference$/i.test(label) ? "Ref" : label);

/** One report row as a card, for small screens. */
function RowCard({ row, layout }: { row: ReportRow; layout: CardLayout }) {
  const { title, date, amount, badges, details, codes } = layout;
  const presentCodes = codes.filter((c) => row[c.key]);

  return (
    <li className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 px-3.5 pb-3 pt-3.5">
        <div className="min-w-0">
          {title && (
            <p className="text-sm font-semibold leading-snug text-text-primary">
              <Cell column={title} row={row} />
            </p>
          )}
          {date && (
            <p className="mt-0.5 text-xs">
              <Cell column={date} row={row} />
            </p>
          )}
        </div>
        {(amount || badges.length > 0) && (
          <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
            {amount && (
              <span className="text-base *:font-semibold">
                <Cell column={amount} row={row} />
              </span>
            )}
            {badges.length > 0 && (
              <span className="flex gap-1">
                {badges.map((column) => (
                  <Cell key={column.key} column={column} row={row} />
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      {details.length > 0 && (
        <dl className="space-y-1.5 border-t border-brand-border/70 px-3.5 py-2.5">
          {details.map((column) => (
            <div key={column.key} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-xs text-text-secondary">{column.label}</dt>
              <dd
                className={cn(
                  "min-w-0 text-right text-sm text-text-primary",
                  /balance/i.test(column.label) && "*:font-bold",
                )}
              >
                <Cell column={column} row={row} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {presentCodes.length > 0 && (
        <div className="space-y-0.5 border-t border-brand-border/70 bg-brand-light/40 px-3.5 py-2">
          {presentCodes.map((column) => (
            <p key={column.key} className="flex items-baseline gap-2 text-[11px] text-text-secondary">
              <span className="shrink-0 font-semibold uppercase tracking-wide">{footerLabel(column.label)}</span>
              <span className="min-w-0 truncate font-mono" title={row[column.key]}>
                {row[column.key]}
              </span>
            </p>
          ))}
        </div>
      )}
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "credit" | "debit" }) {
  return (
    <div className="rounded-xl border border-brand-border bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-bold tabular-nums",
          tone === "credit" ? "text-status-success" : tone === "debit" ? "text-status-failed" : "text-text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Date-range report screen used by dashboard sections backed by a vendor report endpoint. */
export function ReportView({ section }: { section: DashboardSectionId }) {
  const router = useRouter();
  const { label } = getDashboardSection(section);
  const today = toIsoDate(new Date());

  const [range, setRange] = useState<Range>(() => rangeForDays(1));
  const [draft, setDraft] = useState<Range>(range);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadReport(section, range).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [section, range]);

  function apply(next: Range) {
    const error = validateRange(next.from, next.to);
    setRangeError(error);
    if (error) return;
    setDraft(next);
    setRange({ ...next }); // new object, so applying the same range reloads
    setState({ status: "loading" });
    setPage(0);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    apply(draft);
  }

  const table = state.status === "ready" ? state.table : null;
  const layout = reportLayouts[section];
  const columns = useMemo(
    () => (table ? ((layout && layoutColumns(table, layout)) ?? describeColumns(table)) : []),
    [table, layout],
  );

  const filteredRows = useMemo(() => {
    if (!table) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return table.rows;
    return table.rows.filter((row) => columns.some((c) => (row[c.key] ?? "").toLowerCase().includes(needle)));
  }, [table, columns, query]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const cardLayout = useMemo(() => planCard(columns, table), [columns, table]);

  // Totals: one amount column split by its Cr/Dr field, or separate credit/debit columns.
  // When there's a Status column, only successful entries count (failed/pending moved no money).
  const totals = useMemo(() => {
    if (!table) return null;
    const statusColumn = columns.find((c) => c.kind === "status");
    const counted = statusColumn
      ? table.rows.filter((row) => /^success/i.test(row[statusColumn.key] ?? ""))
      : table.rows;
    const movement = columns.find((c) => c.toneKey || c.altKey);
    if (movement) {
      const sumWhere = (tone: "credit" | "debit") =>
        counted
          .filter((row) => amountTone(movement, row) === tone)
          .reduce((total, row) => total + (Number(cellValue(movement, row).replace(/,/g, "")) || 0), 0);
      return { credit: sumWhere("credit"), debit: sumWhere("debit") };
    }
    const creditColumn = columns.find((c) => c.tone === "credit");
    const debitColumn = columns.find((c) => c.tone === "debit");
    return {
      credit: creditColumn ? sumColumn(counted, creditColumn.key) : null,
      debit: debitColumn ? sumColumn(counted, debitColumn.key) : null,
    };
  }, [table, columns]);

  const activePreset = datePresets.find((p) => {
    const r = rangeForDays(p.days);
    return r.from === range.from && r.to === range.to;
  })?.id;

  function exportCsv() {
    const blob = new Blob([toCsv(columns, filteredRows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${section}_${range.from}_${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function relogin() {
    clearDemoSession();
    router.push("/login");
  }

  const inputClasses =
    "h-9 rounded-lg border border-brand-border bg-white px-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15";

  return (
    // Fills the dashboard content area; on tablet and up only the table rows scroll.
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
      {/* Title + date range */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-brand-primary/25 md:h-10 md:w-10">
            <SectionIcon id={section} className="h-5 w-5" />
          </span>
          <h1 className="text-lg font-bold tracking-tight text-text-primary sm:text-2xl">{label}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Quick date ranges" className="flex h-9 items-center rounded-lg border border-brand-border bg-white p-0.5">
            {datePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={activePreset === preset.id}
                onClick={() => apply(rangeForDays(preset.days))}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  activePreset === preset.id ? "bg-brand-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex w-full items-center gap-1.5 md:w-auto">
            <DatePicker
              label="From"
              value={draft.from}
              max={draft.to}
              onChange={(from) => setDraft((d) => ({ ...d, from }))}
              className="min-w-0 flex-1 md:w-52 md:flex-none"
            />
            <span className="text-sm text-text-secondary" aria-hidden="true">
              →
            </span>
            <DatePicker
              label="To"
              value={draft.to}
              min={draft.from}
              max={today}
              align="right"
              onChange={(to) => setDraft((d) => ({ ...d, to }))}
              className="min-w-0 flex-1 md:w-52 md:flex-none"
            />
            <button
              type="submit"
              disabled={state.status === "loading"}
              className="h-9 shrink-0 rounded-lg bg-brand-gradient px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60 md:px-4"
            >
              Apply
            </button>
          </form>
        </div>
      </div>
      {rangeError && (
        <p role="alert" className="text-right text-xs font-medium text-red-600">
          {rangeError}
        </p>
      )}

      {/* Summary — phones: one slim bar */}
      {table && (
        <dl className="flex divide-x divide-brand-border rounded-xl border border-brand-border bg-white md:hidden">
          <div className="min-w-0 flex-1 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Entries</dt>
            <dd className="text-sm font-bold tabular-nums text-text-primary">{table.rows.length.toLocaleString("en-IN")}</dd>
          </div>
          {totals?.credit != null && (
            <div className="min-w-0 flex-1 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Credit</dt>
              <dd className="truncate text-sm font-bold tabular-nums text-status-success">{formatAmount(String(totals.credit))}</dd>
            </div>
          )}
          {totals?.debit != null && (
            <div className="min-w-0 flex-1 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Debit</dt>
              <dd className="truncate text-sm font-bold tabular-nums text-status-failed">{formatAmount(String(totals.debit))}</dd>
            </div>
          )}
        </dl>
      )}

      {/* Summary — tablet and up: stat cards */}
      {table && (
        <div className="hidden grid-cols-4 gap-3 md:grid">
          <Stat label="Entries" value={table.rows.length.toLocaleString("en-IN")} />
          {totals?.credit != null && <Stat label="Total credit" value={formatAmount(String(totals.credit))} tone="credit" />}
          {totals?.debit != null && <Stat label="Total debit" value={formatAmount(String(totals.debit))} tone="debit" />}
          <Stat
            label="Period"
            value={range.from === range.to ? formatDate(range.from) : `${formatDate(range.from)} – ${formatDate(range.to)}`}
          />
        </div>
      )}

      {/* Table */}
      {/* Phones: no box around the list, so cards use the full width */}
      <div className="md:flex md:min-h-0 md:flex-1 md:flex-col md:overflow-hidden md:rounded-2xl md:border md:border-brand-border md:bg-white md:shadow-sm">
        <div className="flex shrink-0 items-center gap-2 md:justify-between md:border-b md:border-brand-border md:px-3 md:py-2.5">
          <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <label htmlFor={`${section}-search`} className="sr-only">
              Search entries
            </label>
            <input
              id={`${section}-search`}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search"
              disabled={!table || table.rows.length === 0}
              className={cn(inputClasses, "w-full pl-9 disabled:bg-brand-light/50")}
            />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {table && table.rows.length > 0 && (
              <span className="hidden text-xs text-text-secondary tabular-nums md:inline">
                {filteredRows.length === table.rows.length
                  ? `${table.rows.length.toLocaleString("en-IN")} entries`
                  : `${filteredRows.length.toLocaleString("en-IN")} of ${table.rows.length.toLocaleString("en-IN")}`}
              </span>
            )}
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
              title="Export CSV"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-border bg-white px-2.5 text-sm font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-40 disabled:hover:border-brand-border disabled:hover:text-text-primary md:px-3"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
              </svg>
              <span className="sr-only md:not-sr-only">Export</span>
            </button>
          </div>
        </div>

        {state.status === "loading" && (
          <div className="divide-y divide-brand-border mt-3 rounded-xl border border-brand-border bg-white md:mt-0 md:rounded-none md:border-0" aria-busy="true" aria-label={`Loading ${label}`}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3.5">
                {[28, 18, 34, 14, 16].map((w, j) => (
                  <div key={j} className="h-3 animate-pulse rounded bg-brand-light" style={{ width: `${w}%` }} />
                ))}
              </div>
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center mt-3 rounded-xl border border-brand-border bg-white md:mt-0 md:rounded-none md:border-0">
            <p className="text-sm font-medium text-red-600">{state.message}</p>
            {state.sessionExpired ? (
              <button type="button" onClick={relogin} className="text-sm font-semibold text-brand-primary hover:text-brand-dark">
                Log in again
              </button>
            ) : (
              <button type="button" onClick={() => apply(range)} className="text-sm font-semibold text-brand-primary hover:text-brand-dark">
                Try again
              </button>
            )}
          </div>
        )}

        {table && filteredRows.length === 0 && (
          <p className="px-6 py-14 text-center text-sm text-text-secondary mt-3 rounded-xl border border-brand-border bg-white md:mt-0 md:rounded-none md:border-0">
            {table.rows.length === 0 ? "No entries for this period." : "No entries match your search."}
          </p>
        )}

        {/* Phones: one card per entry */}
        {table && filteredRows.length > 0 && (
          <ul className="space-y-2.5 pt-3 md:hidden" aria-label={`${label} entries`}>
            {pageRows.map((row, i) => (
              <RowCard key={currentPage * PAGE_SIZE + i} row={row} layout={cardLayout} />
            ))}
          </ul>
        )}

        {/* Tablet and up: table */}
        {table && filteredRows.length > 0 && (
          <div className="scrollbar-light hidden min-h-40 overflow-auto md:block md:flex-1">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                {label}, {range.from} to {range.to}
              </caption>
              <thead className="sticky top-0 z-10 bg-brand-light/95 backdrop-blur">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary",
                        column.kind === "amount" && "text-right",
                        column.hideBelow && HIDE_BELOW[column.hideBelow],
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/70">
                {pageRows.map((row, i) => (
                  <tr key={currentPage * PAGE_SIZE + i} className="transition-colors hover:bg-brand-light/40">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "px-3 py-2.5 align-middle text-text-primary",
                          column.kind === "amount" && "whitespace-nowrap text-right",
                          (column.kind === "status" || column.kind === "entryType") && "whitespace-nowrap",
                          column.hideBelow && HIDE_BELOW[column.hideBelow],
                        )}
                      >
                        <Cell column={column} row={row} variant="table" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {table && pageCount > 1 && (
          <div className="flex shrink-0 items-center justify-between px-4 py-2.5 text-xs text-text-secondary mt-3 rounded-xl border border-brand-border bg-white md:mt-0 md:rounded-none md:border-0 md:border-t">
            <span className="tabular-nums">
              Page {currentPage + 1} of {pageCount}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="rounded-md border border-brand-border px-3 py-1.5 font-medium text-text-primary hover:border-brand-primary disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                className="rounded-md border border-brand-border px-3 py-1.5 font-medium text-text-primary hover:border-brand-primary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
