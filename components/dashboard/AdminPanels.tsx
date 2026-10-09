"use client";

import { useState } from "react";
import { PgTallyView } from "@/components/dashboard/PgTallyView";
import { ReportView } from "@/components/dashboard/ReportView";
import { cn } from "@/lib/cn";

const PANELS = [
  { id: "pg", label: "PG Tally" },
  { id: "transfer", label: "Transfer Reports" },
] as const;
type PanelId = (typeof PANELS)[number]["id"];

/**
 * Admin page: PG Tally and the compact Transfer Reports side by side on wide screens (xl). Below that,
 * a switch shows one at a time, so phones get one list that scrolls with the page instead of two
 * stacked panels with their own scroll boxes. Both stay mounted, so switching keeps their state.
 */
export function AdminPanels() {
  const [active, setActive] = useState<PanelId>("pg");

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Admin reports"
        className="flex h-10 items-center gap-0.5 rounded-lg border border-brand-border bg-white p-0.5 xl:hidden"
      >
        {PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            aria-selected={active === panel.id}
            onClick={() => setActive(panel.id)}
            className={cn(
              "flex h-full flex-1 items-center justify-center rounded-md text-sm font-semibold transition-colors",
              active === panel.id ? "bg-brand-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {panel.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className={cn("min-w-0", active !== "pg" && "hidden xl:block")}>
          <PgTallyView />
        </div>
        {/* Fixed height (rows scroll inside) from tablet up; phones let the panel size itself. */}
        <div className={cn("min-w-0 md:h-[40rem] xl:h-[44rem]", active !== "transfer" && "hidden xl:block")}>
          <ReportView section="transfer" compact columnLayout="admin-transfer" />
        </div>
      </div>
    </div>
  );
}
