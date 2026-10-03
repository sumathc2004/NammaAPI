import { buildMetadata } from "@/lib/metadata";
import { ReportView } from "@/components/dashboard/ReportView";

export const metadata = buildMetadata({
  title: "Credit Ledger",
  description: "Credit Ledger in your NammaAPI dashboard.",
  path: "/dashboard/credit-ledger",
  noIndex: true,
});

export default function CreditLedgerPage() {
  return <ReportView section="credit-ledger" />;
}
