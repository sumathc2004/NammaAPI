"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { FilterSelect, type FilterOption } from "@/components/dashboard/FilterSelect";
import { RowTime } from "@/components/dashboard/RowTime";
import { StatusText, rowTint } from "@/components/dashboard/StatusText";
import { ccAmount, ccFee, ccRefundTotal, type CcTxn, type CcTxnsResponse } from "@/lib/admin/ccTransactions";
import { parseDemoSession, readDemoSessionRaw, subscribeDemoSession } from "@/lib/auth/demoSession";
import { shortCode } from "@/lib/reports/shortCode";
import { cn } from "@/lib/cn";

/** Opening the drawer reloads the list when the last load is older than this. */
const RELOAD_AFTER_MS = 60_000;
/** Rows drawn per "Show more". */
const PAGE_ROWS = 100;

type LoadResult = { ok: true; data: CcTxnsResponse } | { ok: false; message: string };

async function loadCcTxns(): Promise<LoadResult> {
  try {
    const response = await fetch("/api/dashboard/admin/cc-transactions", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.entries)) {
      return { ok: false, message: data?.error || "We couldn't load the credit-card payments. Please try again." };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Network error. Check your connection and try again." };
  }
}

const inr = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });

// Vendor times are UTC; show them as Indian time whatever the browser's timezone.
const IST = "Asia/Kolkata";
const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(date);

function when(iso: string): { key: string; day: string; time: string; full: string; isToday: boolean } {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return { key: "", day: "", time: iso, full: iso, isToday: true };
  return {
    key: dayKey(date),
    day: date.toLocaleDateString("en-IN", { timeZone: IST, day: "2-digit", month: "short" }),
    time: date.toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" }),
    full: date.toLocaleString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }),
    isToday: dayKey(date) === dayKey(new Date()),
  };
}

/** Lower-cases and drops spaces, underscores, hyphens, commas and dots, so a search matches however it is typed. */
const squash = (text: string) => text.toLowerCase().replace(/[\s_,.•-]+/g, "");

const STATUS_VIEWS = [
  { id: "all", label: "All", match: () => true },
  { id: "success", label: "Success", match: (t: CcTxn) => t.status === "SUCCESS" },
  { id: "pending", label: "Pending", match: (t: CcTxn) => !/^(SUCCESS|FAILED)$/.test(t.status) },
  { id: "failed", label: "Failed", match: (t: CcTxn) => t.status === "FAILED" },
] as const;
const BUL_PREFIX = "bul:";

function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

function Detail({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3">
      <dt className="shrink-0 text-text-secondary">{label}</dt>
      <dd className={cn("flex min-w-0 items-center justify-end gap-1 text-right font-medium text-text-primary wrap-anywhere", copy && "font-mono")}>
        {value}
        {copy && <CopyButton value={value} label={label} className="size-3.5" />}
      </dd>
    </div>
  );
}

/** Every field of one payment, shown when its row is opened. */
function TxnDetails({ txn }: { txn: CcTxn }) {
  const fee = ccFee(txn);
  return (
    <dl className="grid gap-x-6 gap-y-1.5 bg-brand-light/40 px-4 py-3 text-xs @lg:grid-cols-2">
      <Detail label="Transaction ID" value={txn.id} copy />
      <Detail label="Reference" value={txn.reference} copy />
      <Detail label="NPCI reference" value={txn.npciRef} copy />
      <Detail label="Fetch ID" value={txn.fetchId} copy />
      <Detail label="Merchant reference" value={txn.merchantReference} copy />
      <Detail label="UTR" value={txn.utr} copy />
      <Detail label="Bank" value={txn.bank} />
      <Detail label="Biller ID" value={txn.billerId} copy />
      <Detail label="Category" value={txn.billerCategory} />
      <Detail label="Card" value={txn.card} />
      <Detail label="Mobile" value={txn.mobile} copy />
      <Detail label="Shop" value={txn.shop} />
      <Detail label="Retailer" value={txn.retailer} copy />
      <Detail label="BUL account" value={txn.bulAccount} />
      <Detail label="Paid to card" value={txn.amount !== null ? inr(txn.amount) : ""} />
      <Detail
        label="Charges"
        value={fee === null ? "" : txn.charge !== null && txn.gst !== null ? `${inr(txn.charge)} + ${inr(txn.gst)} GST = ${inr(fee)}` : inr(fee)}
      />
      <Detail label="Total debited" value={txn.totalDebited !== null ? inr(txn.totalDebited) : ""} />
      <Detail label="Mode" value={txn.mode} />
      <Detail label="Status" value={[txn.status, txn.statementMessage].filter(Boolean).join(" · ")} />
      <Detail label="BBPS status" value={[txn.bbpsStatus, txn.bbpsMessage].filter(Boolean).join(" · ")} />
      {txn.refund && (
        <>
          <Detail
            label="Refunded"
            value={(() => {
              const total = ccRefundTotal(txn.refund);
              const parts = txn.refund.amount !== null ? `${inr(txn.refund.amount)} + ${inr((txn.refund.charge ?? 0) + (txn.refund.gst ?? 0))} charges` : "";
              return [total !== null ? `${inr(total)} (${parts})` : "", txn.refund.refundedAt && `on ${when(txn.refund.refundedAt).full}`].filter(Boolean).join(" ");
            })()}
          />
          <Detail label="Refund status" value={[txn.refund.status, txn.refund.message].filter(Boolean).join(" · ")} />
        </>
      )}
      <Detail label="Remark" value={txn.remark} />
      <Detail label="Created" value={when(txn.createdAt).full} />
      <Detail label="Updated" value={when(txn.updatedAt).full} />
      <Detail label="BBPS created" value={when(txn.bbpsCreatedAt).full} />
      <Detail label="BBPS updated" value={when(txn.bbpsUpdatedAt).full} />
    </dl>
  );
}

/** One payment in two lines: BUL account and time · bank and card, then mobile and transaction ID · amount, fee and status. */
function TxnRow({ txn, open, onToggle }: { txn: CcTxn; open: boolean; onToggle: () => void }) {
  const failed = txn.status === "FAILED";
  const { day, time, isToday } = when(txn.createdAt);
  const fee = ccFee(txn);
  return (
    <li className={rowTint(txn.status)}>
      {/* A div, not a button, so the copy buttons inside are not buttons within a button; the bank name is the
          real button for keyboard users. */}
      <div
        onClick={onToggle}
        className="grid h-14 w-full cursor-pointer grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 text-left transition-colors hover:bg-brand-light/50"
      >
        <RowTime label={txn.bulAccount} time={time} day={isToday ? undefined : day} />

        <span className="min-w-0 overflow-hidden">
          <button
            type="button"
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className="flex h-5 w-full min-w-0 items-baseline gap-2 text-left focus-visible:outline-2 focus-visible:outline-brand-primary"
            title={[txn.bank, txn.card].filter(Boolean).join(" · ")}
          >
            <span className="truncate text-sm font-medium text-text-primary">{txn.bank || "Credit card"}</span>
            {txn.card && <span className="shrink-0 font-mono text-xs text-text-secondary">{txn.card}</span>}
          </button>
          <span className="flex h-4 min-w-0 items-center gap-2 font-mono text-[10px] text-text-secondary">
            {txn.mobile && (
              <span className="inline-flex min-w-0 items-center" title={`Mobile ${txn.mobile}`}>
                <span className="truncate">{txn.mobile}</span>
                <CopyButton value={txn.mobile} label="mobile number" className="size-3.5" />
              </span>
            )}
            <span className="inline-flex min-w-0 items-center" title={`Transaction ID ${txn.id}`}>
              <span className="mr-1 font-sans text-[9px] uppercase tracking-wide">Txn</span>
              <span className="truncate">{shortCode(txn.id)}</span>
              <CopyButton value={txn.id} label="transaction ID" className="size-3.5" />
            </span>
          </span>
        </span>

        <span className="flex flex-col items-end text-right [&>span]:flex [&>span]:items-center [&>span]:justify-end">
          <span
            className={cn("h-5 whitespace-nowrap text-sm font-semibold tabular-nums", failed ? "text-text-secondary line-through" : "text-text-primary")}
            title={txn.totalDebited !== null ? `Total debited ${inr(txn.totalDebited)}` : undefined}
          >
            {inr(ccAmount(txn))}
          </span>
          <span className="h-5 gap-1.5">
            {txn.refund ? (
              // Refunded: the money (and the charges) went back, so say so instead of showing the fee.
              <span
                className="whitespace-nowrap text-[11px] font-medium text-sky-700"
                title={txn.refund.refundedAt ? `Refunded on ${when(txn.refund.refundedAt).full}` : "Refunded"}
              >
                ↩ Refunded
              </span>
            ) : (
              fee !== null &&
              fee > 0 && (
                <span className="whitespace-nowrap text-[11px] tabular-nums text-text-secondary" title="Charges + GST">
                  {inr(fee)}
                  <span className="hidden @md:inline"> fee</span>
                </span>
              )
            )}
            <StatusText className="px-1.5 @md:px-2">{txn.status}</StatusText>
          </span>
        </span>
      </div>
      {open && <TxnDetails txn={txn} />}
    </li>
  );
}

/** The sliding panel itself: a native <dialog> pinned to the right edge (opened in an effect, closed by unmounting). */
function Drawer({
  data,
  loading,
  error,
  onRefresh,
  onClose,
}: {
  data: CcTxnsResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const [viewId, setViewId] = useState("all");
  const [day, setDay] = useState("");
  const [bank, setBank] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_ROWS);

  const entries = useMemo(() => data?.entries ?? [], [data]);

  const bulAccounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of entries) if (t.bulAccount) counts.set(t.bulAccount, (counts.get(t.bulAccount) ?? 0) + 1);
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);
  const days = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const t of entries) {
      const w = when(t.createdAt);
      if (!w.key) continue;
      const entry = counts.get(w.key) ?? { label: w.isToday ? `Today, ${w.day}` : w.day, count: 0 };
      entry.count++;
      counts.set(w.key, entry);
    }
    return [...counts].sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);
  const banks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of entries) if (t.bank) counts.set(t.bank, (counts.get(t.bank) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const matchView = (t: CcTxn) => {
    if (viewId.startsWith(BUL_PREFIX)) return t.bulAccount === viewId.slice(BUL_PREFIX.length);
    return (STATUS_VIEWS.find((v) => v.id === viewId) ?? STATUS_VIEWS[0]).match(t);
  };
  const needle = squash(query);
  const visible = entries.filter(
    (t) =>
      matchView(t) &&
      (!day || when(t.createdAt).key === day) &&
      (!bank || t.bank === bank) &&
      (!needle ||
        [t.bank, t.card, t.mobile, t.id, t.reference, t.npciRef, t.fetchId, t.retailer, t.shop, t.bulAccount, String(ccAmount(t))].some((v) =>
          squash(v).includes(needle),
        )),
  );
  const successful = visible.filter((t) => t.status === "SUCCESS");
  const paid = successful.reduce((sum, t) => sum + ccAmount(t), 0);
  const fees = successful.reduce((sum, t) => sum + (ccFee(t) ?? 0), 0);

  const viewOptions: FilterOption[] = [
    ...STATUS_VIEWS.map((v) => ({ id: v.id, label: v.label, count: data ? entries.filter(v.match).length : null, alert: v.id === "failed" })),
    ...bulAccounts.map(([account, count]) => ({ id: `${BUL_PREFIX}${account}`, label: account, count, group: "BUL account" })),
  ];
  const resetPaging = () => {
    setShown(PAGE_ROWS);
    setOpenId(null);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cc-txns-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      // `open:flex`, not `flex`: a display class would override the browser's "hidden while closed" for a frame.
      className="@container my-0 mr-0 ml-auto h-dvh max-h-dvh w-full max-w-[min(100vw,36rem)] animate-drawer-in flex-col overflow-hidden open:flex border-0 bg-white p-0 shadow-2xl shadow-brand-navy/30 backdrop:animate-backdrop-in backdrop:bg-brand-navy/40 backdrop:backdrop-blur-[2px]"
    >
      {/* Header: title, when it was loaded, Refresh and Close. */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <CardIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="cc-txns-title" className="text-base font-bold tracking-tight text-text-primary">
              Bulkpe CC Txns
            </h2>
            <p className="truncate text-[11px] text-text-secondary">
              Credit-card bill payments
              {data && ` · updated ${when(data.updatedAt).time}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-border bg-white px-2.5 text-xs font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(loading && "animate-spin")} aria-hidden="true">
              <path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4" />
            </svg>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-brand-light hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar: status / BUL account, day and bank, then search. */}
      <div className="shrink-0 space-y-2 border-b border-brand-border px-4 py-2.5">
        <div className="grid grid-cols-3 gap-2">
          <FilterSelect
            id="cc-txns-view"
            label="Status or BUL account"
            value={viewId}
            onChange={(id) => {
              setViewId(id);
              resetPaging();
            }}
            disabled={!data}
            options={viewOptions}
          />
          <FilterSelect
            id="cc-txns-day"
            label="Day"
            value={day}
            onChange={(id) => {
              setDay(id);
              resetPaging();
            }}
            disabled={!data}
            options={[{ id: "", label: "All days", count: data ? entries.length : null }, ...days.map(([key, d]) => ({ id: key, label: d.label, count: d.count }))]}
          />
          <FilterSelect
            id="cc-txns-bank"
            label="Bank"
            value={bank}
            onChange={(id) => {
              setBank(id);
              resetPaging();
            }}
            disabled={!data}
            options={[{ id: "", label: "All banks", count: data ? entries.length : null }, ...banks.map(([name, count]) => ({ id: name, label: name, count }))]}
          />
        </div>
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <label htmlFor="cc-txns-search" className="sr-only">
            Search the credit-card payments
          </label>
          <input
            id="cc-txns-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPaging();
            }}
            placeholder="Search card, mobile, bank, txn ID, reference, amount"
            disabled={!data}
            className="h-9 w-full rounded-lg border border-brand-border bg-white pl-9 pr-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 disabled:bg-brand-light/50"
          />
        </div>
        {data && (
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-text-secondary">
            <span>
              <b className="font-semibold text-text-primary">{visible.length.toLocaleString("en-IN")}</b> payments
            </span>
            <span title="Successful payments in the list above">
              Paid <b className="font-semibold tabular-nums text-status-success">{inr(paid)}</b> · Charges{" "}
              <b className="font-semibold tabular-nums text-text-primary">{inr(Math.round(fees * 100) / 100)}</b>
            </span>
          </p>
        )}
      </div>

      {/* Notes: a failed refresh while a list is shown, or the vendor's last answer was partial. */}
      {(data?.warning || (data && error)) && (
        <p role="status" className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {error ? `${error} Showing the last list.` : data?.warning}
        </p>
      )}

      <div className="scrollbar-light min-h-0 flex-1 overflow-y-auto">
        {!data && loading && (
          <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading the credit-card payments">
            <p className="text-xs text-text-secondary">Fetching from the payments service… this can take up to half a minute.</p>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-brand-light/60" />
            ))}
          </div>
        )}

        {!data && !loading && error && (
          <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" onClick={onRefresh} className="mt-2 font-semibold text-brand-primary hover:text-brand-dark">
              Try again
            </button>
          </div>
        )}

        {data && visible.length === 0 && (
          <p className="px-6 py-12 text-center text-sm text-text-secondary">
            {entries.length === 0
              ? "The payments service sent no transactions. It sometimes answers empty right after another request — try Refresh in a minute."
              : "No payments match."}
          </p>
        )}

        {data && visible.length > 0 && (
          <>
            <ul className="divide-y divide-brand-border/70" aria-label="Credit-card payments">
              {visible.slice(0, shown).map((txn) => (
                <TxnRow key={txn.id} txn={txn} open={openId === txn.id} onToggle={() => setOpenId((id) => (id === txn.id ? null : txn.id))} />
              ))}
            </ul>
            {visible.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_ROWS)}
                className="h-10 w-full border-t border-brand-border text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-light"
              >
                Show more ({(visible.length - shown).toLocaleString("en-IN")} left)
              </button>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

/**
 * Admin page: a tab fixed to the right edge of the screen ("Bulkpe CC Txns") that slides open a panel listing the
 * Bulkpe credit-card bill payments (GET /api/dashboard/admin/cc-transactions). Admins only: the tab shows when the
 * stored profile says isAdmin, and the route checks the session cookie. The list is loaded when the drawer opens
 * (again if the last load is over a minute old) and with Refresh — not every 30 s, because the vendor answers
 * repeated calls with part of the list or none. It is kept while the drawer is closed.
 */
export function CcTxnsDrawer() {
  const raw = useSyncExternalStore(subscribeDemoSession, readDemoSessionRaw, () => undefined);
  const isAdmin = parseDemoSession(raw)?.isAdmin === true;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CcTxnsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedAt = useRef(0);
  const loadingRef = useRef(false);

  async function load() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const result = await loadCcTxns();
    if (result.ok) {
      setData(result.data);
      loadedAt.current = Date.now();
    } else {
      setError(result.message);
    }
    loadingRef.current = false;
    setLoading(false);
  }

  function openDrawer() {
    setOpen(true);
    if (!data || Date.now() - loadedAt.current > RELOAD_AFTER_MS) void load();
  }

  if (!isAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        aria-haspopup="dialog"
        title="Bulkpe credit-card transactions"
        className="group fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl bg-brand-gradient py-3 pl-2 pr-1.5 text-white shadow-lg shadow-brand-navy/30 transition-[padding] duration-200 hover:pr-3 focus-visible:pr-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <CardIcon className="size-4 shrink-0" />
        <span className="rotate-180 text-xs font-semibold tracking-wide [writing-mode:vertical-rl]">Bulkpe CC Txns</span>
        <svg className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      {open && <Drawer data={data} loading={loading} error={error} onRefresh={() => void load()} onClose={() => setOpen(false)} />}
    </>
  );
}
