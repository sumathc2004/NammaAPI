import { AdminPanels } from "@/components/dashboard/AdminPanels";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";
import { DaySummaryView } from "@/components/dashboard/DaySummaryView";

/**
 * Everything on the Admin and Accountant pages: the API balance cards (with today's summary as one
 * of them), then the PG Tally, Bulkpe statement and Transfer panels. The wrapper is a container, so
 * `AdminPanels` lays itself out by the width it actually gets (sidebar open or collapsed), not the
 * screen's. The page scrolls (one scrollbar, the page's); from `@5xl` each of the three panels is as
 * tall as the screen, so once the balance cards are scrolled past, the panels fill the window and
 * show as many rows as possible, each scrolling inside with its own slim scrollbar.
 */
export function AdminOverview() {
  return (
    <div className="@container flex flex-1 flex-col gap-3">
      <ApiBalanceView extra={<DaySummaryView inline />} />
      <AdminPanels />
    </div>
  );
}
