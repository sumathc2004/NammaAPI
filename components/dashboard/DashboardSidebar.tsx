"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { dashboardPath, dashboardSections, isAdminOnly, type DashboardSection } from "@/lib/data/dashboardNav";
import { cn } from "@/lib/cn";

type DashboardSidebarProps = {
  /** Icons only. Labels stay available to screen readers and as hover tooltips. */
  collapsed?: boolean;
  /** Shows the admin-only sections. UI only: admin features must re-check on the server. */
  isAdmin?: boolean;
  /** Shows the collapse/expand button (desktop only). */
  onToggleCollapse?: () => void;
  /** Called after a link is followed (closes the mobile drawer). */
  onNavigate?: () => void;
};

const menuSections = dashboardSections.filter((s) => !isAdminOnly(s));
const adminSections = dashboardSections.filter(isAdminOnly);

type SidebarGroupProps = {
  title: string;
  sections: DashboardSection[];
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
};

function SidebarGroup({ title, sections, collapsed, pathname, onNavigate }: SidebarGroupProps) {
  return (
    <div role="group" aria-label={title}>
      <p
        className={cn(
          "px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 transition-opacity",
          collapsed && "sr-only",
        )}
      >
        {title}
      </p>
      <ul className={cn("space-y-1", !collapsed && "mt-3")}>
        {sections.map((section) => {
          const href = dashboardPath(section.id);
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={section.id}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? section.label : undefined}
                className={cn(
                  "group relative flex items-center rounded-xl py-2 text-sm font-medium transition-colors duration-200",
                  collapsed ? "justify-center px-0" : "gap-3 px-2.5",
                  isActive ? "bg-white/10 text-white ring-1 ring-white/10" : "text-white/65 hover:bg-white/5 hover:text-white",
                )}
              >
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-accent" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                    isActive
                      ? "bg-brand-gradient text-white shadow-md shadow-black/20"
                      : "bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white",
                  )}
                >
                  <SectionIcon id={section.id} className="h-4.5 w-4.5" />
                </span>
                <span className={cn("flex-1 truncate", collapsed && "sr-only")}>{section.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Sidebar contents, shared by the desktop sidebar and the mobile drawer. */
export function DashboardSidebar({ collapsed = false, isAdmin = false, onToggleCollapse, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const groupProps = { collapsed, pathname, onNavigate };

  return (
    <div className="flex h-full flex-col bg-linear-to-b from-brand-navy to-brand-dark">
      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
        <SidebarGroup title="Menu" sections={menuSections} {...groupProps} />
        {isAdmin && adminSections.length > 0 && (
          <div className="mt-5">
            {collapsed && <div className="mx-2 mb-3 border-t border-white/10" aria-hidden="true" />}
            <SidebarGroup title="Admin" sections={adminSections} {...groupProps} />
          </div>
        )}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        {collapsed ? (
          <Link
            href="/contact"
            onClick={onNavigate}
            title="Contact support"
            aria-label="Contact support"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-white/65 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01" />
            </svg>
          </Link>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/4 p-3.5">
            <p className="text-sm font-semibold text-white">Need help?</p>
            <p className="mt-0.5 text-xs text-white/55">Our payments team can help with setup.</p>
            <Link
              href="/contact"
              onClick={onNavigate}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:text-white"
            >
              Contact support
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : undefined}
            className={cn(
              "flex w-full items-center rounded-xl py-2 text-xs font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white",
              collapsed ? "justify-center" : "gap-2.5 px-3",
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={cn("transition-transform duration-300", collapsed && "rotate-180")}
            >
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
            </svg>
            {!collapsed && "Collapse"}
          </button>
        )}
      </div>
    </div>
  );
}
