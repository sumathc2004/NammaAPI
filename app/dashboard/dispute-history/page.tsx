import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { DisputeHistoryView } from "@/components/dashboard/DisputeHistoryView";

export const metadata = buildMetadata({
  title: "Dispute History",
  description: "Bill payments marked failed and the disputes raised on them, in your NammaAPI dashboard.",
  path: "/dashboard/dispute-history",
  noIndex: true,
});

export default function DisputeHistoryPage() {
  return (
    <AdminOnly role="adminOrAccountant">
      <DisputeHistoryView />
    </AdminOnly>
  );
}
