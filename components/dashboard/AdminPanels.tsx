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
 * Admin page panels, laid out by the width of the content area (`AdminOverview` is the
 * `@container`), so a collapsed sidebar gives the same result as a wider screen:
 * - ≥ @5xl (64rem of content, e.g. a 1366px laptop with the sidebar open, or 1280px with it
 *   collapsed): three columns — PG Tally | Bulkpe Statement | Transfer Reports — filling the rest
 *   of the screen (each panel scrolls inside), never shorter than 22rem.
 * - ≥ @3xl (48rem): PG Tally and Transfer Reports side by side, the Bulkpe statement full width
 *   below; fixed heights, the page scrolls.
 * - Below that: a switch shows one at a time, so phones get one list that scrolls with the page
 *   instead of stacked panels with their own scroll boxes.
 * All stay mounted, so switching keeps their state.
 */
export function AdminPanels() {
  const [active, setActive] = useState<PanelId>("pg");

  return (
    <div className="flex flex-1 flex-col gap-3 @5xl:min-h-0">
      <div
        role="tablist"
        aria-label="Admin reports"
        className="flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-brand-border bg-white p-0.5 @3xl:hidden"
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

      <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-2 @5xl:min-h-88 @5xl:flex-1 @5xl:grid-cols-3 @5xl:items-stretch">
        {/* Two columns: both down to the bottom of the screen. Three: the row's full height. */}
        <div
          className={cn(
            "min-w-0 @3xl:h-[max(26rem,calc(100dvh-23rem))] @5xl:h-auto @5xl:min-h-0",
            active !== "pg" && "hidden @3xl:block",
          )}
        >
          <PgTallyView />
        </div>
        {/* Middle column with three; with two it moves below the other two, full width. Rows scroll inside from tablet up. */}
        <div
          className={cn(
            "min-w-0 md:h-160 @3xl:order-last @3xl:col-span-2 @3xl:h-144 @5xl:order-0 @5xl:col-span-1 @5xl:h-auto @5xl:min-h-0",
            active !== "bulkpe" && "hidden @3xl:block",
          )}
        >
          <BulkpeStatementView />
        </div>
        <div
          className={cn(
            "min-w-0 md:h-160 @3xl:h-[max(26rem,calc(100dvh-23rem))] @5xl:h-auto @5xl:min-h-0",
            active !== "transfer" && "hidden @3xl:block",
          )}
        >
          <ReportView section="transfer" compact columnLayout="admin-transfer" />
        </div>
      </div>
    </div>
  );
}
