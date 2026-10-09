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

const count = (n: number) => n.toLocaleString("en-IN");

/** Line icons (24×24, stroke). */
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
  check: <path d="M5 12.5 10 17l9-10" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cross: <path d="M7 7l10 10M17 7 7 17" />,
  sum: <path d="M18 5H6l6 7-6 7h12" />,
  wallet: (
    <>
      <path d="M4 7a2 2 0 0 1 2-2h11v4" />
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M16 14.5h.01" />
    </>
  ),
};
type IconName = keyof typeof ICONS;

function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}

const STAT_TONES = {
  success: "bg-status-success-bg text-status-success",
  waiting: "bg-amber-50 text-amber-700",
  failed: "bg-status-failed-bg text-status-failed",
};

function Stat({ icon, tone, value, label }: { icon: IconName; tone: keyof typeof STAT_TONES; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn("flex size-[18px] shrink-0 items-center justify-center rounded", STAT_TONES[tone])}>
        <Icon name={icon} size={11} />
      </span>
      <span className="font-semibold tabular-nums text-text-primary">{count(value)}</span>
      <span className="text-text-secondary">{label}</span>
    </span>
  );
}

function SummaryCard({
  title,
  subtitle,
  icon,
  part,
  waitingLabel,
  extra,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  part: DaySummaryPart;
  waitingLabel: string;
  /** Shown at the end of the stats line (PG: credited to wallets). */
  extra?: React.ReactNode;
}) {
  const failed = Math.max(0, part.count - part.success - part.waiting);
  const pct = (n: number) => (part.count > 0 ? (n / part.count) * 100 : 0);
  const rate = pct(part.success);
  return (
    <div className="rounded-xl border border-brand-border bg-white px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
          <Icon name={icon} size={16} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="truncate text-[11px] text-text-secondary">{subtitle}</p>
        </div>
        {part.count > 0 && (
          <span
            className={cn(
              "ml-auto shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              rate >= 90 ? "bg-status-success-bg text-status-success" : "bg-amber-50 text-amber-700",
            )}
            title="Success rate"
          >
            {Math.round(rate)}% success
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-xl font-bold tabular-nums tracking-tight text-text-primary" title="Successful today">
          {inr(part.successAmount)}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-text-secondary" title="All attempts today">
          <Icon name="sum" size={11} />
          {count(part.count)} · <span className="font-medium tabular-nums text-text-primary">{inr(part.amount)}</span>
        </p>
      </div>

      {/* Success / waiting / failed share of today's count. */}
      <div
        className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-brand-light"
        role="img"
        aria-label={`${part.success} successful, ${part.waiting} ${waitingLabel}, ${failed} failed of ${part.count}`}
      >
        <div className="bg-status-success" style={{ width: `${pct(part.success)}%` }} />
        <div className="bg-amber-400" style={{ width: `${pct(part.waiting)}%` }} />
        <div className="bg-status-failed" style={{ width: `${pct(failed)}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <Stat icon="check" tone="success" value={part.success} label="success" />
        <Stat icon="clock" tone="waiting" value={part.waiting} label={waitingLabel} />
        <Stat icon="cross" tone="failed" value={failed} label="failed" />
        {extra}
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
        <div className="grid gap-3 xl:grid-cols-3" aria-busy="true" aria-label="Loading today's summary">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[7.5rem] animate-pulse rounded-xl border border-brand-border bg-white" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <div className="grid gap-3 xl:grid-cols-3">
          <SummaryCard
            title="Transfers"
            subtitle="Payouts to beneficiaries"
            icon="transfers"
            part={state.summary.transfers}
            waitingLabel="in queue"
          />
          <SummaryCard
            title="PG collections"
            subtitle="Via payment gateway"
            icon="pg"
            part={state.summary.pg}
            waitingLabel="pending"
            extra={
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums",
                  state.summary.pg.walletCredited === state.summary.pg.success ? "text-status-success" : "text-status-failed",
                )}
                title="Successful collections credited to wallets"
              >
                <Icon name="wallet" size={12} />
                {count(state.summary.pg.walletCredited)}/{count(state.summary.pg.success)} credited
              </span>
            }
          />
          <SummaryCard
            title="Card payments"
            subtitle="Card collections"
            icon="card"
            part={state.summary.card}
            waitingLabel="pending"
          />
        </div>
      )}
    </section>
  );
}
