import { buildMetadata } from "@/lib/metadata";
import { ReportView } from "@/components/dashboard/ReportView";

export const metadata = buildMetadata({
  title: "Wallet Ledger",
  description: "Wallet Ledger in your NammaAPI dashboard.",
  path: "/dashboard/wallet-ledger",
  noIndex: true,
});

export default function WalletLedgerPage() {
  return <ReportView section="wallet-ledger" />;
}
