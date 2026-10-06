import { buildMetadata } from "@/lib/metadata";
import { ReportView } from "@/components/dashboard/ReportView";

export const metadata = buildMetadata({
  title: "AEPS Reports",
  description: "AEPS Reports in your NammaAPI dashboard.",
  path: "/dashboard/aeps-reports",
  noIndex: true,
});

export default function AepsReportsPage() {
  return <ReportView section="aeps-reports" />;
}
