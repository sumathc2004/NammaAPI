"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiLevelBalance } from "@/lib/admin/apiBalance";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { cn } from "@/lib/cn";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; balance: ApiLevelBalance; fetchedAt: string };

async function loadBalance(): Promise<LoadState> {
  try {
    const response = await fetch("/api/dashboard/admin/api-balance", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.balance) {
      return { status: "error", message: data?.error || "We couldn't load the API balance. Please try again." };
    }
    return { status: "ready", balance: data.balance, fetchedAt: data.fetchedAt };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }
}

/** How often the balance quietly re-loads itself. */
const AUTO_REFRESH_MS = 30_000;

const inr = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
const round2 = (n: number) => Math.round(n * 100) / 100;

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(spinning && "animate-spin")}
    >
      <path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4" />
    </svg>
  );
}

/** Admin: platform wallet vs the BUL account balances, from the vendor's getapiLevelbalance. */
export function ApiBalanceView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadBalance().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Re-load every 30s without the loading skeleton. Skips while the browser tab is hidden or the
  // first load/last reload failed, and a failed quiet reload keeps the numbers on screen.
  const statusRef = useRef(state.status);
  useEffect(() => {
    statusRef.current = state.status;
  });
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden || statusRef.current !== "ready") return;
      const next = await loadBalance();
      if (next.status === "ready") setState(next);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  function refresh() {
    setState({ status: "loading" });
    setReloadKey((k) => k + 1);
  }

  const balance = state.status === "ready" ? state.balance : null;
  const accountsTotal = balance ? round2(balance.accounts.reduce((sum, a) => sum + a.amount, 0)) : 0;
  const diffMatches = balance?.diff != null && round2(balance.wallet - accountsTotal) === round2(balance.diff);

  return (
    <section aria-labelledby="api-balance-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-brand-primary/25 md:h-10 md:w-10">
              <SectionIcon id="admin" className="h-5 w-5" />
            </span>
            <div>
              <h1 id="api-balance-title" className="text-lg font-bold tracking-tight text-text-primary sm:text-2xl">
                API Level Balance
              </h1>
              {state.status === "ready" && (
                <p className="text-xs text-text-secondary">
                  Updated {new Date(state.fetchedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                </p>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={state.status === "loading"}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-border bg-white px-3 text-sm font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-60"
        >
          <RefreshIcon spinning={state.status === "loading"} />
          Refresh
        </button>
      </div>

      {state.status === "error" && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {state.status === "loading" && (
        <div className="grid gap-3 md:grid-cols-3" aria-busy="true" aria-label="Loading API balance">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-brand-border bg-white" />
          ))}
        </div>
      )}

      {balance && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-brand-gradient px-4 py-3 text-white shadow-lg shadow-brand-primary/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/75">API wallet</p>
              <p className="mt-0.5 text-3xl font-bold tabular-nums tracking-tight">{inr(balance.wallet)}</p>
              <p className="text-xs text-white/70">Platform balance at the API level</p>
            </div>

            <div className="rounded-xl border border-brand-border bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">BUL total</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-text-primary">{inr(accountsTotal)}</p>
              <p className="text-xs text-text-secondary">
                Across {balance.accounts.length} account{balance.accounts.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-xl border border-brand-border bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Difference</p>
                {balance.diff != null && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      diffMatches ? "bg-status-success-bg text-status-success" : "bg-status-failed-bg text-status-failed",
                    )}
                  >
                    {diffMatches ? "✓ Matches" : "Doesn't match"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-text-primary">
                {balance.diff != null ? inr(balance.diff) : "—"}
              </p>
              <p className="text-xs text-text-secondary">Wallet − BUL total</p>
            </div>
          </div>

          {balance.accounts.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {balance.accounts.map((account) => {
                const share = accountsTotal > 0 ? (account.amount / accountsTotal) * 100 : 0;
                return (
                  <div key={account.key} className="rounded-xl border border-brand-border bg-white px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs font-semibold text-text-secondary">{account.label}</p>
                      <p className="text-xs tabular-nums text-text-secondary">{share.toFixed(1)}%</p>
                    </div>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">{inr(account.amount)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-light" aria-hidden="true">
                      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min(100, share)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
