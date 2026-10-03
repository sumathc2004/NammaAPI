import Link from "next/link";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { DEFAULT_DASHBOARD_PATH, getDashboardSection, type DashboardSectionId } from "@/lib/data/dashboardNav";

/** Page header + empty state for a dashboard section whose content hasn't been built yet. */
export function SectionPlaceholder({ id }: { id: DashboardSectionId }) {
  const section = getDashboardSection(id);

  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="text-xs font-medium text-text-secondary">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href={DEFAULT_DASHBOARD_PATH} className="hover:text-brand-primary">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-text-primary">
            {section.label}
          </li>
        </ol>
      </nav>

      <div className="mt-3 flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-brand-primary/25">
          <SectionIcon id={id} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{section.label}</h1>
          <p className="mt-1 text-sm text-text-secondary">{section.description}</p>
        </div>
      </div>

      <div className="relative mt-8 overflow-hidden rounded-3xl border border-brand-border bg-white">
        <div className="relative flex flex-col items-center px-6 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light text-brand-primary ring-8 ring-brand-light/50">
            <SectionIcon id={id} className="h-8 w-8" />
          </span>
          <h2 className="mt-6 text-lg font-semibold text-text-primary">{section.label} is ready for data</h2>
          <p className="mt-2 max-w-md text-sm text-text-secondary">
            This section will show your {section.label.toLowerCase()} once it&apos;s connected to the payments API.
          </p>
        </div>
      </div>
    </div>
  );
}
