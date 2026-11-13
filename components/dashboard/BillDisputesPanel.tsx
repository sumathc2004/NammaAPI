"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { StatusText, type StatusTone } from "@/components/dashboard/StatusText";
import { DISPUTE_FILTERS, disputeView, isOpenDispute, type DisputeRow } from "@/lib/admin/disputes";
import { formatDate } from "@/lib/reports/table";
import { cn } from "@/lib/cn";

type Request = { status: string; nonce: number };
type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; rows: DisputeRow[] };

async function loadDisputes(status: string): Promise<LoadState> {
  try {
    const response = await fetch(`/api/dashboard/bill-payments/disputes?status=${encodeURIComponent(status)}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.rows)) {
      return { status: "error", message: data?.error || "We couldn't load the disputes. Please try again." };
    }
    return { status: "ready", rows: data.rows };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }
}

const tone = (status: string): StatusTone => (isOpenDispute(status) ? "pending" : /resolv|clos|done/i.test(status) ? "success" : "neutral");

function Refs({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className="inline-flex min-w-0 items-center font-mono text-[11px] text-text-secondary" title={`${label} ${value}`}>
      <span className="mr-1 font-sans text-[9px] uppercase tracking-wide">{label}</span>
      <span className="truncate">{value}</span>
      <CopyButton value={value} label={label} className="size-3.5" />
    </span>
  );
}

/**
 * Admin and accountant view on the Bill Payments page: the disputes retailers raised on their bill payments
 * (vendor bill/getDisputes, every retailer's), newest first as the vendor sends them, with a Resolve action
 * (vendor bill/updateDispute). Loads when opened, when the filter changes and with Refresh.
 */
export function BillDisputesPanel() {
  const [request, setRequest] = useState<Request>({ status: "OPEN", nonce: 0 });
  const [loaded, setLoaded] = useState<{ request: Request; state: LoadState } | null>(null);
  const state = useMemo<LoadState>(() => (loaded && loaded.request === request ? loaded.state : { status: "loading" }), [loaded, request]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [resolving, setResolving] = useState<DisputeRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadDisputes(request.status).then((next) => {
      if (!cancelled) setLoaded({ request, state: next });
    });
    return () => {
      cancelled = true;
    };
  }, [request]);

  const rows = useMemo(() => (state.status === "ready" ? state.rows : []), [state]);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(needle)));
  }, [rows, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-brand-border px-4 py-3">
        <FilterSelect
          id="dispute-status"
          label="Dispute status"
          value={request.status}
          options={DISPUTE_FILTERS}
          onChange={(status) => {
            setRequest((r) => ({ status, nonce: r.nonce + 1 }));
            setOpen(null);
          }}
          className="w-36"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search disputes"
          aria-label="Search disputes"
          className="h-9 min-w-0 flex-1 rounded-lg border border-brand-border bg-white px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 md:w-64 md:flex-none"
        />
        <p className="ml-auto text-xs tabular-nums text-text-secondary">
          {state.status === "ready" ? `${shown.length.toLocaleString("en-IN")} dispute${shown.length === 1 ? "" : "s"}` : ""}
        </p>
        <button
          type="button"
          onClick={() => setRequest((r) => ({ status: r.status, nonce: r.nonce + 1 }))}
          disabled={state.status === "loading"}
          className="h-9 rounded-lg border border-brand-border bg-white px-3 text-sm font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {notice && (
        <p role="status" className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="scrollbar-light min-h-0 flex-1 overflow-y-auto">
        {state.status === "loading" && (
          <div className="space-y-2 p-5" aria-busy="true" aria-label="Loading the disputes">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-brand-light/60" />
            ))}
          </div>
        )}
        {state.status === "error" && (
          <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </p>
        )}
        {state.status === "ready" && shown.length === 0 && (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">
            {rows.length === 0 ? "No disputes here yet." : "No disputes match your search."}
          </p>
        )}
        {state.status === "ready" && shown.length > 0 && (
          <>
            {/* From lg: a table with fixed column widths (nothing scrolls sideways; long text wraps). */}
            <table className="hidden w-full table-fixed text-left text-sm lg:table">
              <thead>
                <tr className="border-b border-brand-border bg-brand-light/50 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  <th scope="col" className="w-[11%] px-4 py-2.5">
                    Raised
                  </th>
                  <th scope="col" className="w-[11%] px-2 py-2.5">
                    Retailer
                  </th>
                  <th scope="col" className="w-[17%] px-2 py-2.5">
                    Reference
                  </th>
                  <th scope="col" className="w-[20%] px-2 py-2.5">
                    Reason
                  </th>
                  <th scope="col" className="w-[18%] px-2 py-2.5">
                    Admin remarks
                  </th>
                  <th scope="col" className="w-[9%] px-2 py-2.5 text-center">
                    Status
                  </th>
                  <th scope="col" className="w-[14%] px-4 py-2.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              {shown.map((row, i) => {
                const v = disputeView(row);
                const expanded = open === i;
                const raisedAt = v.createdAt ? formatDate(v.createdAt) : "";
                const split = raisedAt.lastIndexOf(", ");
                return (
                  <tbody key={`${v.id}-${i}`} className="border-b border-brand-border/70 last:border-b-0">
                    <tr className="align-top">
                      <td className="px-4 py-3 tabular-nums text-text-primary">
                        {raisedAt ? (
                          split < 0 ? (
                            raisedAt
                          ) : (
                            <>
                              <span className="block whitespace-nowrap font-semibold">{raisedAt.slice(0, split)}</span>
                              <span className="block text-xs text-text-secondary">{raisedAt.slice(split + 2)}</span>
                            </>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-medium tabular-nums text-text-primary">{v.userName || "—"}</p>
                        {v.id && <p className="text-xs text-text-secondary">#{v.id}</p>}
                      </td>
                      <td className="px-2 py-3">
                        {v.billPaidRefNo ? (
                          <span className="inline-flex max-w-full items-center font-mono text-[11px] text-text-primary">
                            <span className="break-all">{v.billPaidRefNo}</span>
                            <CopyButton value={v.billPaidRefNo} label="Reference" className="size-3.5 shrink-0" />
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="break-words px-2 py-3 text-text-primary">{v.reason || "—"}</td>
                      <td className="px-2 py-3 text-xs text-text-secondary">
                        {v.adminRemarks ? <p className="break-words text-sm text-text-primary">{v.adminRemarks}</p> : "—"}
                        {v.resolvedAt && <p className="mt-0.5 tabular-nums">Resolved {formatDate(v.resolvedAt)}</p>}
                      </td>
                      <td className="px-2 py-3 text-center">{v.status ? <StatusText tone={tone(v.status)}>{v.status}</StatusText> : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {isOpenDispute(v.status) && v.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotice(null);
                                setResolving(row);
                              }}
                              className="rounded-md bg-brand-gradient px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setOpen(expanded ? null : i)}
                            aria-expanded={expanded}
                            className="text-[11px] font-medium text-brand-primary hover:underline"
                          >
                            {expanded ? "Hide fields" : "All fields"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={7} className="px-4 pb-3">
                          <dl className="grid gap-x-6 gap-y-1 rounded-lg bg-brand-light/50 p-3 text-xs sm:grid-cols-2">
                            {Object.entries(row)
                              .filter(([key]) => !/^uniqueid$/i.test(key.replace(/[^a-z0-9]/gi, "")))
                              .map(([key, value]) => (
                                <div key={key} className="flex min-w-0 justify-between gap-3">
                                  <dt className="shrink-0 text-text-secondary">{key}</dt>
                                  <dd className="min-w-0 truncate text-right font-mono text-text-primary" title={value}>
                                    {value || "—"}
                                  </dd>
                                </div>
                              ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </table>

            {/* Below lg: one card per dispute. */}
            <ul className="divide-y divide-brand-border/70 lg:hidden" aria-label="Bill payment disputes">
              {shown.map((row, i) => {
                const v = disputeView(row);
                const expanded = open === i;
                return (
                  <li key={`${v.id}-${i}`} className="px-4 py-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 md:grid-cols-[9rem_minmax(0,1fr)_auto]">
                      <p className="col-span-2 text-[13px] font-semibold tabular-nums text-text-primary md:col-span-1">
                        {v.createdAt ? formatDate(v.createdAt) : v.id ? `Dispute #${v.id}` : "—"}
                      </p>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {v.userName || "—"}
                          {v.id && <span className="ml-2 text-[11px] font-normal text-text-secondary">#{v.id}</span>}
                        </p>
                        {v.reason && <p className="mt-0.5 text-sm text-text-secondary">{v.reason}</p>}
                        <span className="mt-1 flex flex-wrap items-center gap-x-3">
                          <Refs label="Ref" value={v.billPaidRefNo} />
                        </span>
                        {(v.adminRemarks || v.resolvedAt) && (
                          <p className="mt-1 text-xs text-text-secondary">
                            {v.adminRemarks && (
                              <>
                                <span className="font-semibold text-text-primary">Remarks:</span> {v.adminRemarks}
                              </>
                            )}
                            {v.resolvedAt && <span className="ml-2 tabular-nums">· Resolved {formatDate(v.resolvedAt)}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {v.status && <StatusText tone={tone(v.status)}>{v.status}</StatusText>}
                        {isOpenDispute(v.status) && v.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setNotice(null);
                              setResolving(row);
                            }}
                            className="rounded-md bg-brand-gradient px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : i)}
                          aria-expanded={expanded}
                          className="text-[11px] font-medium text-brand-primary hover:underline"
                        >
                          {expanded ? "Hide fields" : "All fields"}
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <dl className="mt-3 grid gap-x-6 gap-y-1 rounded-lg bg-brand-light/50 p-3 text-xs sm:grid-cols-2">
                        {Object.entries(row)
                          .filter(([key]) => !/^uniqueid$/i.test(key.replace(/[^a-z0-9]/gi, "")))
                          .map(([key, value]) => (
                          <div key={key} className="flex min-w-0 justify-between gap-3">
                            <dt className="shrink-0 text-text-secondary">{key}</dt>
                            <dd className="min-w-0 truncate text-right font-mono text-text-primary" title={value}>
                              {value || "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {resolving && (
        <ResolveDialog
          row={resolving}
          onClose={() => setResolving(null)}
          onDone={(message) => {
            setResolving(null);
            setNotice(message);
            setRequest((r) => ({ status: r.status, nonce: r.nonce + 1 }));
          }}
        />
      )}
    </div>
  );
}

/** Asks for the admin's remarks, then marks the dispute RESOLVED (vendor bill/updateDispute). */
function ResolveDialog({ row, onClose, onDone }: { row: DisputeRow; onClose: () => void; onDone: (message: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const v = disputeView(row);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!remarks.trim()) {
      setError("Write the remarks first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/bill-payments/disputes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(v.id), adminRemarks: remarks.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) onDone(data.message || "Dispute resolved.");
      else setError(data?.error || "The dispute could not be updated.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && !busy) onClose();
      }}
      aria-labelledby="resolve-dispute-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm animate-dialog-in rounded-2xl border border-brand-border bg-white p-5 shadow-2xl shadow-brand-navy/30 backdrop:animate-backdrop-in backdrop:bg-brand-navy/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit}>
        <h2 id="resolve-dispute-title" className="text-base font-semibold text-text-primary">
          Resolve dispute #{v.id}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {v.userName && <>{v.userName} · </>}
          {v.reason || "No reason given"}
        </p>
        <label htmlFor="dispute-remarks" className="mt-4 block text-sm font-medium text-text-primary">
          Remarks for the retailer
        </label>
        <textarea
          id="dispute-remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="e.g. Refunded"
          className="mt-1.5 w-full resize-none rounded-lg border border-brand-border px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-brand-border bg-white py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-brand-light disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={cn("flex-1 rounded-lg bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110", busy && "opacity-60")}
          >
            {busy ? "Resolving…" : "Mark resolved"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
