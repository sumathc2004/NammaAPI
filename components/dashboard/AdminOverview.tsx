import { AdminPanels } from "@/components/dashboard/AdminPanels";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";
import { DaySummaryView } from "@/components/dashboard/DaySummaryView";

/**
 * Everything on the Admin and Accountant pages: the API balance cards (with today's summary as one
 * of them), then the PG Tally, Bulkpe statement and Transfer panels. The wrapper is a container, so
 * `AdminPanels` lays itself out by the width it actually gets (sidebar open or collapsed), not the
 * screen's. It is `flex-1` without `min-h-0`: when the panels fit, it fills the screen and the
 * three panels share what's left; when they don't (short window, stacked panels), it grows and
 * the page scrolls.
 */
export function AdminOverview() {
  return (
    <div className="@container flex flex-1 flex-col gap-3">
      <ApiBalanceView extra={<DaySummaryView inline />} />
      <AdminPanels />
    </div>
  );
}
