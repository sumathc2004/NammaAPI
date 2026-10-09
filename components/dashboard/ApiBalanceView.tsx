"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiLevelBalance } from "@/lib/admin/apiBalance";
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

/** Unsettled / pending balances (the vendor spells one "pendnig"), shown apart from the BUL accounts. */
const isHeldBalance = (key: string) => /unsettl|pend/i.test(key);
/** The BUL accounts (`bul_0080` …), grouped inside the BUL total card. */
const isBulAccount = (key: string) => /^bul/i.test(key);

/** Share of a total as a thin bar with the percentage beside it. */
function ShareBar({ share, held = false }: { share: number; held?: boolean }) {
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <div className={cn("h-1.5 min-w-8 flex-1 overflow-hidden rounded-full", held ? "bg-brand-navy/10" : "bg-brand-light")} aria-hidden="true">
        <div
          className={cn("h-full rounded-full", held ? "bg-brand-navy" : "bg-brand-gradient")}
          style={{ width: `${Math.min(100, share)}%` }}
        />
      </div>
      <p className={cn("text-[11px] tabular-nums", held ? "text-brand-navy/70" : "text-text-secondary")}>{share.toFixed(1)}%</p>
    </div>
  );
}

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
  const bulAccounts = balance ? balance.accounts.filter((a) => isBulAccount(a.key)) : [];
  const otherAccounts = balance ? balance.accounts.filter((a) => !isBulAccount(a.key)) : [];
  const bulTotal = round2(bulAccounts.reduce((sum, a) => sum + a.amount, 0));
  const diffMatches = balance?.diff != null && round2(balance.wallet - accountsTotal) === round2(balance.diff);

  return (
    <section aria-labelledby="api-balance-title" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h1 id="api-balance-title" className="text-base font-bold tracking-tight text-text-primary">
            API Level Balance
          </h1>
          {state.status === "ready" && (
            <p className="text-[11px] text-text-secondary">
              Updated {new Date(state.fetchedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={state.status === "loading"}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-border bg-white px-2.5 text-xs font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-60"
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
            <div key={i} className="h-16 animate-pulse rounded-xl border border-brand-border bg-white" />
          ))}
        </div>
      )}

      {balance && (
        // One row on wide screens: each card is as wide as its content and grows to fill the line;
        // on narrower screens they wrap. Order: Difference, API wallet, BUL total (with the BUL
        // accounts inside), then the other balances (RUPE, unsettled, pending).
        <div className="flex flex-wrap gap-1.5 whitespace-nowrap min-[1680px]:gap-2.5">
          <div className="flex-auto rounded-xl bg-brand-gradient px-3 py-2 text-white shadow-lg shadow-brand-primary/20 min-[1680px]:px-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">Difference</p>
              {balance.diff != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    diffMatches ? "bg-white/20 text-white" : "bg-status-failed-bg text-status-failed",
                  )}
                  title={diffMatches ? "Matches wallet − all balances" : "Doesn't match wallet − all balances"}
                >
                  {diffMatches ? "✓" : "≠"}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-lg font-bold leading-snug tabular-nums tracking-tight">
              {balance.diff != null ? inr(balance.diff) : "—"}
            </p>
            <p className="text-[11px] text-white/70">Wallet − balances</p>
          </div>

          <div className="flex-auto rounded-xl border border-brand-border bg-white px-3 py-2 min-[1680px]:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">API wallet</p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-text-primary">{inr(balance.wallet)}</p>
            <p className="text-[11px] text-text-secondary">Platform balance</p>
          </div>

          {bulAccounts.length > 0 && (
            <div className="flex flex-auto flex-wrap gap-x-2.5 gap-y-2 rounded-xl border border-brand-border bg-white px-3 py-2 min-[1680px]:gap-x-4 min-[1680px]:px-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">BUL total</p>
                <p className={cn("mt-0.5 text-base font-bold tabular-nums", "text-text-primary")}>{inr(bulTotal)}</p>
                <p className="text-[11px] text-text-secondary">
                  {bulAccounts.length} account{bulAccounts.length === 1 ? "" : "s"}
                </p>
              </div>
              {bulAccounts.map((account) => (
                <div key={account.key} className="flex-1 border-l border-brand-border pl-2.5 min-[1680px]:pl-4">
                  <p className="font-mono text-[11px] font-semibold text-text-secondary">{account.label}</p>
                  <p className={cn("mt-0.5 text-base font-bold tabular-nums", "text-text-primary")}>{inr(account.amount)}</p>
                  {/* Share of the BUL total. */}
                  <ShareBar share={bulTotal > 0 ? (account.amount / bulTotal) * 100 : 0} />
                </div>
              ))}
            </div>
          )}

          {otherAccounts.map((account) => {
            // Unsettled and pending money isn't in an account yet, so it gets its own (navy) style.
            const held = isHeldBalance(account.key);
            return (
              <div
                key={account.key}
                className={cn(
                  "flex-auto rounded-xl border px-3 py-2 min-[1680px]:px-3.5",
                  held ? "border-brand-navy/15 bg-brand-navy/[0.06]" : "border-brand-border bg-white",
                )}
              >
                <p className={cn("font-mono text-[11px] font-semibold", held ? "text-brand-navy/70" : "text-text-secondary")}>
                  {account.label}
                </p>
                <p className={cn("mt-0.5 text-base font-bold tabular-nums", held ? "text-brand-navy" : "text-text-primary")}>
                  {inr(account.amount)}
                </p>
                {/* Share of all balances (BUL accounts and these). */}
                <ShareBar share={accountsTotal > 0 ? (account.amount / accountsTotal) * 100 : 0} held={held} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
