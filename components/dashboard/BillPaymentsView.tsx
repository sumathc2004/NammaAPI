"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { BillDisputesPanel } from "@/components/dashboard/BillDisputesPanel";
import { ReportView } from "@/components/dashboard/ReportView";
import { hasPageRole } from "@/lib/auth/adminAccess";
import { parseDemoSession, readDemoSessionRaw, subscribeDemoSession } from "@/lib/auth/demoSession";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "payments", label: "Bill payments" },
  { id: "disputes", label: "Disputes" },
] as const;

/**
 * The Bill Payments page. Everyone gets the report; admins and accountants also get a **Disputes** tab (the disputes
 * retailers raised on their bill payments, with Resolve). The tab is UI only — its API routes check the role on the
 * server. Both tabs stay mounted so switching keeps their state.
 */
export function BillPaymentsView() {
  const raw = useSyncExternalStore(subscribeDemoSession, readDemoSessionRaw, () => undefined);
  const canSeeDisputes = useMemo(() => hasPageRole(parseDemoSession(raw), "adminOrAccountant"), [raw]);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("payments");

  if (!canSeeDisputes) return <ReportView section="bill-payments" />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div role="tablist" aria-label="Bill payments" className="flex w-fit items-center gap-0.5 rounded-lg border border-brand-border bg-white p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
              tab === t.id ? "bg-brand-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col", tab !== "payments" && "hidden")}>
        <ReportView section="bill-payments" />
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col", tab !== "disputes" && "hidden")}>
        <BillDisputesPanel />
      </div>
    </div>
  );
}
