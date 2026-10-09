"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { DatePicker } from "@/components/dashboard/DatePicker";
import { groupByRetailer, isTallyIssue, tallyCheck, tallyTotals, type PgTallyRow, type TallyCheck } from "@/lib/admin/pgTally";
import { reportStartDate, toIsoDate, validateRange } from "@/lib/reports/dates";
import { cn } from "@/lib/cn";

/** How often the tally quietly re-loads itself. */
const AUTO_REFRESH_MS = 30_000;

type Range = { from: string; to: string };
type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; rows: PgTallyRow[] };

async function loadTally(range: Range): Promise<LoadState> {
  try {
    const query = new URLSearchParams({ fromDate: range.from, toDate: range.to });
    const response = await fetch(`/api/dashboard/admin/pg-tally?${query}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.rows)) {
      return { status: "error", message: data?.error || "We couldn't load the PG tally. Please try again." };
    }
    return { status: "ready", rows: data.rows };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }
}

const inr = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });

const STATUS_DOT: Record<string, string> = {
  SUCCESS: "bg-status-success",
  PENDING: "bg-status-pending",
  FAILED: "bg-status-failed",
};

/** What went wrong with a collection's wallet credit (only for rows that need checking). */
const ISSUE_TEXT: Partial<Record<TallyCheck, string>> = {
  "not-credited": "Paid, not credited",
  "double-credited": "Credited twice",
  "wrongly-credited": "Credited, not paid",
};

const WALLET_TEXT: Record<TallyCheck, string> = {
  ok: "Credited",
  "not-credited": "Not credited",
  "double-credited": "Credited twice",
  "wrongly-credited": "Credited, not paid",
  pending: "—",
  failed: "—",
};

function timeText(iso: string, withDate: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return withDate ? `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${time}` : time;
}

/** Admin: card collections vs wallet credits (vendor PgTallyReport), summarised by retailer. */
export function PgTallyView() {
  const today = toIsoDate(new Date());
  const [range, setRange] = useState<Range>({ from: today, to: today });
  const [draft, setDraft] = useState<Range>(range);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [openRetailer, setOpenRetailer] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTally(range).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Quiet reload every 30s (no loading state); skips while the tab is hidden or the last load failed.
  const statusRef = useRef(state.status);
  useEffect(() => {
    statusRef.current = state.status;
  });
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden || statusRef.current !== "ready") return;
      const next = await loadTally(range);
      if (next.status === "ready") setState(next);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [range]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const error = validateRange(draft.from, draft.to, "pg-reports");
    setRangeError(error);
    if (error) return;
    setState({ status: "loading" });
    setOpenRetailer(null);
    setRange({ ...draft });
  }

  const rows = state.status === "ready" ? state.rows : [];
  const totals = tallyTotals(rows);
  const groups = groupByRetailer(rows);
  const issues = rows.filter((row) => isTallyIssue(tallyCheck(row)));
  const multiDay = range.from !== range.to;

  return (
    <section aria-labelledby="pg-tally-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="pg-tally-title" className="text-lg font-bold text-text-primary">
            PG tally
          </h2>
          <p className="text-xs text-text-secondary">Card collections and the wallet credits they should create</p>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-1.5 sm:w-auto">
          <DatePicker
            label="From"
            value={draft.from}
            min={reportStartDate("pg-reports")}
            max={draft.to}
            onChange={(from) => setDraft((d) => ({ ...d, from }))}
            className="min-w-0 flex-1 sm:w-52 sm:flex-none"
          />
          <DatePicker
            label="To"
            value={draft.to}
            min={draft.from}
            max={today}
            align="right"
            onChange={(to) => setDraft((d) => ({ ...d, to }))}
            className="min-w-0 flex-1 sm:w-52 sm:flex-none"
          />
          <button
            type="submit"
            disabled={state.status === "loading"}
            className="h-9 shrink-0 rounded-lg bg-brand-gradient px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
          >
            Apply
          </button>
        </form>
      </div>
      {rangeError && (
        <p role="alert" className="text-right text-xs font-medium text-red-600">
          {rangeError}
        </p>
      )}

      {state.status === "error" && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {state.status === "loading" && (
        <div className="h-48 animate-pulse rounded-xl border border-brand-border bg-white" aria-busy="true" aria-label="Loading PG tally" />
      )}

      {state.status === "ready" && rows.length === 0 && (
        <p className="rounded-xl border border-brand-border bg-white px-4 py-6 text-center text-sm text-text-secondary">
          No card collections for these dates.
        </p>
      )}

      {state.status === "ready" && rows.length > 0 && (
        <>
          {/* 1. The few collections that don't add up — the reason to open this page. */}
          {issues.length > 0 ? (
            <div className="rounded-xl border border-status-failed/25 bg-status-failed-bg/60">
              <p className="px-4 pt-3 text-sm font-semibold text-status-failed">
                {issues.length} {issues.length === 1 ? "collection needs" : "collections need"} checking
              </p>
              <ul className="divide-y divide-status-failed/10 px-4 pb-1">
                {issues.map((row) => (
                  <li key={row.collectionId || row.referenceNumber} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2 text-sm">
                    <span className="w-40 shrink-0 truncate font-medium text-text-primary">{row.vendorName}</span>
                    <span className="w-20 shrink-0 text-text-secondary">{timeText(row.createdDateTime, multiDay)}</span>
                    <span className="w-28 shrink-0 text-right font-semibold tabular-nums text-text-primary">{inr(row.amount)}</span>
                    <span className="font-semibold text-status-failed">{ISSUE_TEXT[tallyCheck(row)]}</span>
                    <span className="ml-auto font-mono text-xs text-text-secondary">{row.referenceNumber || row.collectionId}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl border border-status-success/25 bg-status-success-bg px-4 py-2.5 text-sm font-semibold text-status-success">
              ✓ Every collection is tallied with its wallet credit.
            </p>
          )}

          {/* 2. One row per retailer; click a row to see its collections. */}
          <div className="overflow-x-auto rounded-xl border border-brand-border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-brand-border bg-brand-light/60 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left">
                    Retailer
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Txns
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-left md:table-cell">
                    Success / Pending / Failed
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Collected
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Credited
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Tally
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const key = group.userName || group.vendorName;
                  const open = openRetailer === key;
                  return (
                    <Fragment key={key}>
                      <tr
                        onClick={() => setOpenRetailer(open ? null : key)}
                        className={cn("cursor-pointer border-b border-brand-border/70 hover:bg-brand-light/40", open && "bg-brand-light/40")}
                      >
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenRetailer(open ? null : key);
                            }}
                            className="flex items-center gap-2 text-left font-semibold text-text-primary"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={cn("shrink-0 text-text-secondary transition-transform", open && "rotate-90")}
                              aria-hidden="true"
                            >
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                            {group.vendorName}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{group.totals.count}</td>
                        <td className="hidden px-3 py-2.5 tabular-nums md:table-cell">
                          <span className="text-status-success">{group.totals.success}</span>
                          <span className="text-text-secondary"> / {group.totals.pending} / </span>
                          <span className={group.totals.failed ? "text-status-failed" : "text-text-secondary"}>{group.totals.failed}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{inr(group.totals.collected)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-text-primary">{inr(group.totals.credited)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {group.totals.issues > 0 ? (
                            <span className="text-xs font-semibold text-status-failed">{group.totals.issues} to check</span>
                          ) : (
                            <span className="text-xs font-semibold text-status-success">✓ OK</span>
                          )}
                        </td>
                      </tr>

                      {open && (
                        <tr className="border-b border-brand-border/70 bg-brand-light/20">
                          <td colSpan={6} className="px-4 pb-3 pt-1">
                            <ul className="scrollbar-light max-h-72 divide-y divide-brand-border/60 overflow-y-auto">
                              {group.rows.map((row) => {
                                const check = tallyCheck(row);
                                return (
                                  <li
                                    key={row.collectionId || row.referenceNumber}
                                    className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-1.5 pl-5 text-xs sm:text-sm"
                                  >
                                    <span className="w-20 shrink-0 text-text-secondary">{timeText(row.createdDateTime, multiDay)}</span>
                                    <span className="flex w-24 shrink-0 items-center gap-1.5 text-text-secondary">
                                      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[row.status.toUpperCase()] ?? "bg-text-secondary")} />
                                      {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                                    </span>
                                    <span className="w-28 shrink-0 text-right font-semibold tabular-nums text-text-primary">{inr(row.amount)}</span>
                                    <span className={cn("w-32 shrink-0", isTallyIssue(check) ? "font-semibold text-status-failed" : "text-text-secondary")}>
                                      {WALLET_TEXT[check]}
                                    </span>
                                    <span className="ml-auto font-mono text-[11px] text-text-secondary">{row.referenceNumber || row.collectionId}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-brand-light/40 font-semibold">
                <tr>
                  <td className="px-4 py-2.5 text-text-primary">Total</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{totals.count}</td>
                  <td className="hidden px-3 py-2.5 tabular-nums md:table-cell">
                    <span className="text-status-success">{totals.success}</span>
                    <span className="text-text-secondary"> / {totals.pending} / </span>
                    <span className="text-status-failed">{totals.failed}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{inr(totals.collected)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{inr(totals.credited)}</td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    {totals.issues > 0 ? (
                      <span className="text-status-failed">{totals.issues} to check</span>
                    ) : (
                      <span className="text-status-success">✓ OK</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-[11px] text-text-secondary">
            Collected = charged to cards (successful only). Credited = credited to wallets (card amount minus charges of{" "}
            {inr(totals.charges)}).
          </p>
        </>
      )}
    </section>
  );
}
