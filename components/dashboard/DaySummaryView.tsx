"use client";

import { useEffect, useRef, useState } from "react";
import type { DaySummary, DaySummaryPart } from "@/lib/admin/daySummary";
import { cn } from "@/lib/cn";

/** How often the summary quietly re-loads itself. */
const AUTO_REFRESH_MS = 30_000;

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; summary: DaySummary };

async function loadSummary(): Promise<LoadState> {
  try {
    const response = await fetch("/api/dashboard/admin/day-summary", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.summary) {
      return { status: "error", message: data?.error || "We couldn't load today's summary. Please try again." };
    }
    return { status: "ready", summary: data.summary };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }
}

const inr = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });

function SummaryCard({
  title,
  part,
  waitingLabel,
  extra,
}: {
  title: string;
  part: DaySummaryPart;
  waitingLabel: string;
  extra?: React.ReactNode;
}) {
  const failed = Math.max(0, part.count - part.success - part.waiting);
  return (
    <div className="rounded-xl border border-brand-border bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</p>
        {part.waiting > 0 && (
          <span className="rounded-full bg-status-pending-bg px-2 py-0.5 text-[11px] font-semibold text-status-pending">
            {part.waiting} {waitingLabel}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-text-primary">{inr(part.successAmount)}</p>
      <p className="text-xs text-text-secondary">
        <span className="font-semibold text-status-success">{part.success}</span> of {part.count} successful
        {failed > 0 && <span className="text-status-failed"> · {failed} failed</span>}
        <span> · {inr(part.amount)} total</span>
      </p>
      {extra}
    </div>
  );
}

/** Admin: today's transfers, PG collections and card payments at a glance (vendor TransferPgDaySummary). */
export function DaySummaryView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadSummary().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Quiet reload every 30s; skips while the browser tab is hidden or the last load failed.
  const statusRef = useRef(state.status);
  useEffect(() => {
    statusRef.current = state.status;
  });
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden || statusRef.current !== "ready") return;
      const next = await loadSummary();
      if (next.status === "ready") setState(next);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <section aria-labelledby="day-summary-title" className="space-y-2">
      <h2 id="day-summary-title" className="text-lg font-bold tracking-tight text-text-primary">
        Today&apos;s Summary
      </h2>

      {state.status === "loading" && (
        <div className="grid gap-3 md:grid-cols-3" aria-busy="true" aria-label="Loading today's summary">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-brand-border bg-white" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard title="Transfers" part={state.summary.transfers} waitingLabel="in queue" />
          <SummaryCard
            title="PG collections"
            part={state.summary.pg}
            waitingLabel="pending"
            extra={
              <p
                className={cn(
                  "mt-1 text-xs font-semibold",
                  state.summary.pg.walletCredited === state.summary.pg.success ? "text-status-success" : "text-status-failed",
                )}
              >
                {state.summary.pg.walletCredited === state.summary.pg.success ? "✓ " : ""}
                {state.summary.pg.walletCredited} of {state.summary.pg.success} credited to wallets
              </p>
            }
          />
          <SummaryCard title="Card payments" part={state.summary.card} waitingLabel="pending" />
        </div>
      )}
    </section>
  );
}
