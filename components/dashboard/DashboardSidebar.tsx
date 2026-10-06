"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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

/** Shared look for every sidebar row: navigation links and the footer actions. */
function rowClasses(collapsed: boolean, active = false) {
  return cn(
    "group relative flex h-10 w-full items-center rounded-lg text-[13px] font-medium transition-colors duration-150",
    collapsed ? "justify-center" : "gap-3 px-3",
    active ? "bg-white/8 text-white ring-1 ring-white/6" : "text-white/60 hover:bg-white/4 hover:text-white",
  );
}

function rowIconClasses(active = false) {
  return cn("h-4.5 w-4.5 shrink-0 transition-colors", active ? "text-brand-accent" : "text-white/45 group-hover:text-white/80");
}

function GroupLabel({ children, collapsed }: { children: ReactNode; collapsed: boolean }) {
  return collapsed ? (
    <span className="sr-only">{children}</span>
  ) : (
    <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{children}</p>
  );
}

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
      <GroupLabel collapsed={collapsed}>{title}</GroupLabel>
      <ul className="space-y-0.5">
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
                className={rowClasses(collapsed, isActive)}
              >
                {isActive && (
                  <span className="absolute inset-y-2 left-0 w-0.75 rounded-r-full bg-brand-accent" aria-hidden="true" />
                )}
                <SectionIcon id={section.id} className={rowIconClasses(isActive)} />
                <span className={cn("truncate", collapsed && "sr-only")}>{section.label}</span>
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
    <div className="flex h-full flex-col border-r border-white/5 bg-linear-to-b from-brand-navy to-brand-ink">
      <nav aria-label="Dashboard" className="scrollbar-dark flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
        <SidebarGroup title="Menu" sections={menuSections} {...groupProps} />
        {isAdmin && adminSections.length > 0 && (
          <div className="mt-6">
            {collapsed && <div className="mx-3 mb-3 border-t border-white/8" aria-hidden="true" />}
            <SidebarGroup title="Admin" sections={adminSections} {...groupProps} />
          </div>
        )}
      </nav>

      <div className="space-y-0.5 border-t border-white/6 px-3 py-3">
        <Link
          href="/contact"
          onClick={onNavigate}
          title={collapsed ? "Help & support" : undefined}
          className={rowClasses(collapsed)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={rowIconClasses()}>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01" />
          </svg>
          <span className={cn("truncate", collapsed && "sr-only")}>Help & support</span>
        </Link>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : undefined}
            className={rowClasses(collapsed)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={rowIconClasses()}>
              <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
              <path d="M9.5 4.5v15" />
              <path d={collapsed ? "M13.5 10l2 2-2 2" : "M16 10l-2 2 2 2"} />
            </svg>
            <span className={cn("truncate", collapsed && "sr-only")}>{collapsed ? "Expand sidebar" : "Collapse"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
