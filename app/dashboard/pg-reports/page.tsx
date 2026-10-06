import { buildMetadata } from "@/lib/metadata";
import { ReportView } from "@/components/dashboard/ReportView";

export const metadata = buildMetadata({
  title: "PG Reports",
  description: "Payment gateway reports in your NammaAPI dashboard.",
  path: "/dashboard/pg-reports",
  noIndex: true,
});

export default function PgReportsPage() {
  return <ReportView section="pg-reports" />;
}
