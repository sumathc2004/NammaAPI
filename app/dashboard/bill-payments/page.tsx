import { buildMetadata } from "@/lib/metadata";
import { SectionPlaceholder } from "@/components/dashboard/SectionPlaceholder";

export const metadata = buildMetadata({
  title: "Bill Payments",
  description: "Bill Payments in your NammaAPI dashboard.",
  path: "/dashboard/bill-payments",
  noIndex: true,
});

export default function BillPaymentsPage() {
  return <SectionPlaceholder id="bill-payments" />;
}
