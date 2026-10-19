import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <>
      <PageHeader title="Transactions" description="Payouts, collections and their status." />
      <EmptyState title="No transactions yet">Transactions made through your API keys will show up here.</EmptyState>
    </>
  );
}
