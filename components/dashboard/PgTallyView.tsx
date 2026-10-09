"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-status-success-bg text-status-success",
  PENDING: "bg-status-pending-bg text-status-pending",
  FAILED: "bg-status-failed-bg text-status-failed",
};

const WALLET_LABELS: Record<TallyCheck, { text: string; className: string }> = {
  ok: { text: "✓ Credited", className: "text-status-success" },
  "not-credited": { text: "Not credited", className: "font-semibold text-status-failed" },
  "double-credited": { text: "Credited twice", className: "font-semibold text-status-failed" },
  "wrongly-credited": { text: "Credited, not paid", className: "font-semibold text-status-failed" },
  pending: { text: "—", className: "text-text-secondary" },
  failed: { text: "—", className: "text-text-secondary" },
};

function timeText(iso: string, withDate: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return withDate ? `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${time}` : time;
}

/** Admin: card collections vs wallet credits (vendor PgTallyReport), grouped by retailer. */
export function PgTallyView() {
  const today = toIsoDate(new Date());
  const [range, setRange] = useState<Range>({ from: today, to: today });
  const [draft, setDraft] = useState<Range>(range);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });

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
    setRange({ ...draft });
  }

  const rows = state.status === "ready" ? state.rows : [];
  const totals = tallyTotals(rows);
  const groups = groupByRetailer(rows);
  const multiDay = range.from !== range.to;

  return (
    <section aria-labelledby="pg-tally-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="pg-tally-title" className="text-lg font-bold text-text-primary">
            PG tally
          </h2>
          <p className="text-xs text-text-secondary">Card collections vs wallet credits, by retailer</p>
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
        <div className="space-y-2" aria-busy="true" aria-label="Loading PG tally">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-brand-border bg-white" />
          ))}
        </div>
      )}

      {state.status === "ready" && rows.length === 0 && (
        <p className="rounded-xl border border-brand-border bg-white px-4 py-6 text-center text-sm text-text-secondary">
          No card collections for these dates.
        </p>
      )}

      {state.status === "ready" && rows.length > 0 && (
        <>
          {/* One compact line of totals for all retailers. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm">
            <span>
              <span className="text-text-secondary">Collected </span>
              <span className="font-bold tabular-nums text-text-primary">{inr(totals.collected)}</span>
            </span>
            <span>
              <span className="text-text-secondary">Charges </span>
              <span className="font-semibold tabular-nums text-text-primary">{inr(totals.charges)}</span>
            </span>
            <span>
              <span className="text-text-secondary">Credited </span>
              <span className="font-bold tabular-nums text-text-primary">{inr(totals.credited)}</span>
            </span>
            <span className="text-text-secondary">
              {totals.count} {totals.count === 1 ? "txn" : "txns"} · <span className="text-status-success">{totals.success} success</span> ·{" "}
              {totals.pending} pending · <span className="text-status-failed">{totals.failed} failed</span>
            </span>
            <span
              className={cn(
                "ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold",
                totals.issues > 0 ? "bg-status-failed-bg text-status-failed" : "bg-status-success-bg text-status-success",
              )}
            >
              {totals.issues > 0 ? `${totals.issues} to check` : "✓ All tallied"}
            </span>
          </div>

          <div className="space-y-2">
            {groups.map((group) => (
              <details
                key={group.userName || group.vendorName}
                open={group.totals.issues > 0}
                className="group overflow-hidden rounded-xl border border-brand-border bg-white"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-brand-light/40 [&::-webkit-details-marker]:hidden">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-text-secondary transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                  <span className="min-w-0">
                    <span className="font-semibold text-text-primary">{group.vendorName}</span>
                    {group.userName && group.userName !== group.vendorName && (
                      <span className="ml-2 font-mono text-xs text-text-secondary">{group.userName}</span>
                    )}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {group.totals.count} {group.totals.count === 1 ? "txn" : "txns"} · {group.totals.success} success
                    {group.totals.pending > 0 && ` · ${group.totals.pending} pending`}
                    {group.totals.failed > 0 && ` · ${group.totals.failed} failed`}
                  </span>
                  <span className="ml-auto flex items-center gap-4 text-sm tabular-nums">
                    <span>
                      <span className="text-xs text-text-secondary">Collected </span>
                      <span className="font-semibold text-text-primary">{inr(group.totals.collected)}</span>
                    </span>
                    <span>
                      <span className="text-xs text-text-secondary">Credited </span>
                      <span className="font-semibold text-text-primary">{inr(group.totals.credited)}</span>
                    </span>
                    {group.totals.issues > 0 && (
                      <span className="rounded-full bg-status-failed-bg px-2 py-0.5 text-xs font-semibold text-status-failed">
                        {group.totals.issues} to check
                      </span>
                    )}
                  </span>
                </summary>

                <div className="scrollbar-light max-h-96 overflow-auto border-t border-brand-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-brand-light/95 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      <tr>
                        <th scope="col" className="px-4 py-2">
                          Time
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Reference
                        </th>
                        <th scope="col" className="px-3 py-2 text-right">
                          Amount
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-2">
                          Wallet
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/70">
                      {group.rows.map((row) => {
                        const check = tallyCheck(row);
                        const wallet = WALLET_LABELS[check];
                        return (
                          <tr
                            key={row.collectionId || row.referenceNumber}
                            className={cn(isTallyIssue(check) && "bg-status-failed-bg/60")}
                          >
                            <td className="whitespace-nowrap px-4 py-1.5 text-text-primary">
                              {timeText(row.createdDateTime, multiDay)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-text-secondary">
                              {row.referenceNumber || row.collectionId}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                              <span className="font-semibold text-text-primary">{inr(row.amount)}</span>
                              <span className="block text-[11px] text-text-secondary">{inr(row.debitFromCard)} charged</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  STATUS_STYLES[row.status.toUpperCase()] ?? "bg-brand-light text-text-secondary",
                                )}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className={cn("whitespace-nowrap px-4 py-1.5 text-xs", wallet.className)}>{wallet.text}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
