"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { getDashboardSection, type DashboardSectionId } from "@/lib/data/dashboardNav";
import { clearDemoSession } from "@/lib/auth/demoSession";
import { reportStartDate, toIsoDate, validateRange } from "@/lib/reports/dates";
import { DatePicker } from "@/components/dashboard/DatePicker";
import {
  amountTone,
  applyTransferActionPatch,
  cellValue,
  columnTitle,
  dateCellText,
  describeColumns,
  formatAmount,
  isQueuedTransfer,
  isRefreshableTransfer,
  isRefundableTransfer,
  layoutColumns,
  sumColumn,
  toCsv,
  transferRowId,
  type ColumnInfo,
  type ReportRow,
  type ReportTable,
  type TransferAction,
} from "@/lib/reports/table";
import { reportLayouts, reportViews } from "@/lib/reports/layouts";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 50;

/** How often an open report quietly re-loads itself. */
const AUTO_REFRESH_MS = 30_000;

/** Per-row Refresh button in the UTR column (Transfer). Switched off for now; flip to true to bring it back. */
const ROW_REFRESH_ENABLED = false;

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
  "in queue": "bg-status-pending-bg text-status-pending",
  queued: "bg-status-pending-bg text-status-pending",
  dequeued: "bg-status-cancelled-bg text-status-cancelled",
  refundable: "bg-status-processing-bg text-status-processing",
  processing: "bg-status-processing-bg text-status-processing",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
  refunded: "bg-status-cancelled-bg text-status-cancelled",
  reversed: "bg-status-cancelled-bg text-status-cancelled",
};

/** Hides a column in the table below its breakpoint (it still appears in mobile cards, search and CSV). */
const HIDE_BELOW: Record<NonNullable<ColumnInfo["hideBelow"]>, string> = {
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
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
    default: {
      const sub = column.subKey ? row[column.subKey] : "";
      const text = <TextValue value={value} format={column.format} variant={variant} />;
      if (!sub) return text;
      // Second field underneath, e.g. the IFSC under the account number.
      return (
        <span className="block">
          <span className="block">{text}</span>
          <span className="block text-text-secondary">
            <TextValue value={sub} format={column.format} variant={variant} muted />
          </span>
        </span>
      );
    }
  }
}

function TextValue({
  value,
  format,
  variant,
  muted = false,
}: {
  value: string;
  format: ColumnInfo["format"];
  variant: "table" | "card";
  muted?: boolean;
}) {
  // IDs and numbers: monospace, and in the table never broken mid-number.
  if (format === "code") {
    return (
      <span
        className={cn(
          "font-mono text-xs tabular-nums",
          variant === "table" ? "whitespace-nowrap" : "wrap-anywhere",
          muted ? "text-text-secondary" : "text-text-primary",
        )}
      >
        {value}
      </span>
    );
  }
  if (variant === "table" && isCode(value)) {
    return <span className="font-mono text-xs text-text-secondary wrap-anywhere">{value}</span>;
  }
  return (
    <span
      // "words": names and remarks wrap between words only, never mid-word.
      className={cn(format === "words" ? "wrap-break-word" : "wrap-anywhere", variant === "table" && "line-clamp-2")}
      title={variant === "table" ? value : undefined}
    >
      {value}
    </span>
  );
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
    textColumns.find((c) => /narration|description|remark|particular|customer|beneficiary/i.test(c.label)) ??
    [...textColumns].sort((a, b) => avgLength(b) - avgLength(a))[0];

  // Columns with a second field (Account + IFSC) stay in the details, where both lines fit.
  const isCodeColumn = (c: ColumnInfo) =>
    c.kind === "text" &&
    !c.subKey &&
    rows.some((row) => row[c.key]) &&
    rows.every((row) => !row[c.key] || isCode(row[c.key]));

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
function RowCard({
  row,
  layout,
  section,
  refreshingTxnId,
  onRefresh,
  pendingAction,
  onAction,
}: {
  row: ReportRow;
  layout: CardLayout;
  section: DashboardSectionId;
  refreshingTxnId: string | null;
  onRefresh: (uniqueTxnId: string) => void;
  pendingAction: { uniqueTxnId: string; action: TransferAction } | null;
  onAction: (action: TransferAction, uniqueTxnId: string, id: string) => void;
}) {
  const { title, date, amount, badges, details, codes } = layout;
  const refreshable = ROW_REFRESH_ENABLED && section === "transfer" && isRefreshableTransfer(row);
  const presentCodes = codes.filter((c) => row[c.key] || (refreshable && c.label === "UTR"));
  const refundId = section === "transfer" && isRefundableTransfer(row) ? transferRowId(row) : undefined;
  // Refundable takes over Dequeue when both apply — Enqueue/Refund are the relevant actions then.
  const queueId = section === "transfer" && !refundId && isQueuedTransfer(row) ? transferRowId(row) : undefined;
  const isPending = (action: TransferAction) => pendingAction?.uniqueTxnId === row.UniqueTxnId && pendingAction.action === action;

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
            {queueId && (
              <TransferActionButton action="dequeue" pending={isPending("dequeue")} onClick={() => onAction("dequeue", row.UniqueTxnId, queueId)} />
            )}
            {refundId && (
              <TransferActionButton action="enqueue" pending={isPending("enqueue")} onClick={() => onAction("enqueue", row.UniqueTxnId, refundId)} />
            )}
            {refundId && (
              <TransferActionButton action="refund" pending={isPending("refund")} onClick={() => onAction("refund", row.UniqueTxnId, refundId)} />
            )}
          </div>
        )}
      </div>

      {details.length > 0 && (
        <dl className="space-y-1.5 border-t border-brand-border/70 px-3.5 py-2.5">
          {details.map((column) => (
            <div key={column.key} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-xs text-text-secondary">{columnTitle(column)}</dt>
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
          {presentCodes.map((column) =>
            refreshable && column.label === "UTR" ? (
              <div key={column.key} className="flex items-baseline justify-between gap-2 py-0.5">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide">{footerLabel(column.label)}</span>
                <RefreshUtrButton refreshing={refreshingTxnId === row.UniqueTxnId} onRefresh={() => onRefresh(row.UniqueTxnId)} />
              </div>
            ) : (
              <p key={column.key} className="flex items-baseline gap-2 text-[11px] text-text-secondary">
                <span className="shrink-0 font-semibold uppercase tracking-wide">{footerLabel(column.label)}</span>
                <span className="min-w-0 truncate font-mono" title={row[column.key]}>
                  {row[column.key]}
                </span>
              </p>
            ),
          )}
        </div>
      )}
    </li>
  );
}

/** Credit/debit totals for the selected dates, as one compact strip in the toolbar. */
function Totals({ credit, debit, className }: { credit: number | null; debit: number | null; className?: string }) {
  return (
    <dl
      title="Totals for the selected dates"
      className={cn(
        "flex h-9 min-w-0 items-center divide-x divide-brand-border rounded-lg border border-brand-border bg-white text-xs",
        className,
      )}
    >
      {credit != null && (
        <div className="flex min-w-0 items-baseline gap-1.5 px-2.5">
          <dt className="text-text-secondary">Credit</dt>
          <dd className="truncate font-semibold tabular-nums text-status-success">{formatAmount(String(credit))}</dd>
        </div>
      )}
      {debit != null && (
        <div className="flex min-w-0 items-baseline gap-1.5 px-2.5">
          <dt className="text-text-secondary">Debit</dt>
          <dd className="truncate font-semibold tabular-nums text-status-failed">{formatAmount(String(debit))}</dd>
        </div>
      )}
    </dl>
  );
}

function PageButton({ direction, disabled, onClick }: { direction: "previous" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "previous" ? "Previous page" : "Next page"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-white text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:pointer-events-none disabled:opacity-35"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={direction === "previous" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}

/** "1–50 of 473" with previous/next buttons; just "12 entries" when everything fits on one page. */
function Pager({
  page,
  total,
  onPage,
  className,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (total === 0) return null;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const first = page * PAGE_SIZE + 1;
  const last = Math.min(total, (page + 1) * PAGE_SIZE);
  const n = (value: number) => value.toLocaleString("en-IN");

  return (
    <nav aria-label="Pages" className={cn("flex items-center gap-2", className)}>
      <span className="whitespace-nowrap text-xs tabular-nums text-text-secondary" aria-live="polite">
        {pageCount > 1 ? (
          <>
            <span className="font-semibold text-text-primary">
              {n(first)}–{n(last)}
            </span>{" "}
            of {n(total)}
          </>
        ) : (
          `${n(total)} ${total === 1 ? "entry" : "entries"}`
        )}
      </span>
      {pageCount > 1 && (
        <span className="flex gap-1">
          <PageButton direction="previous" disabled={page === 0} onClick={() => onPage(page - 1)} />
          <PageButton direction="next" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} />
        </span>
      )}
    </nav>
  );
}

function RefreshUtrButton({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label="Refresh UTR status"
      title="Refresh UTR status"
      className="inline-flex items-center gap-1.5 rounded-md border border-brand-border px-2 py-1 text-xs font-medium text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-light disabled:opacity-50"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("shrink-0", refreshing && "animate-spin")}
        aria-hidden="true"
      >
        <path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5" />
        <path d="M18 3v5h-5M6 21v-5h5" />
      </svg>
      Refresh
    </button>
  );
}

const TRANSFER_ACTION_LABELS: Record<TransferAction, { label: string; ariaLabel: string }> = {
  dequeue: { label: "Dequeue", ariaLabel: "Remove from queue" },
  enqueue: { label: "Enqueue", ariaLabel: "Add to queue" },
  refund: { label: "Refund", ariaLabel: "Process refund" },
};

function TransferActionButton({
  action,
  pending,
  onClick,
}: {
  action: TransferAction;
  pending: boolean;
  onClick: () => void;
}) {
  const { label, ariaLabel } = TRANSFER_ACTION_LABELS[action];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-md border border-brand-border px-2 py-1 text-xs font-medium text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-light disabled:opacity-50"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("shrink-0", pending && "animate-spin")}
        aria-hidden="true"
      >
        {pending ? (
          <path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5M18 3v5h-5M6 21v-5h5" />
        ) : action === "dequeue" ? (
          <>
            <path d="M5 12h11" />
            <path d="M12 7l5 5-5 5" />
            <path d="M19 5v14" />
          </>
        ) : action === "enqueue" ? (
          <>
            <path d="M19 12H8" />
            <path d="M12 7l-5 5 5 5" />
            <path d="M5 5v14" />
          </>
        ) : (
          <>
            <path d="M3 10a7 7 0 0 1 12-5l2 2" />
            <path d="M17 3v4h-4" />
            <path d="M21 14a7 7 0 0 1-12 5l-2-2" />
            <path d="M7 21v-4h4" />
          </>
        )}
      </svg>
      {label}
    </button>
  );
}

/** Date-range report screen used by dashboard sections backed by a vendor report endpoint. */
/**
 * `compact`: for a half-width panel (admin page) — small title, date row stacked under it, and the
 * view fills its parent's height. `columnLabels` keeps only those columns (by label), always shown.
 */
export function ReportView({
  section,
  compact = false,
  columnLabels,
}: {
  section: DashboardSectionId;
  compact?: boolean;
  columnLabels?: readonly string[];
}) {
  const router = useRouter();
  const { label } = getDashboardSection(section);
  const today = toIsoDate(new Date());

  const [range, setRange] = useState<Range>(() => ({ from: today, to: today }));
  const [draft, setDraft] = useState<Range>(range);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const views = reportViews[section];
  const [viewId, setViewId] = useState(views?.[0]?.id);
  const activeView = views?.find((v) => v.id === viewId);

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
    const error = validateRange(next.from, next.to, section);
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

  // Transfer only: a row showing Success with no UTR yet can be re-checked on its own, without
  // reloading the whole table. There's no single-transaction vendor endpoint, so this re-runs the
  // report for the same range and patches in just that one row — its position in the table never
  // changes, since only that row's data is swapped in, not the row order.
  const [refreshingTxnId, setRefreshingTxnId] = useState<string | null>(null);
  const [refreshResult, setRefreshResult] = useState<ReportRow | "not-found" | null>(null);
  async function refreshRow(uniqueTxnId: string) {
    if (refreshingTxnId) return;
    setRefreshingTxnId(uniqueTxnId);
    try {
      const next = await loadReport(section, range);
      if (next.status === "ready") {
        const updated = next.table.rows.find((r) => r.UniqueTxnId === uniqueTxnId);
        if (updated) {
          setState((prev) =>
            prev.status === "ready"
              ? { ...prev, table: { ...prev.table, rows: prev.table.rows.map((r) => (r.UniqueTxnId === uniqueTxnId ? updated : r)) } }
              : prev,
          );
          setRefreshResult(updated);
        } else {
          setRefreshResult("not-found");
        }
      } else {
        setRefreshResult("not-found");
      }
    } finally {
      setRefreshingTxnId(null);
    }
  }

  // Transfer only: Dequeue/Enqueue/Refund — vendor row actions. No single-row data comes back
  // (just a status/message), so none of these touch the table — only confirm it worked. A row
  // can show more than one action at once, so the pending/result state tracks which one.
  const [pendingAction, setPendingAction] = useState<{ uniqueTxnId: string; action: TransferAction } | null>(null);
  const [actionResult, setActionResult] = useState<
    | { action: TransferAction; status: "pending"; id: string }
    | { action: TransferAction; status: "ok"; message: string; id: string; refreshAt?: number }
    | { action: TransferAction; status: "error"; error: string; id: string }
    | null
  >(null);
  // After a Dequeue the vendor needs a moment to move the row to Refundable, so re-load the report
  // 10s later — quietly (no loading state), keeping the page, tab and scroll position.
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rangeRef = useRef(range);
  useEffect(() => {
    rangeRef.current = range;
  }, [range]);
  useEffect(() => () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
  }, []);
  function scheduleQuietReload() {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    const scheduledFor = rangeRef.current;
    reloadTimer.current = setTimeout(async () => {
      const next = await loadReport(section, scheduledFor);
      if (next.status === "ready" && rangeRef.current === scheduledFor) setState(next);
      // The popup stays up (and locked) until the reload has finished.
      setActionResult((r) => (r?.status === "ok" && r.refreshAt ? null : r));
    }, 10_000);
  }
  // Every report re-loads itself every 30s, quietly (no loading state; page, tab, search and scroll
  // stay put). It skips a beat while the browser tab is hidden, a row action is in flight or its
  // popup is open, and never replaces data with an error — a failed reload just keeps what's shown.
  const busyRef = useRef(false);
  const statusRef = useRef(state.status);
  useEffect(() => {
    busyRef.current = pendingAction !== null || actionResult !== null;
    statusRef.current = state.status;
  });
  useEffect(() => {
    const scheduledFor = range;
    const interval = setInterval(async () => {
      if (document.hidden || busyRef.current || statusRef.current !== "ready") return;
      const next = await loadReport(section, scheduledFor);
      if (next.status === "ready" && rangeRef.current === scheduledFor && !busyRef.current) setState(next);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [section, range]);

  async function runTransferAction(action: TransferAction, uniqueTxnId: string, id: string) {
    if (pendingAction) return;
    setPendingAction({ uniqueTxnId, action });
    setActionResult({ action, status: "pending", id });
    try {
      const response = await fetch(`/api/dashboard/transfer/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) {
        setActionResult({
          action,
          status: "ok",
          message: data.message || "Done.",
          id,
          refreshAt: action === "dequeue" ? Date.now() + 10_000 : undefined,
        });
        if (action === "dequeue") scheduleQuietReload();
        setState((prev) =>
          prev.status === "ready"
            ? {
                ...prev,
                table: {
                  ...prev.table,
                  rows: prev.table.rows.map((r) => (r.UniqueTxnId === uniqueTxnId ? applyTransferActionPatch(action, r) : r)),
                },
              }
            : prev,
        );
      } else {
        setActionResult({ action, status: "error", error: data?.error || "The request could not be completed.", id });
      }
    } catch {
      setActionResult({ action, status: "error", error: "The request could not be completed.", id });
    } finally {
      setPendingAction(null);
    }
  }

  const table = state.status === "ready" ? state.table : null;
  const layout = reportLayouts[section];
  const columns = useMemo(() => {
    const all = table ? ((layout && layoutColumns(table, layout)) ?? describeColumns(table)) : [];
    if (!columnLabels) return all;
    return all.filter((c) => columnLabels.includes(c.label)).map((c) => ({ ...c, hideBelow: undefined }));
  }, [table, layout, columnLabels]);

  // Rows of the selected tab (e.g. Transfer's All / Queue / Refundable), then the search on top.
  const viewRows = useMemo(() => {
    if (!table) return [];
    const match = activeView?.match;
    return match ? table.rows.filter(match) : table.rows;
  }, [table, activeView]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return viewRows;
    const matches = (row: ReportRow, key?: string) => !!key && (row[key] ?? "").toLowerCase().includes(needle);
    return viewRows.filter((row) => columns.some((c) => matches(row, c.key) || matches(row, c.subKey)));
  }, [viewRows, columns, query]);

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
  const showTotals = !!table && table.rows.length > 0 && (totals?.credit != null || totals?.debit != null);

  // A new page, tab, search or date range starts at the first row, not wherever the table was
  // scrolled to. `range` (not `table`) is the dependency: a per-row Refresh also produces a new
  // `table` object but shouldn't jump the view back to the top of the list.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tableScrollRef.current?.scrollTo({ top: 0 });
  }, [currentPage, activeView, query, range]);

  function goToPage(next: number) {
    setPage(next);
    // Phones: the page itself scrolls; bring the toolbar back into view so the new page starts at its first card.
    toolbarRef.current?.scrollIntoView({ block: "nearest" });
  }

  function exportCsv() {
    // The byte order mark tells Excel the file is UTF-8; without it "•" and "₹" come out garbled.
    const blob = new Blob([String.fromCharCode(0xfeff), toCsv(columns, filteredRows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const viewSuffix = activeView?.match ? `_${activeView.id}` : "";
    link.download = `${section}${viewSuffix}_${range.from}_${range.to}.csv`;
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
    <div className={cn("flex min-h-0 flex-col", compact ? "h-full gap-2" : "flex-1 gap-3 md:gap-4")}>
      {/* Title + date range */}
      <div className={cn("flex flex-col", compact ? "gap-2" : "gap-3 xl:flex-row xl:items-center xl:justify-between")}>
        {compact ? (
          <h2 className="text-lg font-bold tracking-tight text-text-primary">{label}</h2>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-brand-primary/25 md:h-10 md:w-10">
              <SectionIcon id={section} className="h-5 w-5" />
            </span>
            <h1 className="text-lg font-bold tracking-tight text-text-primary sm:text-2xl">{label}</h1>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSubmit} className={cn("flex w-full items-center gap-1.5", !compact && "md:w-auto")}>
            {/* Nothing before the section's start date can be picked; the server enforces the same limit. */}
            <DatePicker
              label="From"
              value={draft.from}
              min={reportStartDate(section)}
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

      {/* Table */}
      {/* Phones: no box around the list, so cards use the full width */}
      <div className="md:flex md:min-h-0 md:flex-1 md:flex-col md:overflow-hidden md:rounded-2xl md:border md:border-brand-border md:bg-white md:shadow-sm">
        {/*
          Toolbar. Wider screens, one line: tabs, search, totals, then pager and Export on the right.
          Phones: tabs; search + Export; totals + pager (the wrapper uses md:contents so its
          children join the main row on wider screens).
        */}
        <div
          ref={toolbarRef}
          className="flex shrink-0 scroll-mt-3 flex-wrap items-center gap-2 md:border-b md:border-brand-border md:px-3 md:py-2.5"
        >
          {views && (
            <div
              role="group"
              aria-label="Show"
              className="order-1 flex h-9 w-full items-center gap-0.5 rounded-lg border border-brand-border bg-white p-0.5 lg:w-auto"
            >
              {views.map((view) => {
                const active = view.id === activeView?.id;
                const count = table ? (view.match ? table.rows.filter(view.match).length : table.rows.length) : null;
                return (
                  <button
                    key={view.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setViewId(view.id);
                      setPage(0);
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors lg:flex-none",
                      active ? "bg-brand-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {view.label}
                    {count != null && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px] tabular-nums",
                          active ? "bg-white/20 text-white" : "bg-brand-light text-text-secondary",
                        )}
                      >
                        {count.toLocaleString("en-IN")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="relative order-2 min-w-0 flex-1 md:w-56 md:flex-none xl:w-72">
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
          {(showTotals || filteredRows.length > 0) && (
            <div className="order-4 flex w-full flex-wrap items-center justify-between gap-2 md:contents">
              {showTotals && totals && <Totals credit={totals.credit} debit={totals.debit} className="md:order-3" />}
              <Pager page={currentPage} total={filteredRows.length} onPage={goToPage} className="ml-auto md:order-4" />
            </div>
          )}
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredRows.length === 0}
            title="Export CSV"
            className="order-3 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-brand-border bg-white px-2.5 text-sm font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-40 disabled:hover:border-brand-border disabled:hover:text-text-primary md:order-5 md:px-3"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            <span className="sr-only md:not-sr-only">Export</span>
          </button>
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
            {table.rows.length === 0
              ? "No entries for this period."
              : viewRows.length === 0
                ? (activeView?.emptyText ?? "No entries for this period.")
                : "No entries match your search."}
          </p>
        )}

        {/* Phones: one card per entry */}
        {table && filteredRows.length > 0 && (
          <ul className="space-y-2.5 pt-3 md:hidden" aria-label={`${label} entries`}>
            {pageRows.map((row, i) => (
              <RowCard
                key={currentPage * PAGE_SIZE + i}
                row={row}
                layout={cardLayout}
                section={section}
                refreshingTxnId={refreshingTxnId}
                onRefresh={refreshRow}
                pendingAction={pendingAction}
                onAction={runTransferAction}
              />
            ))}
          </ul>
        )}
        {/* Phones: the pager again under the last card, so the next page is one tap away */}
        {table && pageCount > 1 && (
          <Pager
            page={currentPage}
            total={filteredRows.length}
            onPage={goToPage}
            className="mt-3 justify-between rounded-xl border border-brand-border bg-white px-3 py-2 md:hidden"
          />
        )}

        {/* Tablet and up: table */}
        {table && filteredRows.length > 0 && (
          <div ref={tableScrollRef} className="scrollbar-light hidden min-h-40 overflow-auto md:block md:flex-1">
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
                      {columnTitle(column)}
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
                        {ROW_REFRESH_ENABLED && section === "transfer" && column.label === "UTR" && isRefreshableTransfer(row) ? (
                          <RefreshUtrButton
                            refreshing={refreshingTxnId === row.UniqueTxnId}
                            onRefresh={() => refreshRow(row.UniqueTxnId)}
                          />
                        ) : section === "transfer" &&
                          column.kind === "status" &&
                          // Refundable takes over Dequeue when both apply — Enqueue/Refund are the relevant actions then.
                          ((isQueuedTransfer(row) && !isRefundableTransfer(row) && transferRowId(row)) ||
                            (isRefundableTransfer(row) && transferRowId(row))) ? (
                          <div className="flex flex-col items-start gap-1">
                            <Cell column={column} row={row} variant="table" />
                            {isQueuedTransfer(row) && !isRefundableTransfer(row) && transferRowId(row) && (
                              <TransferActionButton
                                action="dequeue"
                                pending={pendingAction?.uniqueTxnId === row.UniqueTxnId && pendingAction.action === "dequeue"}
                                onClick={() => runTransferAction("dequeue", row.UniqueTxnId, transferRowId(row)!)}
                              />
                            )}
                            {isRefundableTransfer(row) && transferRowId(row) && (
                              <>
                                <TransferActionButton
                                  action="enqueue"
                                  pending={pendingAction?.uniqueTxnId === row.UniqueTxnId && pendingAction.action === "enqueue"}
                                  onClick={() => runTransferAction("enqueue", row.UniqueTxnId, transferRowId(row)!)}
                                />
                                <TransferActionButton
                                  action="refund"
                                  pending={pendingAction?.uniqueTxnId === row.UniqueTxnId && pendingAction.action === "refund"}
                                  onClick={() => runTransferAction("refund", row.UniqueTxnId, transferRowId(row)!)}
                                />
                              </>
                            )}
                          </div>
                        ) : (
                          <Cell column={column} row={row} variant="table" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {refreshResult && <RefreshResultDialog result={refreshResult} onClose={() => setRefreshResult(null)} />}
      {actionResult && <TransferActionResultDialog result={actionResult} onClose={() => setActionResult(null)} />}
    </div>
  );
}

type TransferActionResult =
  | { action: TransferAction; status: "pending"; id: string }
  | { action: TransferAction; status: "ok"; message: string; id: string; refreshAt?: number }
  | { action: TransferAction; status: "error"; error: string; id: string };

const TRANSFER_ACTION_RESULT_TITLES: Record<TransferAction, { ok: string; error: string }> = {
  dequeue: { ok: "Removed From Queue", error: "Dequeue Failed" },
  enqueue: { ok: "Added To Queue", error: "Enqueue Failed" },
  refund: { ok: "Refund Processed", error: "Refund Failed" },
};

/** Shows "Requesting…" the instant a row action is clicked, then the vendor's own confirmation or error (no row data comes back). */
function TransferActionResultDialog({ result, onClose }: { result: TransferActionResult; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // After a Dequeue the popup can't be dismissed until the report has reloaded (10s countdown).
  const refreshAt = result.status === "ok" ? result.refreshAt : undefined;
  const locked = refreshAt !== undefined;
  const [secondsLeft, setSecondsLeft] = useState(() => (refreshAt ? Math.max(0, Math.ceil((refreshAt - Date.now()) / 1000)) : 0));
  useEffect(() => {
    if (!refreshAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((refreshAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [refreshAt]);

  const title = result.status === "pending" ? "Requesting…" : TRANSFER_ACTION_RESULT_TITLES[result.action][result.status];

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && !locked) onClose();
      }}
      aria-labelledby="transfer-action-result-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm animate-dialog-in rounded-2xl border border-brand-border bg-white p-5 shadow-2xl shadow-brand-navy/30 backdrop:animate-backdrop-in backdrop:bg-brand-navy/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="transfer-action-result-title" className="flex items-center gap-2 text-base font-semibold text-text-primary">
          {result.status === "pending" && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 animate-spin text-brand-primary"
              aria-hidden="true"
            >
              <path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5" />
              <path d="M18 3v5h-5M6 21v-5h5" />
            </svg>
          )}
          {title}
        </h2>
        {!locked && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-brand-light hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <p className={cn("mt-4 text-sm", result.status === "error" ? "text-red-600" : "text-text-secondary")}>
        {result.status === "pending"
          ? "Sending the request to the payments service…"
          : result.status === "ok"
            ? result.message
            : result.error}
      </p>
      {result.action === "refund" && (
        <p className="mt-1.5 text-xs text-text-secondary">
          Id: <span className="font-mono">{result.id}</span>
        </p>
      )}
      {locked && (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-primary" aria-live="polite">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 animate-spin"
            aria-hidden="true"
          >
            <path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5" />
            <path d="M18 3v5h-5M6 21v-5h5" />
          </svg>
          {secondsLeft > 0 ? `Refreshing the list in ${secondsLeft}s…` : "Refreshing the list…"}
        </p>
      )}
      {result.status !== "pending" && !locked && (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-brand-gradient py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          Close
        </button>
      )}
    </dialog>
  );
}

/** Shown after a per-row Refresh completes: the transaction's latest status, UTR and beneficiary. */
function RefreshResultDialog({ result, onClose }: { result: ReportRow | "not-found"; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const notFound = result === "not-found";
  const row = notFound ? null : result;
  const status = row?.TxnStatus ?? "";

  // Opens as a modal on mount, same as OtpDialog — no close() in cleanup, since React's dev-mode
  // double-mount would otherwise fire the "close" event and dismiss it immediately.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="refresh-result-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm animate-dialog-in rounded-2xl border border-brand-border bg-white p-5 shadow-2xl shadow-brand-navy/30 backdrop:animate-backdrop-in backdrop:bg-brand-navy/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="refresh-result-title" className="text-base font-semibold text-text-primary">
          Transaction Status
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-brand-light hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {notFound || !row ? (
        <p className="mt-4 text-sm text-text-secondary">
          This transaction wasn&apos;t found in the latest report for the selected dates. It may have moved outside
          the current date range.
        </p>
      ) : (
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="shrink-0 text-text-secondary">Txn ID</dt>
            <dd className="min-w-0 truncate font-mono text-xs text-text-primary">{row.UniqueTxnId || "—"}</dd>
          </div>
          {row.BeneficiaryName && (
            <div className="flex items-center justify-between gap-4">
              <dt className="shrink-0 text-text-secondary">Beneficiary</dt>
              <dd className="min-w-0 truncate text-right text-text-primary">{row.BeneficiaryName}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <dt className="shrink-0 text-text-secondary">Status</dt>
            <dd>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase",
                  STATUS_STYLES[status.toLowerCase()] ?? "bg-brand-light text-text-secondary",
                )}
              >
                {status || "—"}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="shrink-0 text-text-secondary">UTR</dt>
            <dd className="min-w-0 truncate text-right font-mono text-xs text-text-primary">
              {row.UTR || "Not available yet"}
            </dd>
          </div>
        </dl>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-lg bg-brand-gradient py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Close
      </button>
    </dialog>
  );
}
