"use client";

import { useEffect, useRef, useState } from "react";
import type { DaySummary, DaySummaryPart } from "@/lib/admin/daySummary";

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

/** Line icons (24×24, stroke) for the three cards. */
const ICONS = {
  // Arrows both ways: money sent out to beneficiaries.
  transfers: <path d="M7 7h13m0 0-4-4m4 4-4 4M17 17H4m0 0 4-4m-4 4 4 4" />,
  // Arrow into a tray: money collected through the payment gateway.
  pg: <path d="M12 3v11m0 0-4-4m4 4 4-4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
};

/** One figure: icon, name and today's successful amount (counts in the tooltip). */
function SummaryCard({ title, icon, part }: { title: string; icon: keyof typeof ICONS; part: DaySummaryPart }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border border-brand-border bg-white px-3 py-2"
      title={`${part.success} of ${part.count} successful · ${inr(part.amount)} attempted`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {ICONS[icon]}
        </svg>
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-medium text-text-secondary">{title}</p>
        <p className="text-base font-bold tabular-nums text-text-primary">{inr(part.successAmount)}</p>
      </div>
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
    <section aria-labelledby="day-summary-title" className="space-y-1.5">
      <h2 id="day-summary-title" className="text-base font-bold tracking-tight text-text-primary">
        Today&apos;s Summary
      </h2>

      {state.status === "loading" && (
        <div className="grid gap-2 sm:grid-cols-3" aria-busy="true" aria-label="Loading today's summary">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl border border-brand-border bg-white" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <SummaryCard title="Transfers" icon="transfers" part={state.summary.transfers} />
          <SummaryCard title="PG collections" icon="pg" part={state.summary.pg} />
          <SummaryCard title="Card payments" icon="card" part={state.summary.card} />
        </div>
      )}
    </section>
  );
}
