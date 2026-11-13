import { buildMetadata } from "@/lib/metadata";
import { BillPaymentsView } from "@/components/dashboard/BillPaymentsView";

export const metadata = buildMetadata({
  title: "Bill Payments",
  description: "Bill payments in your NammaAPI dashboard.",
  path: "/dashboard/bill-payments",
  noIndex: true,
});

export default function BillPaymentsPage() {
  return <BillPaymentsView />;
}
