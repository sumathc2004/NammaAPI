import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { AdminPanels } from "@/components/dashboard/AdminPanels";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";
import { DaySummaryView } from "@/components/dashboard/DaySummaryView";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Admin tools in your NammaAPI dashboard.",
  path: "/dashboard/admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <AdminOnly>
      <div className="space-y-4">
        <ApiBalanceView />
        <DaySummaryView />
        <AdminPanels />
      </div>
    </AdminOnly>
  );
}
