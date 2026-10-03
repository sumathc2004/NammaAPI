import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { ApiBalanceView } from "@/components/dashboard/ApiBalanceView";
import { SectionIcon } from "@/components/dashboard/SectionIcon";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Admin tools in your NammaAPI dashboard.",
  path: "/dashboard/admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <AdminOnly>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-brand-primary/25">
            <SectionIcon id="admin" className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">Admin</h1>
        </div>
        <ApiBalanceView />
      </div>
    </AdminOnly>
  );
}
