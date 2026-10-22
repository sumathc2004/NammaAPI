"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { isCredit, mergeEntries, statementTotals, type BulkpeEntry } from "@/lib/admin/bulkpeStatement";
import { cn } from "@/lib/cn";

/** How often the newest page quietly re-loads itself. */
const AUTO_REFRESH_MS = 30_000;

/** Phone rows shown per "Show more". */
const MOBILE_PAGE = 30;

type PageResult = { ok: true; entries: BulkpeEntry[]; hasMore: boolean } | { ok: false; message: string };
type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

async function loadPage(page: number): Promise<PageResult> {
  try {
    const response = await fetch(`/api/dashboard/admin/bulkpe-statement?page=${page}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.entries)) {
      return { ok: false, message: data?.error || "We couldn't load the Bulkpe statement. Please try again." };
    }
    return { ok: true, entries: data.entries, hasMore: data.hasMore === true };
  } catch {
    return { ok: false, message: "Network error. Check your connection and try again." };
  }
}

const inr = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });

const VIEWS = [
  { id: "all", label: "All", match: () => true },
  { id: "credit", label: "Credit", match: (e: BulkpeEntry) => isCredit(e) },
  { id: "debit", label: "Debit", match: (e: BulkpeEntry) => !isCredit(e) },
  { id: "pending", label: "Pending", match: (e: BulkpeEntry) => !/^(success|failed)$/i.test(e.status) },
  { id: "failed", label: "Failed", match: (e: BulkpeEntry) => /^failed$/i.test(e.status) },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-status-success-bg text-status-success",
  PENDING: "bg-status-pending-bg text-status-pending",
  FAILED: "bg-status-failed-bg text-status-failed",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
        STATUS_STYLES[status.toUpperCase()] ?? "bg-brand-light text-text-secondary",
      )}
    >
      {status}
    </span>
  );
}

// Vendor times are UTC; show them as Indian time whatever the browser's timezone.
const IST = "Asia/Kolkata";
const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(date);

function when(iso: string): { day: string; time: string; full: string; isToday: boolean } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: "", time: iso, full: iso, isToday: true };
  const time = date.toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
  const day = date.toLocaleDateString("en-IN", { timeZone: IST, day: "2-digit", month: "short" });
  return {
    day,
    time,
    full: date.toLocaleString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }),
    isToday: dayKey(date) === dayKey(new Date()),
  };
}

/** Who the money went to (payout) or what it was (money in). */
function entryTitle(entry: BulkpeEntry): string {
  // Money in with an NPPG… reference is a card collection settling in (same references as the PG Tally).
  if (isCredit(entry)) return entry.holderName || (/^NPPG/i.test(entry.reference) ? "PG collection" : "Money in");
  return entry.holderName || entry.beneficiaryName || "Payout";
}

/** Second line: the account for payouts, the reference (e.g. the PG collection) for money in. */
function entrySubtitle(entry: BulkpeEntry): string {
  if (isCredit(entry)) return entry.reference;
  return [entry.account, entry.ifsc].filter(Boolean).join(" · ") || entry.reference;
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3">
      <dt className="shrink-0 text-text-secondary">{label}</dt>
      <dd className={cn("min-w-0 text-right font-medium text-text-primary wrap-anywhere", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/** Every field of one entry, shown when its row is opened. */
function EntryDetails({ entry }: { entry: BulkpeEntry }) {
  const fees = entry.charge + entry.gst;
  return (
    <dl className="grid gap-x-6 gap-y-1.5 bg-brand-light/40 px-3 py-2.5 text-xs @md:grid-cols-2">
      <Detail label="Transaction ID" value={entry.id} mono />
      <Detail label="Reference" value={entry.reference} mono />
      <Detail label="UTR" value={entry.utr} mono />
      <Detail label="Type" value={[entry.type, entry.mode].filter(Boolean).join(" · ")} />
      <Detail label="BUL account" value={entry.bulAccount} />
      <Detail label="Amount" value={inr(entry.amount)} />
      {fees > 0 && <Detail label="Charges" value={`${inr(entry.charge)} + ${inr(entry.gst)} GST`} />}
      {entry.settlementAmount !== null && entry.settlementAmount !== entry.amount && (
        <Detail label="Total debited" value={inr(entry.settlementAmount)} />
      )}
      {entry.closingBalance !== null && <Detail label="Balance after" value={inr(entry.closingBalance)} />}
      <Detail label="Beneficiary" value={entry.beneficiaryName} />
      <Detail label="Account holder" value={entry.holderName} />
      <Detail label="Account" value={entry.account} mono />
      <Detail label="IFSC" value={entry.ifsc} mono />
      <Detail label="Bank message" value={entry.statusDescription.trim()} />
      <Detail label="Remark" value={entry.remark.trim()} />
      <Detail label="Created" value={when(entry.createdAt).full} />
      <Detail label="Updated" value={when(entry.updatedAt).full} />
    </dl>
  );
}

/** One statement entry: time · who/what · amount and balance · status. Click to see every field. */
function EntryRow({
  entry,
  open,
  onToggle,
  className,
}: {
  entry: BulkpeEntry;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const credit = isCredit(entry);
  const failed = /^failed$/i.test(entry.status);
  const { day, time, isToday } = when(entry.createdAt);
  const note = failed ? entry.statusDescription.trim() : entry.utr ? `UTR ${entry.utr}` : "";

  return (
    <li className={cn(failed && "bg-status-failed-bg/40", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        // Phones (panel narrower than @md): no direction icon column, so the name gets the room.
        className="grid w-full grid-cols-[3.75rem_minmax(0,1fr)_auto] items-start gap-x-2.5 px-3 py-2.5 text-left transition-colors hover:bg-brand-light/50 @md:grid-cols-[3.75rem_1.75rem_minmax(0,1fr)_auto]"
      >
        <span className="tabular-nums">
          {!isToday && <span className="block text-[11px] text-text-secondary">{day}</span>}
          <span className="block whitespace-nowrap text-sm text-text-primary">{time}</span>
        </span>

        {/* Direction: money in (green, arrow down) or a payout (arrow up); red when it failed. */}
        <span
          className={cn(
            "mt-0.5 hidden size-7 items-center justify-center rounded-full @md:flex",
            failed ? "bg-status-failed-bg text-status-failed" : credit ? "bg-status-success-bg text-status-success" : "bg-brand-light text-brand-navy",
          )}
          title={failed ? "Failed: no money moved" : credit ? "Money in" : "Payout"}
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {credit ? <path d="M12 5v14m0 0-5-5m5 5 5-5" /> : <path d="M12 19V5m0 0-5 5m5-5 5 5" />}
          </svg>
        </span>

        <span className="min-w-0">
          {/* The BUL chip wraps under the name when there's no room beside it. */}
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="max-w-full truncate text-sm font-medium text-text-primary" title={entryTitle(entry)}>
              {entryTitle(entry)}
            </span>
            {entry.bulAccount && (
              <span
                className="shrink-0 rounded-md bg-brand-light px-1.5 py-px font-mono text-[10px] font-semibold text-text-secondary"
                title="BUL account this entry went through"
              >
                {entry.bulAccount}
              </span>
            )}
          </span>
          <span className="block truncate font-mono text-[11px] text-text-secondary">{entrySubtitle(entry)}</span>
          {note && (
            <span
              className={cn("block truncate text-[11px]", failed ? "text-status-failed" : "font-mono text-text-secondary")}
              title={note}
            >
              {failed ? note : <><span className="font-sans uppercase tracking-wide">UTR</span> {entry.utr}</>}
            </span>
          )}
        </span>

        <span className="flex flex-col items-end gap-1 text-right">
          <span
            className={cn(
              "whitespace-nowrap text-sm font-semibold tabular-nums",
              failed ? "text-text-secondary line-through" : credit ? "text-status-success" : "text-text-primary",
            )}
          >
            {credit ? "+" : "−"}
            {inr(entry.amount)}
          </span>
          {entry.closingBalance !== null && (
            <span className="whitespace-nowrap text-[11px] tabular-nums text-text-secondary" title="Balance after this entry">
              Bal {inr(entry.closingBalance)}
            </span>
          )}
          <StatusBadge status={entry.status} />
        </span>
      </button>
      {open && <EntryDetails entry={entry} />}
    </li>
  );
}

const inputClasses =
  "h-9 rounded-lg border border-brand-border bg-white px-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15";

/**
 * Admin: the platform's Bulkpe payout account statement (vendor GetBulkpeStatement), newest first.
 * Loads 150 entries at a time ("Load older" fetches the next page); the newest page re-loads every
 * 30 seconds and merges in, so new and updated entries appear without losing older pages.
 */
export function BulkpeStatementView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [entries, setEntries] = useState<BulkpeEntry[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [viewId, setViewId] = useState<ViewId>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileLimit, setMobileLimit] = useState(MOBILE_PAGE);

  useEffect(() => {
    let cancelled = false;
    loadPage(1).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState({ status: "error", message: result.message });
        return;
      }
      setEntries(result.entries);
      setHasMore(result.hasMore);
      setPagesLoaded(1);
      setState({ status: "ready" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Quiet reload of the newest page every 30s (skipped while the tab is hidden or before the first load).
  const readyRef = useRef(false);
  useEffect(() => {
    readyRef.current = state.status === "ready";
  });
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden || !readyRef.current) return;
      const result = await loadPage(1);
      if (result.ok) setEntries((current) => mergeEntries(current, result.entries));
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  async function loadOlder() {
    if (loadingOlder) return;
    setLoadingOlder(true);
    setOlderError(null);
    const result = await loadPage(pagesLoaded + 1);
    if (result.ok) {
      setEntries((current) => mergeEntries(current, result.entries));
      setHasMore(result.hasMore);
      setPagesLoaded((n) => n + 1);
    } else {
      setOlderError(result.message);
    }
    setLoadingOlder(false);
  }

  const view = VIEWS.find((v) => v.id === viewId) ?? VIEWS[0];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .filter(view.match)
      .filter(
        (e) =>
          !needle ||
          [e.beneficiaryName, e.holderName, e.reference, e.id, e.utr, e.account, e.ifsc, e.bulAccount, String(e.amount)].some((v) =>
            v.toLowerCase().includes(needle),
          ),
      );
  }, [entries, view, query]);

  const ready = state.status === "ready";
  const totals = statementTotals(entries);
  const latestBalance = entries.find((e) => e.closingBalance !== null)?.closingBalance ?? null;
  const oldest = entries.at(-1);
  const oldestAt = oldest ? when(oldest.createdAt) : null;

  return (
    <section aria-labelledby="bulkpe-title" className="@container flex min-w-0 flex-col gap-2 md:h-full">
      {/* Title and the account balance after the latest entry. */}
      {/* Phones: the balance drops to its own line under the title when it doesn't fit beside it. */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2
          id="bulkpe-title"
          title="Every movement on the Bulkpe payout account, newest first"
          className="whitespace-nowrap text-base font-bold tracking-tight text-text-primary"
        >
          Bulkpe Statement
        </h2>
        {ready && latestBalance !== null && (
          <dl className="ml-auto flex min-w-0 items-center divide-x divide-brand-border text-xs">
            <div className="flex min-w-0 items-baseline gap-1.5 pr-2.5" title="Account balance after the latest entry">
              <dt className="text-text-secondary">Balance</dt>
              <dd className="truncate font-semibold tabular-nums text-text-primary">{inr(latestBalance)}</dd>
            </div>
            <div className="hidden min-w-0 items-baseline gap-1.5 px-2.5 @lg:flex" title="Successful money in, across the entries loaded below">
              <dt className="text-text-secondary">In</dt>
              <dd className="truncate font-semibold tabular-nums text-status-success">{inr(totals.moneyIn)}</dd>
            </div>
            <div className="hidden min-w-0 items-baseline gap-1.5 pl-2.5 @lg:flex" title="Successful payouts, across the entries loaded below">
              <dt className="text-text-secondary">Out</dt>
              <dd className="truncate font-semibold tabular-nums text-text-primary">{inr(totals.moneyOut)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm md:flex md:min-h-0 md:flex-1 md:flex-col">
        {/* Toolbar, one line: filter dropdown, then search */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-brand-border px-3 py-2.5">
          <FilterSelect
            id="bulkpe-filter"
            label="Show"
            value={viewId}
            onChange={(id) => {
              setViewId(id as ViewId);
              setMobileLimit(MOBILE_PAGE);
            }}
            disabled={!ready}
            className="w-36 shrink-0"
            options={VIEWS.map((v) => ({
              id: v.id,
              label: v.label,
              count: ready ? entries.filter(v.match).length : null,
              alert: v.id === "failed",
            }))}
          />

          <div className="relative min-w-0 flex-1 basis-32">
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
            <label htmlFor="bulkpe-search" className="sr-only">
              Search the statement
            </label>
            <input
              id="bulkpe-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setMobileLimit(MOBILE_PAGE);
              }}
              placeholder="Search name, UTR, reference…"
              disabled={!ready || entries.length === 0}
              className={cn(inputClasses, "w-full pl-9 disabled:bg-brand-light/50")}
            />
          </div>
        </div>

        {state.status === "loading" && (
          <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading the Bulkpe statement">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-brand-light/60" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <p role="alert" className="m-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </p>
        )}

        {ready && (
          <div className="scrollbar-light md:min-h-0 md:flex-1 md:overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-text-secondary">
                {entries.length === 0 ? "No statement entries yet." : "No entries match."}
              </p>
            ) : (
              <>
                <ul className="divide-y divide-brand-border/70" aria-label="Bulkpe statement entries">
                  {visible.map((entry, i) => (
                    <EntryRow
                      key={entry.id || i}
                      entry={entry}
                      open={openId === entry.id}
                      onToggle={() => setOpenId((current) => (current === entry.id ? null : entry.id))}
                      // Phones: 30 rows at a time; tablet and up: the whole loaded list (it scrolls inside the panel).
                      className={cn(i >= mobileLimit && "hidden md:block")}
                    />
                  ))}
                </ul>
                {visible.length > mobileLimit && (
                  <button
                    type="button"
                    onClick={() => setMobileLimit((n) => n + MOBILE_PAGE)}
                    className="h-10 w-full border-t border-brand-border text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-light md:hidden"
                  >
                    Show more ({visible.length - mobileLimit} left)
                  </button>
                )}
              </>
            )}

            {/* Footer: how far back the loaded entries go, and the next (older) page. */}
            {entries.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-border px-3 py-2.5 text-xs text-text-secondary">
                <span>
                  {entries.length.toLocaleString("en-IN")} entries
                  {oldestAt && <> since {oldestAt.isToday ? oldestAt.time : `${oldestAt.day}, ${oldestAt.time}`}</>}
                </span>
                {olderError && <span className="text-red-600">{olderError}</span>}
                {hasMore ? (
                  <button
                    type="button"
                    onClick={loadOlder}
                    disabled={loadingOlder}
                    className="rounded-md border border-brand-border px-2.5 py-1 font-semibold text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-light disabled:opacity-50"
                  >
                    {loadingOlder ? "Loading…" : "Load older"}
                  </button>
                ) : (
                  <span>That’s everything</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
