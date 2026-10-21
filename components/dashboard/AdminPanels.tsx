"use client";

import { useState } from "react";
import { BulkpeStatementView } from "@/components/dashboard/BulkpeStatementView";
import { PgTallyView } from "@/components/dashboard/PgTallyView";
import { ReportView } from "@/components/dashboard/ReportView";
import { cn } from "@/lib/cn";

const PANELS = [
  { id: "pg", label: "PG Tally" },
  { id: "bulkpe", label: "Bulkpe" },
  { id: "transfer", label: "Transfers" },
] as const;
type PanelId = (typeof PANELS)[number]["id"];

/**
 * Admin page panels:
 * - 2xl: three columns — PG Tally | Bulkpe Statement | Transfer Reports — filling the rest of the
 *   screen (the page is one screen tall; each panel scrolls inside), never shorter than 22rem.
 * - xl: PG Tally and Transfer Reports side by side, the Bulkpe statement full width below; fixed
 *   heights, the page scrolls.
 * - Below xl: a switch shows one at a time, so phones get one list that scrolls with the page
 *   instead of stacked panels with their own scroll boxes.
 * All stay mounted, so switching keeps their state.
 */
export function AdminPanels() {
  const [active, setActive] = useState<PanelId>("pg");

  return (
    <div className="flex flex-col gap-3 2xl:min-h-0 2xl:flex-1">
      <div
        role="tablist"
        aria-label="Admin reports"
        className="flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-brand-border bg-white p-0.5 xl:hidden"
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

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2 2xl:min-h-88 2xl:flex-1 2xl:grid-cols-3 2xl:items-stretch">
        {/* xl: side by side, both down to the bottom of the screen. 2xl: the row's full height. */}
        <div className={cn("min-w-0 xl:h-[max(26rem,calc(100dvh-23rem))] 2xl:h-auto 2xl:min-h-0", active !== "pg" && "hidden xl:block")}>
          <PgTallyView />
        </div>
        {/* Middle column on 2xl; on xl it moves below the other two, full width. Rows scroll inside from tablet up. */}
        <div
          className={cn(
            "min-w-0 md:h-160 xl:order-last xl:col-span-2 xl:h-144 2xl:order-0 2xl:col-span-1 2xl:h-auto 2xl:min-h-0",
            active !== "bulkpe" && "hidden xl:block",
          )}
        >
          <BulkpeStatementView />
        </div>
        <div
          className={cn(
            "min-w-0 md:h-160 xl:h-[max(26rem,calc(100dvh-23rem))] 2xl:h-auto 2xl:min-h-0",
            active !== "transfer" && "hidden xl:block",
          )}
        >
          <ReportView section="transfer" compact columnLayout="admin-transfer" />
        </div>
      </div>
    </div>
  );
}
