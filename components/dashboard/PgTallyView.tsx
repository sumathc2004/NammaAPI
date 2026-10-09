"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DatePicker } from "@/components/dashboard/DatePicker";
import {
  groupByRetailer,
  isTallyIssue,
  tallyCheck,
  tallyTotals,
  type BpayStatusCheck,
  type PgTallyRow,
  type TallyCheck,
} from "@/lib/admin/pgTally";
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

/** Tabs above the table, like Transfer Reports: each filters the loaded rows. */
const VIEWS = [
  { id: "all", label: "All", match: () => true },
  { id: "check", label: "To check", match: (row: PgTallyRow) => isTallyIssue(tallyCheck(row)) },
  { id: "success", label: "Success", match: (row: PgTallyRow) => row.status.toUpperCase() === "SUCCESS" },
  { id: "pending", label: "Pending", match: (row: PgTallyRow) => !/^(success|failed)$/i.test(row.status) },
  { id: "failed", label: "Failed", match: (row: PgTallyRow) => row.status.toUpperCase() === "FAILED" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-status-success-bg text-status-success",
  PENDING: "bg-status-pending-bg text-status-pending",
  FAILED: "bg-status-failed-bg text-status-failed",
};

const WALLET: Record<TallyCheck, { text: string; className: string } | null> = {
  ok: { text: "Credited", className: "bg-status-success-bg text-status-success" },
  "not-credited": { text: "Not credited", className: "bg-status-failed-bg text-status-failed" },
  "double-credited": { text: "Credited twice", className: "bg-status-failed-bg text-status-failed" },
  "wrongly-credited": { text: "Credited, not paid", className: "bg-status-failed-bg text-status-failed" },
  pending: null,
  failed: null,
};

const badge = "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase";

function StatusBadge({ status }: { status: string }) {
  return <span className={cn(badge, STATUS_STYLES[status.toUpperCase()] ?? "bg-brand-light text-text-secondary")}>{status}</span>;
}

/** Wallet badge, with the credit date and time underneath once credited. */
function WalletBadge({ row }: { row: PgTallyRow }) {
  const wallet = WALLET[tallyCheck(row)];
  if (!wallet) return <span className="text-text-secondary">—</span>;
  const credited = row.walletCreditCount > 0 && row.walletCreditTime ? dateParts(row.walletCreditTime) : null;
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={cn(badge, wallet.className)}>{wallet.text}</span>
      {credited && (
        <span className="whitespace-nowrap pl-1 text-[11px] text-text-secondary" title="Credited to the wallet at">
          {credited.date}, {credited.time}
        </span>
      )}
    </span>
  );
}

function dateParts(iso: string): { date: string; time: string } {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return { date: iso, time: "" };
  return {
    date: value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: value.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
  };
}

function RefreshButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Check this collection's status again"
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-brand-border px-2 py-1 text-xs font-medium text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-light disabled:opacity-50"
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
        className={cn("shrink-0", busy && "animate-spin")}
        aria-hidden="true"
      >
        <path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5" />
        <path d="M18 3v5h-5M6 21v-5h5" />
      </svg>
      Refresh
    </button>
  );
}

type CheckResult =
  | { status: "pending"; reference: string }
  | { status: "ok"; reference: string; check: BpayStatusCheck }
  | { status: "error"; reference: string; error: string };

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-text-secondary">{label}</dt>
      <dd className={cn("min-w-0 truncate text-right font-medium text-text-primary", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/** The vendor's answer for one collection: status, fees breakdown and each settlement payout. */
function CheckDetails({ check }: { check: BpayStatusCheck }) {
  const fees = [check.charge, check.gst, check.additionalCharge];
  const feeTotal = fees.every((f) => f === null) ? null : fees.reduce<number>((sum, f) => sum + (f ?? 0), 0);
  return (
    <div className="mt-3 space-y-3 text-xs">
      <div className="flex items-center gap-2">
        {check.status && <StatusBadge status={check.status} />}
        {check.message && <span className="text-sm text-text-primary">{check.message}</span>}
      </div>
      <dl className="space-y-1.5 rounded-lg bg-brand-light/50 px-3 py-2.5">
        {check.collectionId && <DetailRow label="Collection ID" value={check.collectionId} mono />}
        {check.utr && <DetailRow label="UTR" value={check.utr} mono />}
        {feeTotal !== null && (
          <>
            <DetailRow label="Fees" value={inr(feeTotal)} />
            <p className="text-right text-[11px] text-text-secondary">
              {inr(check.charge ?? 0)} charge + {inr(check.gst ?? 0)} GST + {inr(check.additionalCharge ?? 0)} additional
            </p>
          </>
        )}
      </dl>
      {check.payouts.map((payout, i) => (
        <div key={i} className="rounded-lg border border-brand-border px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Payout{check.payouts.length > 1 ? ` ${i + 1}` : ""}
            </span>
            {payout.status && <StatusBadge status={payout.status} />}
          </div>
          <dl className="space-y-1.5">
            {payout.beneficiaryName && <DetailRow label="Beneficiary" value={payout.beneficiaryName} />}
            {(payout.account || payout.ifsc) && (
              <DetailRow label="Account" value={[payout.account, payout.ifsc].filter(Boolean).join(" · ")} mono />
            )}
            {payout.mode && <DetailRow label="Mode" value={payout.mode} />}
            {payout.utr && <DetailRow label="UTR" value={payout.utr} mono />}
            {payout.message && <DetailRow label="Message" value={payout.message} />}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** "Checking…" while the vendor's status check runs, then its message and fields. Native <dialog>. */
function CheckResultDialog({ result, onClose }: { result: CheckResult; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
      aria-labelledby="pg-check-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm animate-dialog-in rounded-2xl border border-brand-border bg-white p-5 shadow-2xl shadow-brand-navy/30 backdrop:animate-backdrop-in backdrop:bg-brand-navy/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="pg-check-title" className="text-base font-semibold text-text-primary">
          {result.status === "pending" ? "Checking…" : result.status === "ok" ? "Status checked" : "Status check failed"}
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
      <p className="mt-1 font-mono text-xs text-text-secondary">{result.reference}</p>
      {result.status === "pending" && (
        <p className="mt-3 text-sm text-text-primary">Asking the payments service for the latest status…</p>
      )}
      {result.status === "error" && <p className="mt-3 text-sm text-red-600">{result.error}</p>}
      {result.status === "ok" && <CheckDetails check={result.check} />}
      {result.status !== "pending" && (
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-brand-gradient py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          Close
        </button>
      )}
    </dialog>
  );
}

const inputClasses =
  "h-9 rounded-lg border border-brand-border bg-white px-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15";

/** Admin: card collections vs wallet credits (vendor PgTallyReport), in the Transfer Reports style. */
export function PgTallyView() {
  const today = toIsoDate(new Date());
  const [range, setRange] = useState<Range>({ from: today, to: today });
  const [draft, setDraft] = useState<Range>(range);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [viewId, setViewId] = useState<ViewId>("all");
  const [retailer, setRetailer] = useState("");
  const [query, setQuery] = useState("");

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

  // Status check for one collection (vendor CanRefresh). The tally reloads quietly afterwards.
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const checking = checkResult?.status === "pending";
  async function checkStatus(reference: string, collectionId: string) {
    if (checking) return;
    setCheckResult({ status: "pending", reference });
    try {
      const response = await fetch("/api/dashboard/admin/pg-tally/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNumber: reference, collectionId }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.check) setCheckResult({ status: "ok", reference, check: data.check });
      else setCheckResult({ status: "error", reference, error: data?.error || "The status check didn't go through." });
    } catch {
      setCheckResult({ status: "error", reference, error: "Network error. Check your connection and try again." });
    }
    const next = await loadTally(range);
    if (next.status === "ready") setState(next);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const error = validateRange(draft.from, draft.to, "pg-reports");
    setRangeError(error);
    if (error) return;
    setState({ status: "loading" });
    setRange({ ...draft });
  }

  const rows = useMemo(() => (state.status === "ready" ? state.rows : []), [state]);
  const retailers = useMemo(() => groupByRetailer(rows), [rows]);
  // Retailer first (the grouping), then tab, then search; rows to check on top, newest first.
  const retailerRows = useMemo(() => (retailer ? rows.filter((r) => (r.userName || r.vendorName) === retailer) : rows), [rows, retailer]);
  const view = VIEWS.find((v) => v.id === viewId) ?? VIEWS[0];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return retailerRows
      .filter(view.match)
      .filter(
        (r) =>
          !needle ||
          [r.vendorName, r.userName, r.referenceNumber, r.collectionId, String(r.amount), String(r.debitFromCard)].some((v) =>
            v.toLowerCase().includes(needle),
          ),
      )
      .sort(
        (a, b) =>
          Number(isTallyIssue(tallyCheck(b))) - Number(isTallyIssue(tallyCheck(a))) || b.createdDateTime.localeCompare(a.createdDateTime),
      );
  }, [retailerRows, view, query]);
  const totals = tallyTotals(retailerRows);
  const ready = state.status === "ready";

  return (
    <section aria-labelledby="pg-tally-title" className="flex flex-col gap-2">
      {/* One compact line: title + date range */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2
          id="pg-tally-title"
          title="Card collections vs wallet credits"
          className="text-lg font-bold tracking-tight text-text-primary"
        >
          PG Tally
        </h2>
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-1.5 md:w-auto">
          <DatePicker
            label="From"
            value={draft.from}
            min={reportStartDate("pg-reports")}
            max={draft.to}
            onChange={(from) => setDraft((d) => ({ ...d, from }))}
            className="min-w-0 flex-1 md:w-52 md:flex-none"
          />
          <span aria-hidden="true" className="hidden text-text-secondary md:inline">
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
      {rangeError && (
        <p role="alert" className="text-right text-xs font-medium text-red-600">
          {rangeError}
        </p>
      )}

      <div className="md:overflow-hidden md:rounded-2xl md:border md:border-brand-border md:bg-white md:shadow-sm">
        {/* Toolbar: tabs, retailer, search, totals */}
        <div className="flex flex-wrap items-center gap-2 md:border-b md:border-brand-border md:px-3 md:py-2.5 xl:flex-nowrap">
          <div
            role="group"
            aria-label="Show"
            className="flex h-9 w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-brand-border bg-white p-0.5 lg:w-auto lg:shrink-0"
          >
            {VIEWS.map((v) => {
              const active = v.id === viewId;
              const count = retailerRows.filter(v.match).length;
              const alert = v.id === "check" && count > 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setViewId(v.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors lg:flex-none",
                    active ? "bg-brand-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {v.label}
                  {ready && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] tabular-nums",
                        active ? "bg-white/20 text-white" : alert ? "bg-status-failed-bg text-status-failed" : "bg-brand-light text-text-secondary",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <label htmlFor="pg-tally-retailer" className="sr-only">
            Retailer
          </label>
          <select
            id="pg-tally-retailer"
            value={retailer}
            onChange={(e) => setRetailer(e.target.value)}
            disabled={!ready || rows.length === 0}
            className={cn(inputClasses, "min-w-0 flex-1 pr-8 md:w-44 md:flex-none xl:shrink-0")}
          >
            <option value="">All retailers ({rows.length})</option>
            {retailers.map((g) => (
              <option key={g.userName || g.vendorName} value={g.userName || g.vendorName}>
                {g.vendorName} ({g.totals.count}){g.totals.issues > 0 ? ` · ${g.totals.issues} to check` : ""}
              </option>
            ))}
          </select>

          <div className="relative min-w-0 flex-1 md:w-44 md:flex-none xl:w-auto xl:min-w-32 xl:flex-1">
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
            <label htmlFor="pg-tally-search" className="sr-only">
              Search collections
            </label>
            <input
              id="pg-tally-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              disabled={!ready || rows.length === 0}
              className={cn(inputClasses, "w-full pl-9 disabled:bg-brand-light/50")}
            />
          </div>

          {ready && rows.length > 0 && (
            <dl
              title="Totals for the selected dates and retailer"
              className="flex h-9 min-w-0 shrink-0 items-center divide-x divide-brand-border rounded-lg border border-brand-border bg-white text-xs md:ml-auto"
            >
              <div className="flex min-w-0 items-baseline gap-1.5 px-2.5">
                <dt className="text-text-secondary">Collected</dt>
                <dd className="truncate font-semibold tabular-nums text-text-primary">{inr(totals.collected)}</dd>
              </div>
              <div className="flex min-w-0 items-baseline gap-1.5 px-2.5">
                <dt className="text-text-secondary">Credited</dt>
                <dd className="truncate font-semibold tabular-nums text-status-success">{inr(totals.credited)}</dd>
              </div>
            </dl>
          )}
        </div>

        {state.status === "loading" && (
          <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading PG tally">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-brand-light/60" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <p role="alert" className="m-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </p>
        )}

        {ready && visible.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-text-secondary">
            {rows.length === 0
              ? "No card collections for these dates."
              : viewId === "check" && !query
                ? "✓ Every collection is tallied with its wallet credit."
                : "No collections match."}
          </p>
        )}

        {ready && visible.length > 0 && (
          <>
            {/* Tablet and up: table */}
            <div className="scrollbar-light hidden max-h-[34rem] overflow-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-brand-light/95 backdrop-blur">
                  <tr className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    <th scope="col" className="whitespace-nowrap px-3 py-2">
                      Date &amp; Time
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Retailer
                    </th>
                    <th scope="col" className="hidden px-3 py-2 lg:table-cell">
                      Reference / Collection ID
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Amount
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Wallet
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/70">
                  {visible.map((row) => {
                    const { date, time } = dateParts(row.createdDateTime);
                    const issue = isTallyIssue(tallyCheck(row));
                    return (
                      <tr
                        key={row.collectionId || row.referenceNumber}
                        className={cn("transition-colors hover:bg-brand-light/40", issue && "bg-status-failed-bg/50 hover:bg-status-failed-bg/70")}
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="block text-text-primary">{date}</span>
                          <span className="block text-xs text-text-secondary">{time}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="block font-medium text-text-primary">{row.vendorName}</span>
                          {row.userName && row.userName !== row.vendorName && (
                            <span className="block font-mono text-xs text-text-secondary">{row.userName}</span>
                          )}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 font-mono lg:table-cell">
                          <span className="block text-xs text-text-primary">{row.referenceNumber || "—"}</span>
                          {row.collectionId && row.collectionId !== row.referenceNumber && (
                            <span className="block text-[11px] text-text-secondary">{row.collectionId}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          <span className="block font-semibold text-text-primary">{inr(row.amount)}</span>
                          <span className="block text-xs text-text-secondary">
                            {inr(row.debitFromCard)} − {inr(row.charges)} fee
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-3 py-2">
<span className="flex items-center gap-2">
                            {!(row.canRefresh && !WALLET[tallyCheck(row)]) && <WalletBadge row={row} />}
                            {row.canRefresh && row.referenceNumber && row.collectionId && (
                              <RefreshButton busy={checking && checkResult?.reference === row.referenceNumber} onClick={() => checkStatus(row.referenceNumber, row.collectionId)} />
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phones: one card per collection */}
            <ul className="space-y-2.5 pt-3 md:hidden" aria-label="PG tally entries">
              {visible.map((row) => {
                const { date, time } = dateParts(row.createdDateTime);
                const issue = isTallyIssue(tallyCheck(row));
                return (
                  <li
                    key={row.collectionId || row.referenceNumber}
                    className={cn("rounded-xl border bg-white px-3.5 py-3 shadow-sm", issue ? "border-status-failed/40" : "border-brand-border")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{row.vendorName}</p>
                        <p className="text-xs text-text-secondary">
                          {date}, {time}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-right">
                          <span className="block text-base font-semibold tabular-nums text-text-primary">{inr(row.amount)}</span>
                          <span className="block text-[11px] tabular-nums text-text-secondary">
                            {inr(row.debitFromCard)} − {inr(row.charges)} fee
                          </span>
                        </span>
                        <StatusBadge status={row.status} />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-brand-border/70 pt-2 text-xs">
<span className="flex items-center gap-2">
                      {!(row.canRefresh && !WALLET[tallyCheck(row)]) && <WalletBadge row={row} />}
                      {row.canRefresh && row.referenceNumber && row.collectionId && (
                        <RefreshButton busy={checking && checkResult?.reference === row.referenceNumber} onClick={() => checkStatus(row.referenceNumber, row.collectionId)} />
                      )}
                          </span>
                      <span className="min-w-0 truncate text-right font-mono text-text-secondary">
                        {row.referenceNumber || row.collectionId}
                        {row.collectionId && row.collectionId !== row.referenceNumber && row.referenceNumber && (
                          <span className="block text-[11px]">{row.collectionId}</span>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {checkResult && <CheckResultDialog result={checkResult} onClose={() => setCheckResult(null)} />}
    </section>
  );
}
