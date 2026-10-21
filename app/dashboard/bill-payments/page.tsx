import { buildMetadata } from "@/lib/metadata";
import { ReportView } from "@/components/dashboard/ReportView";

export const metadata = buildMetadata({
  title: "Bill Payments",
  description: "Bill payments in your NammaAPI dashboard.",
  path: "/dashboard/bill-payments",
  noIndex: true,
});

export default function BillPaymentsPage() {
  return <ReportView section="bill-payments" />;
}
