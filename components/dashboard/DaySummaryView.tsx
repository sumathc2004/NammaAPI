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
    <div className="min-w-0 rounded-lg bg-brand-light/60 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", STAT_TONES[tone])}>
          <Icon name={icon} size={13} />
        </span>
        <p className="text-sm font-bold tabular-nums text-text-primary">{count(value)}</p>
      </div>
      <p className="mt-1 truncate text-[11px] text-text-secondary">{label}</p>
    </div>
  );
}

function SummaryCard({
  title,
  subtitle,
  icon,
  part,
  waitingLabel,
  footer,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  part: DaySummaryPart;
  waitingLabel: string;
  footer?: React.ReactNode;
}) {
  const failed = Math.max(0, part.count - part.success - part.waiting);
  const pct = (n: number) => (part.count > 0 ? (n / part.count) * 100 : 0);
  const rate = pct(part.success);
  return (
    <div className="flex flex-col rounded-xl border border-brand-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-brand-primary/20">
            <Icon name={icon} size={19} />
          </span>
          <div>
            <p className="text-sm font-bold text-text-primary">{title}</p>
            <p className="text-xs text-text-secondary">{subtitle}</p>
          </div>
        </div>
        {part.count > 0 && (
          <span
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              rate >= 90 ? "bg-status-success-bg text-status-success" : "bg-amber-50 text-amber-700",
            )}
            title="Success rate"
          >
            {Math.round(rate)}% success
          </span>
        )}
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Successful today</p>
      <p className="text-2xl font-bold tabular-nums tracking-tight text-text-primary">{inr(part.successAmount)}</p>

      {/* Success / waiting / failed share of today's count. */}
      <div
        className="mt-3 flex h-2 overflow-hidden rounded-full bg-brand-light"
        role="img"
        aria-label={`${part.success} successful, ${part.waiting} ${waitingLabel}, ${failed} failed of ${part.count}`}
      >
        <div className="bg-status-success" style={{ width: `${pct(part.success)}%` }} />
        <div className="bg-amber-400" style={{ width: `${pct(part.waiting)}%` }} />
        <div className="bg-status-failed" style={{ width: `${pct(failed)}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon="check" tone="success" value={part.success} label="Successful" />
        <Stat icon="clock" tone="waiting" value={part.waiting} label={waitingLabel[0].toUpperCase() + waitingLabel.slice(1)} />
        <Stat icon="cross" tone="failed" value={failed} label="Failed" />
      </div>

      <div className="mt-auto space-y-1.5 pt-3">
        <div className="flex items-center justify-between gap-2 border-t border-brand-border pt-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Icon name="sum" size={13} />
            {count(part.count)} attempted
          </span>
          <span className="font-semibold tabular-nums text-text-primary">{inr(part.amount)}</span>
        </div>
        {footer}
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
    <section aria-labelledby="day-summary-title" className="space-y-2">
      <h2 id="day-summary-title" className="text-lg font-bold tracking-tight text-text-primary">
        Today&apos;s Summary
      </h2>

      {state.status === "loading" && (
        <div className="grid gap-3 xl:grid-cols-3" aria-busy="true" aria-label="Loading today's summary">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl border border-brand-border bg-white" />
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
            footer={
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Icon name="wallet" size={13} />
                  Credited to wallets
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    state.summary.pg.walletCredited === state.summary.pg.success ? "text-status-success" : "text-status-failed",
                  )}
                >
                  {state.summary.pg.walletCredited === state.summary.pg.success ? "✓ " : ""}
                  {count(state.summary.pg.walletCredited)} of {count(state.summary.pg.success)}
                </span>
              </div>
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
