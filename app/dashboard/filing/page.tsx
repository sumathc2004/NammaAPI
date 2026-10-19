import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { FilingView } from "@/components/dashboard/FilingView";

export const metadata = buildMetadata({
  title: "Filing",
  description: "Monthly invoices for filing in your NammaAPI dashboard.",
  path: "/dashboard/filing",
  noIndex: true,
});

export default function FilingPage() {
  return (
    <AdminOnly role="adminOrAccountant">
      <FilingView />
    </AdminOnly>
  );
}
