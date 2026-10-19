"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DEFAULT_DASHBOARD_PATH, getDashboardSection } from "@/lib/data/dashboardNav";
import { InvoiceDialog } from "@/components/dashboard/InvoiceDialog";
import { MONTHS, financialYear, inr, lastMonth, num, toInvoicesCsv, type InvoiceRow } from "@/lib/filing/invoices";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: InvoiceRow[]; label: string };

const selectClasses =
  "h-10 rounded-lg border border-brand-border bg-white px-3 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20";

/** Sum of a numeric field over the rows, rounded to paise so float noise doesn't show. */
function sum(rows: InvoiceRow[], key: string): number {
  return Math.round(rows.reduce((total, r) => total + num(r[key]), 0) * 100) / 100;
}

/** Filing page: pick a month and year, press Get, see that month's invoices. */
export function FilingView() {
  const section = getDashboardSection("filing");
  const now = new Date();
  const previous = lastMonth(now);
  const [month, setMonth] = useState(previous.month);
  const [year, setYear] = useState(previous.year);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [viewing, setViewing] = useState<InvoiceRow | null>(null);
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const fy = financialYear(month, year);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  function exportExcel(rows: InvoiceRow[]) {
    // The byte order mark makes Excel read the file as UTF-8 (so ₹ and names aren't garbled).
    const blob = new Blob(["﻿", toInvoicesCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const first = rows[0];
    link.download = `invoices_${first.Year}-${String(num(first.Month)).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function generate() {
    const label = `${MONTHS[month - 1]} ${year}`;
    if (!window.confirm(`Generate the missing invoices for ${label}?`)) return;
    setGenerating(true);
    setNotice(null);
    try {
      const response = await fetch("/api/dashboard/filing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setNotice({ tone: "error", text: data?.error || "We couldn't generate the invoices. Please try again." });
        return;
      }
      const text =
        data.created > 0
          ? `Generated ${data.created} ${data.created === 1 ? "invoice" : "invoices"} for ${label}${data.lastInvoice ? ` (last: ${data.lastInvoice})` : ""}.`
          : `No missing invoices for ${label}.`;
      setNotice({ tone: "ok", text });
      void get();
    } catch {
      setNotice({ tone: "error", text: "Network error. Check your connection and try again." });
    } finally {
      setGenerating(false);
    }
  }

  async function get() {
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/dashboard/filing?month=${month}&year=${year}&fy=${fy}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data?.rows)) {
        setState({ status: "error", message: data?.error || "We couldn't load the invoices. Please try again." });
        return;
      }
      const rows = [...(data.rows as InvoiceRow[])].sort((x, y) =>
        (x.InvoiceNumber ?? "").localeCompare(y.InvoiceNumber ?? "", undefined, { numeric: true }),
      );
      setState({ status: "ready", rows, label: `${MONTHS[month - 1]} ${year}` });
    } catch {
      setState({ status: "error", message: "Network error. Check your connection and try again." });
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="text-xs font-medium text-text-secondary">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href={DEFAULT_DASHBOARD_PATH} className="hover:text-brand-primary">
                Dashboard
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-text-primary">
              {section.label}
            </li>
          </ol>
        </nav>
        <Button size="sm" onClick={generate} disabled={generating}>
          {generating ? "Generating…" : "Generate"}
        </Button>
      </div>
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-3 rounded-lg border px-4 py-2.5 text-sm ${
            notice.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {notice.text}
        </p>
      )}

      <form
        className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-brand-border bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void get();
        }}
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Month
          <select className={selectClasses} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Year
          <select className={selectClasses} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Financial year
          <span className="flex h-10 items-center rounded-lg bg-brand-light px-3 text-sm font-semibold text-text-primary">
            {fy}
          </span>
        </div>
        <Button type="submit" size="sm" disabled={state.status === "loading"}>
          {state.status === "loading" ? "Getting…" : "Get"}
        </Button>
        {state.status === "ready" && (
          <dl className="ml-2 flex flex-wrap items-stretch gap-3 border-l border-brand-border pl-5" aria-label={`Summary for ${state.label}`}>
            {[
              { label: "Invoices", value: state.rows.length.toLocaleString("en-IN") },
              { label: "Net amount", value: inr(sum(state.rows, "NetAmount")) },
              { label: "GST", value: inr(sum(state.rows, "GST")) },
            ].map((item) => (
              <div key={item.label} className="min-w-28 rounded-lg bg-brand-light px-3.5 py-1.5">
                <dt className="text-xs text-text-secondary">{item.label}</dt>
                <dd className="text-sm font-bold text-text-primary">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {state.status === "ready" && state.rows.length > 0 && (
          <Button type="button" size="sm" className="ml-auto" onClick={() => exportExcel(state.rows)}>
            Export Excel
          </Button>
        )}
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-brand-border bg-white">
        {state.status === "idle" && (
          <p className="px-6 py-16 text-center text-sm text-text-secondary">Choose a month and press Get.</p>
        )}
        {state.status === "loading" && (
          <p role="status" className="px-6 py-16 text-center text-sm text-text-secondary">
            Loading invoices…
          </p>
        )}
        {state.status === "error" && (
          <p role="alert" className="px-6 py-16 text-center text-sm text-red-700">
            {state.message}
          </p>
        )}
        {state.status === "ready" && state.rows.length === 0 && (
          <p className="px-6 py-16 text-center text-sm text-text-secondary">No invoices for {state.label}.</p>
        )}
        {state.status === "ready" && state.rows.length > 0 && (
          <>
            <p className="border-b border-brand-border px-4 py-3 text-sm font-medium text-text-primary">
              {state.rows.length} {state.rows.length === 1 ? "invoice" : "invoices"} · {state.label}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-light text-xs uppercase tracking-wide text-text-secondary">
                  <tr>
                    {["Invoice", "Store", "Month","Transaction amount", "Net amount", "GST", "Total", "Status", ""].map((h, k) => (
                      <th key={k} scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold">
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {state.rows.map((row, i) => (
                    <tr key={row.InvoiceNumber || i}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{row.InvoiceNumber || "—"}</td>
                      <td className="px-4 py-2.5">{row.StoreName || row.UserName || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {MONTHS[num(row.Month) - 1] ?? row.Month} {row.Year}
                      </td>
                      <td className="px-4 py-2.5">{inr(num(row.TransactionAmount))}</td>
                      <td className="px-4 py-2.5">{inr(num(row.NetAmount))}</td>
                      <td className="px-4 py-2.5">{inr(num(row.GST))}</td>
                      <td className="px-4 py-2.5 font-semibold">{inr(num(row.TotalAmount))}</td>
                      <td className="px-4 py-2.5">{row.Status || "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="secondary" size="sm" onClick={() => setViewing(row)}>
                          View invoice
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {viewing && <InvoiceDialog invoice={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
