import { buildMetadata } from "@/lib/metadata";
import { SectionPlaceholder } from "@/components/dashboard/SectionPlaceholder";

export const metadata = buildMetadata({
  title: "PG Reports",
  description: "PG Reports in your NammaAPI dashboard.",
  path: "/dashboard/pg-reports",
  noIndex: true,
});

export default function PgReportsPage() {
  return <SectionPlaceholder id="pg-reports" />;
}
