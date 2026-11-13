"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { StatusText } from "@/components/dashboard/StatusText";
import { formatAmount, formatDate } from "@/lib/reports/table";

type PaymentDetails = { npciRef: string; amount: string; dateTime: string; bankName: string; cardLast4: string; mobileNumber: string; status: string };
export type PaymentPopup =
  | { status: "pending"; reference: string }
  | { status: "ok"; reference: string; payment: PaymentDetails }
  | { status: "error"; reference: string; error: string };

/** The refresh icon's popup (Bill Payments, beside Raise dispute): the live status of a bill payment (vendor bill/getPaymentStatusByRef). The transaction id is never shown. */
export function PaymentStatusDialog({
  popup,
  onClose,
  onRefund,
}: {
  popup: PaymentPopup;
  onClose: () => void;
  /** Given only to admins and accountants: asks the server to refund this payment (vendor bill/refund). */
  onRefund?: () => Promise<{ ok: boolean; message: string }>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [refund, setRefund] = useState<{ step: "idle" | "confirm" | "busy" | "done" | "error"; message?: string }>({ step: "idle" });
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  const p = popup.status === "ok" ? popup.payment : null;
  const row = (label: string, value: ReactNode) => (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-text-primary">{value}</dd>
    </div>
  );

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="payment-status-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm animate-dialog-in rounded-2xl border border-brand-border bg-white p-5 shadow-2xl shadow-brand-navy/30 backdrop:animate-backdrop-in backdrop:bg-brand-navy/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="payment-status-title" className="text-base font-semibold text-text-primary">
          {popup.status === "pending" ? "Checking the status…" : popup.status === "ok" ? "Payment status" : "Couldn’t check the status"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-brand-light hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {popup.status === "pending" && <p className="mt-4 text-sm text-text-secondary">Asking the payments service for the latest status…</p>}
      {popup.status === "error" && <p className="mt-4 text-sm text-red-600">{popup.error}</p>}
      {p && (
        <dl className="mt-4 space-y-2.5 text-sm">
          {row("Amount", <span className="text-base font-bold tabular-nums">{p.amount ? formatAmount(p.amount) : "—"}</span>)}
          {row("Status", p.status ? <StatusText>{p.status}</StatusText> : "—")}
          {row("Bank", p.bankName || "—")}
          {row("Card", p.cardLast4 ? `•••• ${p.cardLast4}` : "—")}
          {row("Mobile", <span className="tabular-nums">{p.mobileNumber || "—"}</span>)}
          {row("Time", <span className="tabular-nums">{p.dateTime ? formatDate(p.dateTime) : "—"}</span>)}
          {row(
            "NPCI ref",
            p.npciRef ? (
              <span className="inline-flex min-w-0 items-center font-mono text-xs">
                <span className="truncate">{p.npciRef}</span>
                <CopyButton value={p.npciRef} label="NPCI ref" className="size-4" />
              </span>
            ) : (
              "—"
            ),
          )}
          {popup.reference && (
            <div className="border-t border-brand-border/70 pt-2.5">
              {row(
                "Bill reference",
                <span className="inline-flex min-w-0 items-center font-mono text-xs">
                  <span className="truncate">{popup.reference}</span>
                  <CopyButton value={popup.reference} label="Bill reference" className="size-4" />
                </span>,
              )}
            </div>
          )}
        </dl>
      )}

      {p && onRefund && p.status.trim().toUpperCase() === "FAILED" && (
        <div className="mt-5">
          {refund.step === "done" ? (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {refund.message}
            </p>
          ) : (
            <>
              {refund.step === "error" && (
                <p role="alert" className="mb-2 text-sm text-red-600">
                  {refund.message}
                </p>
              )}
              {refund.step === "confirm" && (
                <p className="mb-2 text-sm text-text-primary">
                  Refund <span className="font-semibold tabular-nums">{p.amount ? formatAmount(p.amount) : "this payment"}</span> to the retailer&apos;s wallet?
                </p>
              )}
              <div className="flex gap-2">
                {refund.step === "confirm" && (
                  <button
                    type="button"
                    onClick={() => setRefund({ step: "idle" })}
                    className="flex-1 rounded-lg border border-brand-border bg-white py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-brand-light"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={refund.step === "busy"}
                  onClick={async () => {
                    if (refund.step !== "confirm") {
                      setRefund({ step: "confirm" });
                      return;
                    }
                    setRefund({ step: "busy" });
                    const result = await onRefund();
                    setRefund({ step: result.ok ? "done" : "error", message: result.message });
                  }}
                  className="flex-1 rounded-lg bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                >
                  {refund.step === "busy" ? "Refunding…" : refund.step === "confirm" ? "Yes, refund" : "Refund"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
