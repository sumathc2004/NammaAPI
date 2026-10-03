import { buildMetadata } from "@/lib/metadata";
import { SectionPlaceholder } from "@/components/dashboard/SectionPlaceholder";

export const metadata = buildMetadata({
  title: "Transfer",
  description: "Transfer in your NammaAPI dashboard.",
  path: "/dashboard/transfer",
  noIndex: true,
});

export default function TransferPage() {
  return <SectionPlaceholder id="transfer" />;
}
