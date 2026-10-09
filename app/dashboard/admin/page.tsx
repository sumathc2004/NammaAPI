import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";
import { DaySummaryView } from "@/components/dashboard/DaySummaryView";
import { PgTallyView } from "@/components/dashboard/PgTallyView";
import { ReportView } from "@/components/dashboard/ReportView";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Admin tools in your NammaAPI dashboard.",
  path: "/dashboard/admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <AdminOnly>
      <div className="space-y-6">
        <ApiBalanceView />
        <DaySummaryView />
        {/* PG Tally and Transfer Reports side by side on wide screens, stacked below that. */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <PgTallyView />
          {/* Fixed height (rows scroll inside) from tablet up; phones let the panel size itself. */}
          <div className="min-w-0 md:h-[40rem] xl:h-[44rem]">
            <ReportView section="transfer" compact columnLayout="admin-transfer" />
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}
