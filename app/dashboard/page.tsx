import { buildMetadata } from "@/lib/metadata";
import { DashboardView } from "@/app/dashboard/DashboardView";

export const metadata = buildMetadata({
  title: "Dashboard",
  description: "Your NammaAPI business dashboard.",
  path: "/dashboard",
  noIndex: true,
});

export default function DashboardPage() {
  return (
    <section className="min-h-[calc(100vh-64px)] bg-brand-light py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <DashboardView />
      </div>
    </section>
  );
}
