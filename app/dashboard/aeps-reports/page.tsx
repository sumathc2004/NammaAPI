import { buildMetadata } from "@/lib/metadata";
import { SectionPlaceholder } from "@/components/dashboard/SectionPlaceholder";

export const metadata = buildMetadata({
  title: "AEPS Reports",
  description: "AEPS Reports in your NammaAPI dashboard.",
  path: "/dashboard/aeps-reports",
  noIndex: true,
});

export default function AepsReportsPage() {
  return <SectionPlaceholder id="aeps-reports" />;
}
