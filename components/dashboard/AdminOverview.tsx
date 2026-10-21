import { AdminPanels } from "@/components/dashboard/AdminPanels";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";
import { DaySummaryView } from "@/components/dashboard/DaySummaryView";

/**
 * Everything on the Admin and Accountant pages: the API balance cards (with today's summary as one
 * of them), then the PG Tally, Bulkpe statement and Transfer panels. On wide screens (2xl) the page
 * is one screen tall: the balances keep their height and the three panels share what's left and
 * scroll inside. Narrower screens scroll the page.
 */
export function AdminOverview() {
  return (
    <div className="flex flex-col gap-3 2xl:min-h-0 2xl:flex-1">
      <ApiBalanceView extra={<DaySummaryView inline />} />
      <AdminPanels />
    </div>
  );
}
