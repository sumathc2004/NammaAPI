import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Admin tools in your NammaAPI dashboard.",
  path: "/dashboard/admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <AdminOnly>
      <ApiBalanceView />
    </AdminOnly>
  );
}
