import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { DifferenceHistoryView } from "@/components/dashboard/DifferenceHistoryView";

export const metadata = buildMetadata({
  title: "View History",
  description: "Saved snapshots of the platform balances in your NammaAPI dashboard.",
  path: "/dashboard/view-history",
  noIndex: true,
});

export default function ViewHistoryPage() {
  return (
    <AdminOnly role="adminOrAccountant">
      <DifferenceHistoryView />
    </AdminOnly>
  );
}
