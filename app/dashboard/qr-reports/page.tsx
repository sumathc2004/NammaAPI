import { buildMetadata } from "@/lib/metadata";
import { SectionPlaceholder } from "@/components/dashboard/SectionPlaceholder";

export const metadata = buildMetadata({
  title: "QR Reports",
  description: "QR Reports in your NammaAPI dashboard.",
  path: "/dashboard/qr-reports",
  noIndex: true,
});

export default function QrReportsPage() {
  return <SectionPlaceholder id="qr-reports" />;
}
