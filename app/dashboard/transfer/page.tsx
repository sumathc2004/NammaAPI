import { buildMetadata } from "@/lib/metadata";
import { ReportView } from "@/components/dashboard/ReportView";

export const metadata = buildMetadata({
  title: "Transfer Reports",
  description: "Transfer reports in your NammaAPI dashboard.",
  path: "/dashboard/transfer",
  noIndex: true,
});

export default function TransferPage() {
  return <ReportView section="transfer" />;
}
