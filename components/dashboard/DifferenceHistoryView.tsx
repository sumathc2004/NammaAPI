"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DatePicker } from "@/components/dashboard/DatePicker";
import { snapshotChanges, type BalanceSnapshot } from "@/lib/admin/apiBalance";
import { DEFAULT_DASHBOARD_PATH, getDashboardSection } from "@/lib/data/dashboardNav";
import { REPORTS_START_DATE, toIsoDate } from "@/lib/reports/dates";
import { cn } from "@/lib/cn";

const TOP_N = 50;

type Range = { from: string; to: string };
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; snapshots: BalanceSnapshot[] };

const inr = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
const signed = (amount: number) => `${amount > 0 ? "+" : "−"}${inr(Math.abs(amount))}`;

/** The vendor's wall-clock time ("2026-11-04T10:25:04.47", India, no timezone) as date and time, read as written. */
function when(at: string): { day: string; time: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(at);
  if (!match) return { day: at, time: "" };
  const [, y, mo, d, h, mi, s] = match.map(Number);
  const date = new Date(y, mo - 1, d, h, mi, s);
  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" }),
  };
}

async function loadHistory(range: Range): Promise<LoadState> {
  try {
    const query = new URLSearchParams({ fromDate: range.from, toDate: range.to, topN: String(TOP_N) });
    const response = await fetch(`/api/dashboard/admin/api-balance/history?${query}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.snapshots)) {
      return { status: "error", message: data?.error || "We couldn't load the history. Please try again." };
    }
    return { status: "ready", snapshots: data.snapshots };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }
}

/** A week back, but never before the day reports start. */
function defaultRange(): Range {
  const today = new Date();
  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  const from = toIsoDate(weekAgo);
  return { from: from < REPORTS_START_DATE ? REPORTS_START_DATE : from, to: toIsoDate(today) };
}

function DeltaChip({ label, delta }: { label: string; delta: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        delta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
      )}
      title={`${label} ${signed(delta)}`}
    >
      <span className="font-mono text-[10px] font-semibold uppercase opacity-80">{label}</span>
      {signed(delta)}
    </span>
  );
}

/**
 * Admin and accountant page (sidebar: View History, under Filing): the saved history of the platform balances
 * behind the Difference card — one row per snapshot (newest first) with the difference, how much it moved since
 * the snapshot before, and which balances moved to cause it.
 */
export function DifferenceHistoryView() {
  const section = getDashboardSection("view-history");
  const today = toIsoDate(new Date());
  const [draft, setDraft] = useState<Range>(defaultRange);
  const [range, setRange] = useState<Range>(draft);
  // The result is kept with the range it belongs to; a different range means it is still loading.
  const [loaded, setLoaded] = useState<{ range: Range; state: LoadState } | null>(null);
  const state: LoadState = loaded && loaded.range === range ? loaded.state : { status: "loading" };

  useEffect(() => {
    let cancelled = false;
    loadHistory(range).then((next) => {
      if (!cancelled) setLoaded({ range, state: next });
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const snapshots = state.status === "ready" ? state.snapshots : [];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <nav aria-label="Breadcrumb" className="text-xs font-medium text-text-secondary">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href={DEFAULT_DASHBOARD_PATH} className="hover:text-brand-primary">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-text-primary">
            {section.label}
          </li>
        </ol>
      </nav>
      <h1 className="mt-2 text-base font-bold tracking-tight text-text-primary">Difference history</h1>
      <p className="mt-0.5 text-xs text-text-secondary">
        Saved balance snapshots, newest first (latest {TOP_N}). The chips show what moved since the snapshot before.
      </p>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setRange(draft);
        }}
        className="flex shrink-0 flex-wrap items-center gap-2 border-b border-brand-border px-4 py-3"
      >
        <DatePicker
          label="From"
          value={draft.from}
          min={REPORTS_START_DATE}
          max={draft.to}
          onChange={(from) => setDraft((d) => ({ ...d, from }))}
          className="w-52"
        />
        <span className="text-sm text-text-secondary" aria-hidden="true">
          →
        </span>
        <DatePicker label="To" value={draft.to} min={draft.from} max={today} onChange={(to) => setDraft((d) => ({ ...d, to }))} className="w-52" />
        <button
          type="submit"
          disabled={state.status === "loading"}
          className="h-9 rounded-lg bg-brand-gradient px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
        >
          Apply
        </button>
        {state.status === "ready" && (
          <p className="ml-auto text-xs tabular-nums text-text-secondary">
            {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"}
          </p>
        )}
      </form>

      <div className="scrollbar-light min-h-0 flex-1 overflow-y-auto">
        {state.status === "loading" && (
          <div className="space-y-2 p-5" aria-busy="true" aria-label="Loading the history">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-brand-light/60" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </p>
        )}

        {state.status === "ready" && snapshots.length === 0 && (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">No snapshots were saved in this range.</p>
        )}

        {state.status === "ready" && snapshots.length > 0 && (
          <ul className="divide-y divide-brand-border/70" aria-label="Difference history">
            {snapshots.map((snapshot, i) => {
              const older = snapshots[i + 1];
              const { day, time } = when(snapshot.at);
              const diffMoved = older && snapshot.diff !== null && older.diff !== null ? Math.round((snapshot.diff - older.diff) * 100) / 100 : null;
              const changes = older ? snapshotChanges(snapshot, older) : [];
              return (
                <li key={snapshot.id || snapshot.at} className="grid gap-x-4 gap-y-1.5 px-5 py-3 sm:grid-cols-[8.5rem_11rem_minmax(0,1fr)]">
                  <div className="tabular-nums">
                    <p className="text-sm font-semibold text-text-primary">{time}</p>
                    <p className="text-[11px] text-text-secondary">{day}</p>
                  </div>
                  <div className="tabular-nums">
                    <p className="text-sm font-bold text-text-primary">{snapshot.diff !== null ? inr(snapshot.diff) : "—"}</p>
                    {diffMoved !== null && diffMoved !== 0 ? (
                      <p className={cn("text-[11px] font-semibold", diffMoved > 0 ? "text-emerald-700" : "text-red-700")}>
                        {diffMoved > 0 ? "▲" : "▼"} {signed(diffMoved).slice(1)} since before
                      </p>
                    ) : (
                      <p className="text-[11px] text-text-secondary">{older ? "No change in the difference" : "Oldest shown"}</p>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-wrap content-start items-start gap-1">
                    {changes.length > 0 ? (
                      changes.map((c) => <DeltaChip key={c.key} label={c.label} delta={c.delta} />)
                    ) : (
                      <span className="text-[11px] text-text-secondary">{older ? "No balance moved" : "Nothing older to compare with"}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </div>
    </div>
  );
}
