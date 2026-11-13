"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PaymentStatusDialog, type PaymentPopup } from "@/components/dashboard/PaymentStatusDialog";
import { StatusText, type StatusTone } from "@/components/dashboard/StatusText";
import { disputeView, isOpenDispute, type DisputeRow, type DisputeView } from "@/lib/admin/disputes";
import { formatAmount, type ReportRow } from "@/lib/reports/table";
import { cn } from "@/lib/cn";

/**
 * The bill payment disputes the signed-in account can see (its own; an admin or accountant gets every retailer's),
 * keyed by the bill payment's transaction id (`UniqueId`), so the Bill Payments table can show a status chip instead
 * of the Raise dispute button. Loaded once the page opens and again after a dispute is raised.
 */
export function useBillDisputes(enabled: boolean) {
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/dashboard/bill-payments/disputes?status=ALL", { cache: "no-store" })
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.rows)) setRows(data.rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, nonce]);

  const byTxn = useMemo(() => {
    const map = new Map<string, DisputeView>();
    for (const row of rows) {
      const v = disputeView(row);
      if (v.uniqueId && !map.has(v.uniqueId)) map.set(v.uniqueId, v);
    }
    return map;
  }, [rows]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { byTxn, reload };
}

const tone = (status: string): StatusTone => (isOpenDispute(status) ? "pending" : /resolv|clos|done/i.test(status) ? "success" : "neutral");

/**
 * What the Dispute column shows for a bill payment: the dispute's status when there is one, else the Raise button,
 * with a round refresh icon beside it that asks the vendor for the payment's live status (bill/getPaymentStatusByRef)
 * and shows it in a popup. The transaction id is sent to the server but never shown.
 */
export function DisputeCell({ row, dispute, onRaise }: { row: ReportRow; dispute: DisputeView | undefined; onRaise: (row: ReportRow) => void }) {
  const [popup, setPopup] = useState<PaymentPopup | null>(null);
  const uniqueId = row.UniqueId;
  const reference = row.billPaidRefNo ?? "";
  if (!uniqueId) return null;

  async function check() {
    setPopup({ status: "pending", reference });
    try {
      const response = await fetch("/api/dashboard/bill-payments/disputes/payment-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uniqueId }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok && data.payment) setPopup({ status: "ok", reference, payment: data.payment });
      else setPopup({ status: "error", reference, error: data?.error || "The status could not be checked." });
    } catch {
      setPopup({ status: "error", reference, error: "Network error. Check your connection and try again." });
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {dispute ? (
        <StatusText tone={tone(dispute.status)} title={dispute.adminRemarks ? `Remarks: ${dispute.adminRemarks}` : dispute.reason || undefined}>
          {dispute.status ? `Dispute ${dispute.status.toLowerCase()}` : "Disputed"}
        </StatusText>
      ) : (
        <button
          type="button"
          onClick={() => onRaise(row)}
          className="whitespace-nowrap rounded-md border border-brand-border px-2 py-1 text-xs font-medium text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-light"
        >
          Raise dispute
        </button>
      )}
      <button
        type="button"
        onClick={check}
        disabled={popup?.status === "pending"}
        aria-label="Check the live payment status"
        title="Check the live payment status"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-brand-border bg-white text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-light disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5" />
          <path d="M18 3v5h-5M6 21v-5h5" />
        </svg>
      </button>
      {popup && <PaymentStatusDialog popup={popup} onClose={() => setPopup(null)} />}
    </span>
  );
}

/** Asks what went wrong with one bill payment, then raises the dispute (vendor bill/raiseDispute). */
export function RaiseDisputeDialog({ row, onClose, onRaised }: { row: ReportRow; onClose: () => void; onRaised: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (reason.trim().length < 5) {
      setError("Please describe the problem.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/bill-payments/disputes/raise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `userName` is only honoured for admins and accountants (their rows are other retailers'); the server uses the session's otherwise.
        body: JSON.stringify({ uniqueId: row.UniqueId, billPaidRefNo: row.billPaidRefNo ?? "", reason: reason.trim(), userName: row.username ?? "" }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) {
        setDone(data.message || "Dispute raised.");
        onRaised();
      } else {
        setError(data?.error || "The dispute could not be raised.");
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const summary = [row.biller, row.amount ? formatAmount(row.amount) : "", row.billPaidRefNo].filter(Boolean).join(" · ");

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
      aria-labelledby="raise-dispute-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm animate-dialog-in rounded-2xl border border-brand-border bg-white p-5 shadow-2xl shadow-brand-navy/30 backdrop:animate-backdrop-in backdrop:bg-brand-navy/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit}>
        <h2 id="raise-dispute-title" className="text-base font-semibold text-text-primary">
          {done ? "Dispute raised" : "Raise a dispute"}
        </h2>
        {summary && <p className="mt-1 text-sm text-text-secondary">{summary}</p>}

        {done ? (
          <>
            <p className="mt-4 text-sm text-text-primary">{done}</p>
            <p className="mt-1.5 text-xs text-text-secondary">You&apos;ll see its status on this bill payment.</p>
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-lg bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110">
              Close
            </button>
          </>
        ) : (
          <>
            <label htmlFor="dispute-reason" className="mt-4 block text-sm font-medium text-text-primary">
              What went wrong?
            </label>
            <textarea
              id="dispute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="e.g. Amount debited but bill not paid"
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
                {busy ? "Raising…" : "Raise dispute"}
              </button>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
}
