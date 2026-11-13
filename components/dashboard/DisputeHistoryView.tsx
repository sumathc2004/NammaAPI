"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { StatusText } from "@/components/dashboard/StatusText";
import { HISTORY_FILTERS, historyMatches, isHistoryOpen, sortHistory, type DisputeHistoryRow } from "@/lib/admin/disputeHistory";
import { formatAmount, formatDate } from "@/lib/reports/table";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; rows: DisputeHistoryRow[] };

const PAGE_ROWS = 100;

async function load(): Promise<LoadState> {
  try {
    const response = await fetch("/api/dashboard/admin/dispute-history", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.rows)) {
      return { status: "error", message: data?.error || "We couldn't load the dispute history. Please try again." };
    }
    return { status: "ready", rows: sortHistory(data.rows as DisputeHistoryRow[]) };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }
}

/**
 * Dispute History (admins and accountants): the bill payments the vendor marks as failed, with the dispute raised on
 * each (vendor bill/getMarkFailedWithDispute, called with the admin's own login). The transaction id is never shown.
 */
export function DisputeHistoryView() {
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState<{ nonce: number; state: LoadState } | null>(null);
  const state = useMemo<LoadState>(() => (loaded && loaded.nonce === nonce ? loaded.state : { status: "loading" }), [loaded, nonce]);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_ROWS);

  useEffect(() => {
    let cancelled = false;
    load().then((next) => {
      if (!cancelled) setLoaded({ nonce, state: next });
    });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const rows = useMemo(() => (state.status === "ready" ? state.rows : []), [state]);
  const counts = useMemo(() => Object.fromEntries(HISTORY_FILTERS.map((f) => [f.id, rows.filter((r) => historyMatches(r, f.id)).length])), [rows]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/[\s,]/g, "");
    return rows.filter((row) => {
      if (!historyMatches(row, filter)) return false;
      if (!needle) return true;
      return Object.values(row).some((value) => String(value).toLowerCase().replace(/[\s,]/g, "").includes(needle));
    });
  }, [rows, filter, query]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-brand-primary/25 md:h-10 md:w-10">
          <SectionIcon id="dispute-history" className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-bold tracking-tight text-text-primary sm:text-2xl">Dispute History</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-border px-4 py-3">
          <FilterSelect
            id="dispute-history-filter"
            label="Show"
            value={filter}
            options={HISTORY_FILTERS.map((f) => ({ id: f.id, label: f.label, count: state.status === "ready" ? counts[f.id] : null, alert: f.id === "open" }))}
            onChange={(id) => {
              setFilter(id);
              setShown(PAGE_ROWS);
            }}
            disabled={state.status !== "ready"}
            className="w-48"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE_ROWS);
            }}
            placeholder="Search entries"
            aria-label="Search the dispute history"
            className="h-9 min-w-0 flex-1 rounded-lg border border-brand-border bg-white px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 md:w-80 md:flex-none"
          />
          <p className="ml-auto text-xs tabular-nums text-text-secondary">
            {state.status === "ready" ? `${visible.length.toLocaleString("en-IN")} entr${visible.length === 1 ? "y" : "ies"}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            disabled={state.status === "loading"}
            className="h-9 rounded-lg border border-brand-border bg-white px-3 text-sm font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {state.status === "loading" && (
          <div className="space-y-2 p-5" aria-busy="true" aria-label="Loading the dispute history">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-brand-light/60" />
            ))}
          </div>
        )}
        {state.status === "error" && (
          <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </p>
        )}
        {state.status === "ready" && visible.length === 0 && (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">{rows.length === 0 ? "Nothing here yet." : "No entries match."}</p>
        )}
        {state.status === "ready" && visible.length > 0 && (
          <>
            {/* From lg: a table with fixed column widths (nothing scrolls sideways; long text wraps). */}
            <table className="hidden w-full table-fixed text-left text-sm lg:table">
              <thead>
                <tr className="border-b border-brand-border bg-brand-light/50 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  <th scope="col" className="w-[11%] px-4 py-2.5">
                    Date &amp; Time
                  </th>
                  <th scope="col" className="w-[14%] px-2 py-2.5">
                    Retailer
                  </th>
                  <th scope="col" className="w-[9%] px-2 py-2.5">
                    Mobile
                  </th>
                  <th scope="col" className="w-[13%] px-2 py-2.5">
                    Bank / Card
                  </th>
                  <th scope="col" className="w-[17%] px-2 py-2.5">
                    Reference
                  </th>
                  <th scope="col" className="w-[9%] px-2 py-2.5 text-right">
                    Amount
                  </th>
                  <th scope="col" className="w-[11%] px-2 py-2.5 text-center">
                    Dispute
                  </th>
                  <th scope="col" className="w-[16%] px-4 py-2.5">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/70">
                {visible.slice(0, shown).map((row, i) => (
                  <tr key={`${row.billPaidRefNo}-${i}`} className="align-top">
                    <td className="px-4 py-3 tabular-nums text-text-primary">
                      {row.createdAt ? <DateStack value={row.createdAt} /> : "—"}
                    </td>
                    <td className="px-2 py-3">
                      <p className="break-words font-medium text-text-primary">{row.retailerName || "—"}</p>
                      {row.storeName && <p className="break-words text-xs italic text-brand-primary">{row.storeName}</p>}
                    </td>
                    <td className="px-2 py-3 tabular-nums text-text-primary">{row.mobileNumber || "—"}</td>
                    <td className="px-2 py-3">
                      <p className="break-words text-text-primary">{row.bankName || "—"}</p>
                      {row.cardLast4 && <p className="text-xs tabular-nums text-text-secondary">•••• {row.cardLast4}</p>}
                    </td>
                    <td className="px-2 py-3">
                      {row.billPaidRefNo ? (
                        <span className="inline-flex max-w-full items-center font-mono text-[11px] text-text-primary">
                          <span className="break-all">{row.billPaidRefNo}</span>
                          <CopyButton value={row.billPaidRefNo} label="Reference" className="size-3.5 shrink-0" />
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-3 text-right font-semibold tabular-nums text-text-primary">{row.amount ? formatAmount(row.amount) : "—"}</td>
                    <td className="px-2 py-3 text-center">
                      <DisputePill row={row} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {row.disputeRaised ? (
                        <>
                          <p className="break-words text-text-primary">{row.disputeReason || "—"}</p>
                          {row.disputeRaisedAt && <p className="mt-0.5 tabular-nums">Raised {formatDate(row.disputeRaisedAt)}</p>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Below lg: one card per entry. */}
            <ul className="divide-y divide-brand-border/70 lg:hidden" aria-label="Dispute history">
              {visible.slice(0, shown).map((row, i) => (
                <li key={`${row.billPaidRefNo}-${i}`} className="space-y-1.5 px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary">
                        {row.retailerName || "—"}
                        {row.storeName && <span className="ml-2 text-xs font-normal italic text-brand-primary">{row.storeName}</span>}
                      </p>
                      <p className="text-xs tabular-nums text-text-secondary">{row.createdAt ? formatDate(row.createdAt) : "—"}</p>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums text-text-primary">{row.amount ? formatAmount(row.amount) : "—"}</span>
                  </div>
                  <p className="text-xs tabular-nums text-text-secondary">
                    {[row.mobileNumber, row.bankName, row.cardLast4 && `•••• ${row.cardLast4}`].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    {row.billPaidRefNo ? (
                      <span className="inline-flex min-w-0 items-center font-mono text-[11px] text-text-secondary">
                        <span className="truncate">{row.billPaidRefNo}</span>
                        <CopyButton value={row.billPaidRefNo} label="Reference" className="size-3.5" />
                      </span>
                    ) : (
                      <span />
                    )}
                    <DisputePill row={row} />
                  </div>
                  {row.disputeRaised && row.disputeReason && (
                    <p className="text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">Reason:</span> {row.disputeReason}
                      {row.disputeRaisedAt && <span className="ml-2 tabular-nums">· Raised {formatDate(row.disputeRaisedAt)}</span>}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {visible.length > shown && (
              <div className="border-t border-brand-border/70 p-4 text-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE_ROWS)}
                  className="rounded-lg border border-brand-border bg-white px-4 py-2 text-sm font-medium text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-light"
                >
                  Show more ({(visible.length - shown).toLocaleString("en-IN")} left)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DisputePill({ row }: { row: DisputeHistoryRow }) {
  return row.disputeRaised ? (
    <StatusText tone={isHistoryOpen(row) ? "pending" : "success"}>{`Dispute ${(row.disputeStatus || "raised").toLowerCase()}`}</StatusText>
  ) : (
    <StatusText tone="neutral">No dispute</StatusText>
  );
}

/** The date on one line and the time under it ("13 Nov 2026" / "4:09 pm"). */
function DateStack({ value }: { value: string }) {
  const full = formatDate(value);
  const at = full.lastIndexOf(", ");
  if (at < 0) return <>{full}</>;
  return (
    <>
      <span className="block whitespace-nowrap font-semibold">{full.slice(0, at)}</span>
      <span className="block text-xs text-text-secondary">{full.slice(at + 2)}</span>
    </>
  );
}
