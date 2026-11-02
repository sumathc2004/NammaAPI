import { AdminPanels } from "@/components/dashboard/AdminPanels";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";
import { DaySummaryView } from "@/components/dashboard/DaySummaryView";

/**
 * Everything on the Admin and Accountant pages: the API balance cards (with today's summary as one
 * of them), then the PG Tally, Bulkpe statement and Transfer panels. The wrapper is a container, so
 * `AdminPanels` lays itself out by the width it actually gets (sidebar open or collapsed), not the
 * screen's. The container is exactly the height left in the page (`flex-1 min-h-0`); the inner
 * column is as tall as that from `@5xl` (three columns), so the page doesn't scroll and the three
 * panels share what's left and scroll inside. Below `@5xl` (stacked panels, phones) the inner
 * column keeps its natural height, overflows the container and the page scrolls.
 */
export function AdminOverview() {
  return (
    <div className="@container flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 @5xl:h-full">
        <ApiBalanceView extra={<DaySummaryView inline />} />
        <AdminPanels />
      </div>
    </div>
  );
}
