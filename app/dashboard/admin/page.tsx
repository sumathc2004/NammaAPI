import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";
import { PgTallyView } from "@/components/dashboard/PgTallyView";
import { ReportView } from "@/components/dashboard/ReportView";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Admin tools in your NammaAPI dashboard.",
  path: "/dashboard/admin",
  noIndex: true,
});

/** Columns of the Transfer Reports panel here (the full page keeps all of them). */
const TRANSFER_COLUMNS = ["Date & Time", "Beneficiary", "Amount", "UTR", "Status"] as const;

export default function AdminPage() {
  return (
    <AdminOnly>
      <div className="space-y-6">
        <ApiBalanceView />
        {/* PG Tally and Transfer Reports side by side on wide screens, stacked below that. */}
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <PgTallyView />
          <div className="h-[44rem]">
            <ReportView section="transfer" compact columnLabels={TRANSFER_COLUMNS} />
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}
