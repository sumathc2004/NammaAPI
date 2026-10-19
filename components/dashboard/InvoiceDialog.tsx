"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { MONTHS, inr, num, type InvoiceRow } from "@/lib/filing/invoices";

/**
 * One invoice, shown in a native modal. Opened with showModal() in an effect and closed by the parent
 * unmounting it (no close() in the cleanup: React's dev double-mount would dismiss it instantly).
 */
export function InvoiceDialog({ invoice, onClose }: { invoice: InvoiceRow; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const total = num(invoice.TotalAmount);
  const gst = num(invoice.GST);
  const net = num(invoice.NetAmount);
  const pgCharge = num(invoice.PgCharge);
  const pgGst = num(invoice.PgGST);
  const payoutCharge = num(invoice.PayoutCharge);
  const payoutGst = num(invoice.PayoutGST);
  const period = `${MONTHS[num(invoice.Month) - 1] ?? invoice.Month} ${invoice.Year}`;

  // Charges include GST: the taxable value of a line is its charge minus its GST.
  const lines = [
    { name: "Payment gateway charges", qty: invoice.PgQuantity, charge: pgCharge, gst: pgGst },
    { name: "Payout charges", qty: invoice.PayoutQuantity, charge: payoutCharge, gst: payoutGst },
  ];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="invoice-title"
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl border border-brand-border bg-white p-0 text-text-primary shadow-2xl backdrop:bg-brand-navy/50"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Invoice</p>
            <h2 id="invoice-title" className="mt-1 text-xl font-bold">
              {invoice.InvoiceNumber}
            </h2>
          </div>
          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-text-primary">
            {invoice.Status || "—"}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-text-secondary">Billed to</dt>
            <dd className="mt-0.5 font-medium">{invoice.StoreName || invoice.UserName}</dd>
            {invoice.ContactPerson && <dd className="text-text-secondary">{invoice.ContactPerson}</dd>}
            <dd className="text-text-secondary">{invoice.UserName}</dd>
            {invoice.StoreAddress && <dd className="mt-1 text-text-secondary">{invoice.StoreAddress}</dd>}
          </div>
          <div>
            <dt className="text-xs text-text-secondary">Billing period</dt>
            <dd className="mt-0.5 font-medium">{period}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-secondary">Transaction amount</dt>
            <dd className="mt-0.5 font-medium">{inr(num(invoice.TransactionAmount))}</dd>
          </div>
        </dl>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-brand-border text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">Description</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Qty</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Taxable</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">GST</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {lines.map((l) => (
                <tr key={l.name}>
                  <td className="py-2.5 pr-3">{l.name}</td>
                  <td className="px-3 py-2.5 text-right">{l.qty}</td>
                  <td className="px-3 py-2.5 text-right">{inr(l.charge - l.gst)}</td>
                  <td className="px-3 py-2.5 text-right">{inr(l.gst)}</td>
                  <td className="py-2.5 pl-3 text-right">{inr(l.charge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Net amount</dt>
            <dd>{inr(net)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">GST</dt>
            <dd>{inr(gst)}</dd>
          </div>
          <div className="flex justify-between border-t border-brand-border pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{inr(total)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </dialog>
  );
}
